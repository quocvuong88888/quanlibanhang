const { all, get, run } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

const getCustomers = async (req, res) => {
  try {
    const { keyword } = req.query;
    let query = 'SELECT * FROM KHACH_HANG WHERE 1=1';
    const params = [];

    if (keyword) {
      query += ' AND (HoTen LIKE ? OR SoDienThoai LIKE ? OR Email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    query += ' ORDER BY MaKhachHang DESC';
    const customers = await all(query, params);
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách khách hàng.' });
  }
};

const getCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const customer = await get('SELECT * FROM KHACH_HANG WHERE SoDienThoai = ?', [phone]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng.' });
    }

    // Lịch sử mua hàng
    const orders = await all(
      'SELECT MaHoaDon, NgayLap, TongTien, HinhThucThanhToan FROM HOA_DON WHERE MaKhachHang = ? ORDER BY MaHoaDon DESC LIMIT 10',
      [customer.MaKhachHang]
    );

    res.json({ success: true, data: { ...customer, orders } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tìm khách hàng.' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { HoTen, SoDienThoai, Email, DiaChi } = req.body;
    if (!HoTen || !SoDienThoai) {
      return res.status(400).json({ success: false, message: 'Họ tên và Số điện thoại là bắt buộc.' });
    }

    const existing = await get('SELECT MaKhachHang FROM KHACH_HANG WHERE SoDienThoai = ?', [SoDienThoai.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký trong hệ thống.' });
    }

    const result = await run(
      'INSERT INTO KHACH_HANG (HoTen, SoDienThoai, Email, DiaChi, DiemTichLuy) VALUES (?, ?, ?, ?, 0)',
      [HoTen.trim(), SoDienThoai.trim(), Email || null, DiaChi || null]
    );

    await logAudit(
      req.user.MaNhanVien,
      'THÊM KHÁCH HÀNG',
      `Đăng ký khách hàng mới [${HoTen}] - SĐT: ${SoDienThoai}`
    );

    res.status(201).json({
      success: true,
      message: 'Thêm khách hàng thành công!',
      customerId: result.lastID,
      data: {
        MaKhachHang: result.lastID,
        HoTen,
        SoDienThoai,
        Email,
        DiaChi,
        DiemTichLuy: 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi thêm khách hàng.' });
  }
};

// Khuyến mãi
const getPromotions = async (req, res) => {
  try {
    const promotions = await all('SELECT * FROM KHUYEN_MAI ORDER BY MaKhuyenMai DESC');
    res.json({ success: true, data: promotions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách khuyến mãi.' });
  }
};

const createPromotion = async (req, res) => {
  try {
    const { MaCode, TenKhuyenMai, PhanTramGiam, NgayBatDau, NgayKetThuc } = req.body;
    if (!MaCode || !TenKhuyenMai || !PhanTramGiam || !NgayBatDau || !NgayKetThuc) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin chương trình khuyến mãi.' });
    }

    const pct = parseInt(PhanTramGiam);
    if (pct < 1 || pct > 100) {
      return res.status(400).json({ success: false, message: 'Phần trăm giảm phải từ 1 đến 100%.' });
    }

    const existing = await get('SELECT MaKhuyenMai FROM KHUYEN_MAI WHERE MaCode = ?', [MaCode.trim().toUpperCase()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi này đã tồn tại.' });
    }

    const result = await run(
      `INSERT INTO KHUYEN_MAI (MaCode, TenKhuyenMai, PhanTramGiam, NgayBatDau, NgayKetThuc, TrangThai)
       VALUES (?, ?, ?, ?, ?, 'Đang hoạt động')`,
      [MaCode.trim().toUpperCase(), TenKhuyenMai.trim(), pct, NgayBatDau, NgayKetThuc]
    );

    await logAudit(
      req.user.MaNhanVien,
      'TẠO KHUYẾN MÃI',
      `Tạo mã khuyến mãi [${MaCode}] - Giảm ${pct}% - Duyệt bởi Giám đốc theo QD05.`
    );

    res.status(201).json({ success: true, message: 'Tạo mã khuyến mãi thành công!', promotionId: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạo khuyến mãi.' });
  }
};

const checkPromotionCode = async (req, res) => {
  try {
    const { code } = req.params;
    const km = await get(
      `SELECT * FROM KHUYEN_MAI 
       WHERE MaCode = ? AND TrangThai = 'Đang hoạt động' 
       AND date(NgayBatDau) <= date('now') AND date(NgayKetThuc) >= date('now')`,
      [code.trim().toUpperCase()]
    );

    if (!km) {
      return res.status(404).json({ success: false, message: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.' });
    }

    res.json({ success: true, data: km });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra mã khuyến mãi.' });
  }
};

module.exports = {
  getCustomers,
  getCustomerByPhone,
  createCustomer,
  getPromotions,
  createPromotion,
  checkPromotionCode
};

