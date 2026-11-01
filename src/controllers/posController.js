const { all, get, run } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

const createInvoice = async (req, res) => {
  try {
    const {
      MaKhachHang,
      items, // array of { MaSanPham, SoLuong }
      MaCodeKhuyenMai,
      TienKhachDua,
      HinhThucThanhToan, // 'Tiền mặt', 'Chuyển khoản', 'COD'
      GhiChu,
      DiaChiGiao, // if COD
      DonViVanChuyen // if COD
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Hóa đơn phải có ít nhất 01 sản phẩm.' });
    }

    let tongTienHang = 0;
    const validatedItems = [];

    // 1. Kiểm tra tồn kho & Áp dụng quy tắc giá QD01 (SL < 10: Giá lẻ, SL >= 10: Giá sỉ)
    for (const item of items) {
      const sp = await get('SELECT * FROM SAN_PHAM WHERE MaSanPham = ?', [item.MaSanPham]);
      if (!sp) {
        return res.status(404).json({ success: false, message: `Không tìm thấy sản phẩm có mã ${item.MaSanPham}.` });
      }

      const slMua = Number(item.SoLuong);
      if (slMua <= 0) {
        return res.status(400).json({ success: false, message: `Số lượng mua sản phẩm [${sp.TenSanPham}] phải lớn hơn 0.` });
      }

      if (slMua > sp.SoLuongTon) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm [${sp.TenSanPham}] không đủ hàng trong kho (Tồn: ${sp.SoLuongTon}, Yêu cầu: ${slMua}).`
        });
      }

      // QD01: Tự động áp dụng giá sỉ nếu số lượng >= 10
      let donGia = sp.GiaBanLe;
      let loaiGia = 'Giá lẻ';
      if (slMua >= 10) {
        donGia = sp.GiaBanSi;
        loaiGia = 'Giá sỉ (≥10)';
      }

      const thanhTien = slMua * donGia;
      tongTienHang += thanhTien;

      validatedItems.push({
        MaSanPham: sp.MaSanPham,
        TenSanPham: sp.TenSanPham,
        SoLuong: slMua,
        DonGia: donGia,
        LoaiGia: loaiGia,
        ThanhTien: thanhTien,
        DonViTinh: sp.DonViTinh
      });
    }

    // 2. Kiểm tra khuyến mãi (nếu có)
    let soTienGiam = 0;
    let maKhuyenMaiId = null;
    if (MaCodeKhuyenMai) {
      const km = await get(
        `SELECT * FROM KHUYEN_MAI 
         WHERE MaCode = ? AND TrangThai = 'Đang hoạt động' 
         AND date(NgayBatDau) <= date('now') AND date(NgayKetThuc) >= date('now')`,
        [MaCodeKhuyenMai.trim()]
      );
      if (km) {
        maKhuyenMaiId = km.MaKhuyenMai;
        soTienGiam = (tongTienHang * km.PhanTramGiam) / 100;
      }
    }

    const tongTien = Math.max(0, tongTienHang - soTienGiam);

    // 3. Kiểm tra tiền khách đưa (nếu thanh toán tiền mặt)
    const tienDua = Number(TienKhachDua) || tongTien;
    if (HinhThucThanhToan === 'Tiền mặt' && tienDua < tongTien) {
      return res.status(400).json({
        success: false,
        message: `Số tiền khách đưa (${tienDua.toLocaleString()}đ) nhỏ hơn tổng tiền phải thanh toán (${tongTien.toLocaleString()}đ).`
      });
    }
    const tienThoiLai = Math.max(0, tienDua - tongTien);

    // 4. QD02: Tích 1% giá trị hóa đơn thành điểm thưởng
    const paramTichDiem = await get("SELECT GiaTri FROM THAM_SO WHERE MaThamSo = 'TI_LE_TICH_DIEM'");
    const tiLe = paramTichDiem ? parseFloat(paramTichDiem.GiaTri) : 0.01;
    const diemCong = Math.floor((tongTien * tiLe) / 1000); // 1 điểm cho mỗi 1000đ tích lũy

    // 5. Lưu hóa đơn vào HOA_DON
    const insertInvoice = await run(
      `INSERT INTO HOA_DON (
        NgayLap, MaKhachHang, MaNhanVien, MaKhuyenMai, TongTienHang, SoTienGiam, TongTien, TienKhachDua, TienThoiLai, DiemCongThem, HinhThucThanhToan, GhiChu
      ) VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        MaKhachHang || null,
        req.user.MaNhanVien,
        maKhuyenMaiId,
        tongTienHang,
        soTienGiam,
        tongTien,
        tienDua,
        tienThoiLai,
        diemCong,
        HinhThucThanhToan || 'Tiền mặt',
        GhiChu || null
      ]
    );

    const maHoaDon = insertInvoice.lastID;

    // 6. Lưu CHI_TIET_HOA_DON và Trừ tồn kho SAN_PHAM
    for (const item of validatedItems) {
      await run(
        `INSERT INTO CHI_TIET_HOA_DON (MaHoaDon, MaSanPham, SoLuong, DonGia, LoaiGia, ThanhTien)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [maHoaDon, item.MaSanPham, item.SoLuong, item.DonGia, item.LoaiGia, item.ThanhTien]
      );

      // Trừ tồn kho
      await run(
        `UPDATE SAN_PHAM SET SoLuongTon = SoLuongTon - ? WHERE MaSanPham = ?`,
        [item.SoLuong, item.MaSanPham]
      );
    }

    // 7. Cộng điểm tích lũy cho khách hàng (nếu có)
    if (MaKhachHang && diemCong > 0) {
      await run(
        `UPDATE KHACH_HANG SET DiemTichLuy = DiemTichLuy + ? WHERE MaKhachHang = ?`,
        [diemCong, MaKhachHang]
      );
    }

    // 8. Nếu là đơn COD -> Tạo bản ghi GIAO_HANG_COD
    if (HinhThucThanhToan === 'COD') {
      await run(
        `INSERT INTO GIAO_HANG_COD (MaHoaDon, DonViVanChuyen, MaTracking, DiaChiGiao, TienThuHo, TrangThai, GhiChu)
         VALUES (?, ?, ?, ?, ?, 'Đang giao', ?)`,
        [
          maHoaDon,
          DonViVanChuyen || 'Giao Hàng Nhanh',
          `COD${Date.now().toString().slice(-8)}`,
          DiaChiGiao || 'Nhận tại địa chỉ khách hàng',
          tongTien,
          GhiChu || 'Giao hàng thu hộ COD'
        ]
      );
    }

    // 9. Ghi Audit Log
    await logAudit(
      req.user.MaNhanVien,
      'LẬP HÓA ĐƠN',
      `Lập hóa đơn #HD${maHoaDon} - Tổng tiền: ${tongTien.toLocaleString('vi-VN')} VNĐ - Hình thức: ${HinhThucThanhToan}`
    );

    res.status(201).json({
      success: true,
      message: 'Lập hóa đơn bán hàng thành công!',
      invoiceId: maHoaDon,
      data: {
        MaHoaDon: maHoaDon,
        TongTienHang: tongTienHang,
        SoTienGiam: soTienGiam,
        TongTien: tongTien,
        TienKhachDua: tienDua,
        TienThoiLai: tienThoiLai,
        DiemCongThem: diemCong,
        items: validatedItems
      }
    });
  } catch (err) {
    console.error('Lỗi khi lập hóa đơn:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lập hóa đơn bán hàng.' });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { fromDate, toDate, customerId, paymentMethod } = req.query;
    let query = `
      SELECT hd.*, kh.HoTen as TenKhachHang, kh.SoDienThoai as SdtKhachHang,
             nv.HoTen as TenNhanVien, km.TenKhuyenMai, km.PhanTramGiam
      FROM HOA_DON hd
      LEFT JOIN KHACH_HANG kh ON hd.MaKhachHang = kh.MaKhachHang
      JOIN NHAN_VIEN nv ON hd.MaNhanVien = nv.MaNhanVien
      LEFT JOIN KHUYEN_MAI km ON hd.MaKhuyenMai = km.MaKhuyenMai
      WHERE 1=1
    `;
    const params = [];

    if (fromDate) {
      query += ` AND date(hd.NgayLap) >= date(?)`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(hd.NgayLap) <= date(?)`;
      params.push(toDate);
    }
    if (customerId) {
      query += ` AND hd.MaKhachHang = ?`;
      params.push(customerId);
    }
    if (paymentMethod) {
      query += ` AND hd.HinhThucThanhToan = ?`;
      params.push(paymentMethod);
    }

    query += ` ORDER BY hd.MaHoaDon DESC`;
    const invoices = await all(query, params);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách hóa đơn.' });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await get(
      `SELECT hd.*, kh.HoTen as TenKhachHang, kh.SoDienThoai as SdtKhachHang, kh.DiaChi as DiaChiKhach,
              nv.HoTen as TenNhanVien, km.TenKhuyenMai, km.PhanTramGiam
       FROM HOA_DON hd
       LEFT JOIN KHACH_HANG kh ON hd.MaKhachHang = kh.MaKhachHang
       JOIN NHAN_VIEN nv ON hd.MaNhanVien = nv.MaNhanVien
       LEFT JOIN KHUYEN_MAI km ON hd.MaKhuyenMai = km.MaKhuyenMai
       WHERE hd.MaHoaDon = ?`,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn.' });
    }

    const items = await all(
      `SELECT cthd.*, sp.TenSanPham, sp.DonViTinh
       FROM CHI_TIET_HOA_DON cthd
       JOIN SAN_PHAM sp ON cthd.MaSanPham = sp.MaSanPham
       WHERE cthd.MaHoaDon = ?`,
      [id]
    );

    const cod = await get('SELECT * FROM GIAO_HANG_COD WHERE MaHoaDon = ?', [id]);

    res.json({
      success: true,
      data: {
        ...invoice,
        items,
        cod
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết hóa đơn.' });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById
};

