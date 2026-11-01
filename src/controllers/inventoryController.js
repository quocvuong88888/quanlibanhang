const { all, get, run } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

// 1. Lập phiếu nhập kho (BM02 & QD03, QD05)
const createReceipt = async (req, res) => {
  try {
    const { MaNCC, items, GhiChu } = req.body; // items: array of { MaSanPham, SoLuongNhap, GiaNhap }
    if (!MaNCC || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn nhà cung cấp và ít nhất 01 sản phẩm nhập.' });
    }

    let tongTienNhap = 0;
    for (const item of items) {
      const sl = Number(item.SoLuongNhap);
      const gia = Number(item.GiaNhap);
      if (sl <= 0 || gia < 0) {
        return res.status(400).json({ success: false, message: 'Số lượng và giá nhập phải hợp lệ.' });
      }
      tongTienNhap += sl * gia;
    }

    // Kiểm tra quy định QD05: Hạn mức duyệt phiếu nhập của Giám đốc (mặc định 20.000.000 VNĐ)
    const paramHanMuc = await get("SELECT GiaTri FROM THAM_SO WHERE MaThamSo = 'HAN_MUC_DUYET_NHAP'");
    const hanMuc = paramHanMuc ? parseFloat(paramHanMuc.GiaTri) : 20000000;

    const vuotHanMuc = tongTienNhap > hanMuc;
    const trangThai = vuotHanMuc ? 'Chờ Giám đốc duyệt' : 'Đã duyệt';

    // Tạo phiếu nhập kho
    const insertReceipt = await run(
      `INSERT INTO NHAP_KHO (NgayNhap, MaNCC, MaNhanVien, TongTienNhap, TrangThaiDuyet, GhiChu)
       VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?)`,
      [MaNCC, req.user.MaNhanVien, tongTienNhap, trangThai, GhiChu || null]
    );
    const maPhieuNhap = insertReceipt.lastID;

    // Lưu chi tiết phiếu nhập
    for (const item of items) {
      await run(
        `INSERT INTO CHI_TIET_NHAP_KHO (MaPhieuNhap, MaSanPham, SoLuongNhap, GiaNhap)
         VALUES (?, ?, ?, ?)`,
        [maPhieuNhap, item.MaSanPham, item.SoLuongNhap, item.GiaNhap]
      );

      // Nếu không vượt hạn mức (được tự động duyệt), cập nhật kho và giá vốn ngay lập tức
      if (!vuotHanMuc) {
        await run(
          `UPDATE SAN_PHAM 
           SET SoLuongTon = SoLuongTon + ?, GiaNhap = ?
           WHERE MaSanPham = ?`,
          [item.SoLuongNhap, item.GiaNhap, item.MaSanPham]
        );
      }
    }

    // Ghi Audit Log
    const msgAudit = vuotHanMuc
      ? `Lập phiếu nhập #PN${maPhieuNhap} (${tongTienNhap.toLocaleString('vi-VN')} VNĐ) vượt hạn mức ${hanMuc.toLocaleString('vi-VN')} VNĐ -> Chờ Giám đốc duyệt theo QD05`
      : `Lập phiếu nhập #PN${maPhieuNhap} (${tongTienNhap.toLocaleString('vi-VN')} VNĐ) -> Đã duyệt và cộng tồn kho`;

    await logAudit(req.user.MaNhanVien, 'LẬP PHIẾU NHẬP KHO', msgAudit);

    res.status(201).json({
      success: true,
      message: vuotHanMuc 
        ? 'Phiếu nhập vượt hạn mức 20.000.000 VNĐ và đã được gửi sang hàng đợi chờ Giám đốc duyệt (QD05).'
        : 'Lập phiếu nhập kho thành công và đã cập nhật tồn kho!',
      receiptId: maPhieuNhap,
      trangThaiDuyet: trangThai,
      tongTienNhap
    });
  } catch (err) {
    console.error('Lỗi khi lập phiếu nhập kho:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lập phiếu nhập kho.' });
  }
};

