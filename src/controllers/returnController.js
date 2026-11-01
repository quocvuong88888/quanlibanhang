const { all, get, run } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

const processReturn = async (req, res) => {
  try {
    const { MaHoaDon, items, LyDo } = req.body; // items: array of { MaSanPham, SoLuongDoiTra }
    if (!MaHoaDon || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hóa đơn và các sản phẩm cần đổi trả.' });
    }

    // 1. Kiểm tra hóa đơn
    const invoice = await get('SELECT * FROM HOA_DON WHERE MaHoaDon = ?', [MaHoaDon]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn.' });
    }

    // 2. Kiểm tra quy định QD02: Đổi trả trong vòng 7 ngày
    const paramHan = await get("SELECT GiaTri FROM THAM_SO WHERE MaThamSo = 'HAN_DOI_TRA_NGAY'");
    const maxDays = paramHan ? parseInt(paramHan.GiaTri) : 7;

    const invoiceDate = new Date(invoice.NgayLap);
    const currentDate = new Date();
    const diffDays = Math.ceil((currentDate - invoiceDate) / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      return res.status(400).json({
        success: false,
        message: `Hóa đơn đã quá hạn đổi trả (${diffDays} ngày vượt quá quy định ${maxDays} ngày theo QD02).`
      });
    }

    // 3. Kiểm tra sản phẩm và số lượng mua trong hóa đơn
    const invoiceDetails = await all('SELECT * FROM CHI_TIET_HOA_DON WHERE MaHoaDon = ?', [MaHoaDon]);
    let tongTienHoan = 0;
    const validatedReturns = [];

    for (const item of items) {
      const match = invoiceDetails.find(d => d.MaSanPham === Number(item.MaSanPham));
      if (!match) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm mã ${item.MaSanPham} không có trong hóa đơn #${MaHoaDon}.`
        });
      }

      const slTra = Number(item.SoLuongDoiTra);
      if (slTra <= 0 || slTra > match.SoLuong) {
        return res.status(400).json({
          success: false,
          message: `Số lượng đổi trả (${slTra}) không hợp lệ (Số lượng đã mua: ${match.SoLuong}).`
        });
      }

      const tienHoanSp = slTra * match.DonGia;
      tongTienHoan += tienHoanSp;

      validatedReturns.push({
        MaSanPham: match.MaSanPham,
        SoLuongDoiTra: slTra,
        DonGiaHoan: match.DonGia
      });
    }

    // 4. Tính điểm tích lũy cần trừ lại (QD02: Trừ tương ứng 1%)
    const paramTichDiem = await get("SELECT GiaTri FROM THAM_SO WHERE MaThamSo = 'TI_LE_TICH_DIEM'");
    const tiLe = paramTichDiem ? parseFloat(paramTichDiem.GiaTri) : 0.01;
    const diemTru = Math.floor((tongTienHoan * tiLe) / 1000);

    // 5. Lưu bảng DOI_TRA
    const insertReturn = await run(
      `INSERT INTO DOI_TRA (MaHoaDon, MaNhanVien, LyDo, TongTienHoan, DiemTru)
       VALUES (?, ?, ?, ?, ?)`,
      [MaHoaDon, req.user.MaNhanVien, LyDo || 'Khách đổi trả hàng', tongTienHoan, diemTru]
    );
    const maDoiTra = insertReturn.lastID;

    // 6. Lưu CHI_TIET_DOI_TRA và Cộng lại tồn kho SAN_PHAM
    for (const ret of validatedReturns) {
      await run(
        `INSERT INTO CHI_TIET_DOI_TRA (MaDoiTra, MaSanPham, SoLuongDoiTra, DonGiaHoan)
         VALUES (?, ?, ?, ?)`,
        [maDoiTra, ret.MaSanPham, ret.SoLuongDoiTra, ret.DonGiaHoan]
      );

      // Tự động cộng lại kho hàng
      await run(
        `UPDATE SAN_PHAM SET SoLuongTon = SoLuongTon + ? WHERE MaSanPham = ?`,
        [ret.SoLuongDoiTra, ret.MaSanPham]
      );
    }

    // 7. Trừ điểm tích lũy của khách hàng (nếu có khách hàng) - Tính toán an toàn trong JS
    if (invoice.MaKhachHang && diemTru > 0) {
      const cust = await get('SELECT DiemTichLuy FROM KHACH_HANG WHERE MaKhachHang = ?', [invoice.MaKhachHang]);
      const currentPts = cust ? (cust.DiemTichLuy || 0) : 0;
      const newPts = Math.max(0, currentPts - diemTru);
      await run(
        'UPDATE KHACH_HANG SET DiemTichLuy = ? WHERE MaKhachHang = ?',
        [newPts, invoice.MaKhachHang]
      );
    }

    // 8. Ghi Audit Log
    await logAudit(
      req.user.MaNhanVien,
      'ĐỔI TRẢ HÀNG',
      `Xử lý đổi trả #DT${maDoiTra} cho hóa đơn #HD${MaHoaDon} - Hoàn tiền: ${tongTienHoan.toLocaleString('vi-VN')} VNĐ - Trừ ${diemTru} điểm.`
    );

    res.status(201).json({
      success: true,
      message: 'Xử lý đổi trả hàng và hoàn kho thành công theo QD02!',
      data: {
        MaDoiTra: maDoiTra,
        TongTienHoan: tongTienHoan,
        DiemTru: diemTru
      }
    });
  } catch (err) {
    console.error('Lỗi khi đổi trả hàng:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý đổi trả.' });
  }
};

const getReturnHistory = async (req, res) => {
  try {
    const history = await all(
      `SELECT dt.*, nv.HoTen as TenNhanVien, hd.NgayLap as NgayLapHoaDon, kh.HoTen as TenKhachHang
       FROM DOI_TRA dt
       JOIN NHAN_VIEN nv ON dt.MaNhanVien = nv.MaNhanVien
       JOIN HOA_DON hd ON dt.MaHoaDon = hd.MaHoaDon
       LEFT JOIN KHACH_HANG kh ON hd.MaKhachHang = kh.MaKhachHang
       ORDER BY dt.MaDoiTra DESC`
    );
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử đổi trả.' });
  }
};

module.exports = {
  processReturn,
  getReturnHistory
};