// 2. Giám đốc phê duyệt phiếu nhập kho (QD05)
const approveReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' hoặc 'reject'

    // Kiểm tra quyền: Chỉ Giám đốc (Role 1) mới có quyền duyệt phiếu nhập theo QD05
    if (req.user.MaVaiTro !== 1) {
      return res.status(403).json({ success: false, message: 'Chỉ Giám đốc mới có quyền phê duyệt phiếu nhập vượt hạn mức (QD05)!' });
    }

    const receipt = await get('SELECT * FROM NHAP_KHO WHERE MaPhieuNhap = ?', [id]);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập.' });
    }

    if (receipt.TrangThaiDuyet !== 'Chờ Giám đốc duyệt') {
      return res.status(400).json({ success: false, message: `Phiếu nhập này đang ở trạng thái "${receipt.TrangThaiDuyet}", không thể duyệt lại.` });
    }

    if (action === 'reject') {
      await run("UPDATE NHAP_KHO SET TrangThaiDuyet = 'Bị từ chối' WHERE MaPhieuNhap = ?", [id]);
      await logAudit(req.user.MaNhanVien, 'TỪ CHỐI PHIẾU NHẬP', `Giám đốc từ chối phê duyệt phiếu nhập #PN${id}`);
      return res.json({ success: true, message: 'Đã từ chối phiếu nhập kho thành công.' });
    }

    // Phê duyệt và cộng tồn kho
    const details = await all('SELECT * FROM CHI_TIET_NHAP_KHO WHERE MaPhieuNhap = ?', [id]);
    for (const item of details) {
      await run(
        `UPDATE SAN_PHAM 
         SET SoLuongTon = SoLuongTon + ?, GiaNhap = ?
         WHERE MaSanPham = ?`,
        [item.SoLuongNhap, item.GiaNhap, item.MaSanPham]
      );
    }

    await run("UPDATE NHAP_KHO SET TrangThaiDuyet = 'Đã duyệt' WHERE MaPhieuNhap = ?", [id]);
    await logAudit(req.user.MaNhanVien, 'PHÊ DUYỆT PHIẾU NHẬP', `Giám đốc đã phê duyệt phiếu nhập #PN${id} - Tồn kho và giá vốn đã được cập nhật.`);

    res.json({ success: true, message: 'Phê duyệt phiếu nhập kho thành công! Đã tăng số lượng tồn kho theo quy định.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi phê duyệt phiếu nhập kho.' });
  }
};

const getReceipts = async (req, res) => {
  try {
    const receipts = await all(
      `SELECT nk.*, ncc.TenNCC, nv.HoTen as TenNhanVien
       FROM NHAP_KHO nk
       JOIN NHA_CUNG_CAP ncc ON nk.MaNCC = ncc.MaNCC
       JOIN NHAN_VIEN nv ON nk.MaNhanVien = nv.MaNhanVien
       ORDER BY nk.MaPhieuNhap DESC`
    );
    res.json({ success: true, data: receipts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách phiếu nhập kho.' });
  }
};

const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await get(
      `SELECT nk.*, ncc.TenNCC, ncc.SoDienThoai as SdtNCC, ncc.DiaChi as DiaChiNCC, nv.HoTen as TenNhanVien
       FROM NHAP_KHO nk
       JOIN NHA_CUNG_CAP ncc ON nk.MaNCC = ncc.MaNCC
       JOIN NHAN_VIEN nv ON nk.MaNhanVien = nv.MaNhanVien
       WHERE nk.MaPhieuNhap = ?`,
      [id]
    );

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập.' });
    }

    const items = await all(
      `SELECT ctnk.*, sp.TenSanPham, sp.DonViTinh
       FROM CHI_TIET_NHAP_KHO ctnk
       JOIN SAN_PHAM sp ON ctnk.MaSanPham = sp.MaSanPham
       WHERE ctnk.MaPhieuNhap = ?`,
      [id]
    );

    res.json({ success: true, data: { ...receipt, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết phiếu nhập kho.' });
  }
};

// 3. Kiểm kê kho (QD03)
const processStockCheck = async (req, res) => {
  try {
    const { items, GhiChu } = req.body; // items: array of { MaSanPham, SoLuongThucTe }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp danh sách sản phẩm kiểm kê.' });
    }

    let tongChenhLech = 0;
    let tongHeThong = 0;
    const validatedChecks = [];

    for (const item of items) {
      const sp = await get('SELECT * FROM SAN_PHAM WHERE MaSanPham = ?', [item.MaSanPham]);
      if (!sp) continue;

      const slThucTe = Number(item.SoLuongThucTe);
      const slHeThong = sp.SoLuongTon;
      const chenhLech = slThucTe - slHeThong;

      tongChenhLech += Math.abs(chenhLech);
      tongHeThong += slHeThong;

      validatedChecks.push({
        MaSanPham: sp.MaSanPham,
        TenSanPham: sp.TenSanPham,
        SoLuongHeThong: slHeThong,
        SoLuongThucTe: slThucTe,
        ChenhLech: chenhLech
      });
    }

    // Kiểm tra QD03: Nếu độ lệch vượt 2%, cần Giám đốc phê duyệt
    const paramLech = await get("SELECT GiaTri FROM THAM_SO WHERE MaThamSo = 'TI_LE_LECH_KHO_DUYET'");
    const maxRatio = paramLech ? parseFloat(paramLech.GiaTri) : 0.02;

    const tyLeLech = tongHeThong > 0 ? (tongChenhLech / tongHeThong) : 0;
    const vuotTiLe = tyLeLech > maxRatio;
    const trangThai = vuotTiLe ? 'Chờ Giám đốc duyệt lệch > 2%' : 'Hoàn tất';

    const insertCheck = await run(
      `INSERT INTO KIEM_KE (NgayKiemKe, MaNhanVien, TongChenhLechSL, GhiChu, TrangThai)
       VALUES (datetime('now', 'localtime'), ?, ?, ?, ?)`,
      [req.user.MaNhanVien, tongChenhLech, GhiChu || null, trangThai]
    );
    const maKiemKe = insertCheck.lastID;

    for (const chk of validatedChecks) {
      await run(
        `INSERT INTO CHI_TIET_KIEM_KE (MaKiemKe, MaSanPham, SoLuongHeThong, SoLuongThucTe, ChenhLech)
         VALUES (?, ?, ?, ?, ?)`,
        [maKiemKe, chk.MaSanPham, chk.SoLuongHeThong, chk.SoLuongThucTe, chk.ChenhLech]
      );

      // Nếu không lệch quá 2%, tự động điều chỉnh tồn kho theo số lượng thực tế
      if (!vuotTiLe) {
        await run('UPDATE SAN_PHAM SET SoLuongTon = ? WHERE MaSanPham = ?', [chk.SoLuongThucTe, chk.MaSanPham]);
      }
    }

    await logAudit(
      req.user.MaNhanVien,
      'KIỂM KÊ KHO',
      `Phiếu kiểm kê #KK${maKiemKe} - Tổng lệch: ${tongChenhLech} (${(tyLeLech * 100).toFixed(1)}%) - Trạng thái: ${trangThai}`
    );

    res.status(201).json({
      success: true,
      message: vuotTiLe 
        ? `Lệch kho ${(tyLeLech * 100).toFixed(1)}% vượt mức 2% quy định (QD03) -> Đã chuyển phiếu sang Chờ Giám đốc phê duyệt.`
        : 'Kiểm kê kho hoàn tất và đã cập nhật số lượng thực tế vào hệ thống!',
      checkId: maKiemKe,
      trangThai,
      tongChenhLech,
      tyLeLech: (tyLeLech * 100).toFixed(2)
    });
  } catch (err) {
    console.error('Lỗi kiểm kê kho:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý kiểm kê.' });
  }
};

const getStockChecks = async (req, res) => {
  try {
    const checks = await all(
      `SELECT kk.*, nv.HoTen as TenNhanVien
       FROM KIEM_KE kk
       JOIN NHAN_VIEN nv ON kk.MaNhanVien = nv.MaNhanVien
       ORDER BY kk.MaKiemKe DESC`
    );
    res.json({ success: true, data: checks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử kiểm kê.' });
  }
};

// 4. Nhà cung cấp
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await all('SELECT * FROM NHA_CUNG_CAP ORDER BY MaNCC ASC');
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách nhà cung cấp.' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { TenNCC, SoDienThoai, Email, DiaChi } = req.body;
    if (!TenNCC) return res.status(400).json({ success: false, message: 'Tên NCC không được trống.' });
    const result = await run(
      'INSERT INTO NHA_CUNG_CAP (TenNCC, SoDienThoai, Email, DiaChi) VALUES (?, ?, ?, ?)',
      [TenNCC, SoDienThoai, Email, DiaChi]
    );
    res.status(201).json({ success: true, message: 'Thêm nhà cung cấp thành công!', supplierId: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi thêm nhà cung cấp.' });
  }
};

module.exports = {
  createReceipt,
  approveReceipt,
  getReceipts,
  getReceiptById,
  processStockCheck,
  getStockChecks,
  getSuppliers,
  createSupplier
};

