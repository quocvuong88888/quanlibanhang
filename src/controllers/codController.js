const { all, get, run } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

const getDeliveries = async (req, res) => {
  try {
    const { status, fromDate, toDate } = req.query;
    let query = `
      SELECT gh.*, hd.TongTien, hd.NgayLap, kh.HoTen as TenKhachHang, kh.SoDienThoai as SdtKhachHang,
             nv.HoTen as TenThuNgan
      FROM GIAO_HANG_COD gh
      JOIN HOA_DON hd ON gh.MaHoaDon = hd.MaHoaDon
      LEFT JOIN KHACH_HANG kh ON hd.MaKhachHang = kh.MaKhachHang
      JOIN NHAN_VIEN nv ON hd.MaNhanVien = nv.MaNhanVien
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND gh.TrangThai = ?`;
      params.push(status);
    }
    if (fromDate) {
      query += ` AND date(hd.NgayLap) >= date(?)`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(hd.NgayLap) <= date(?)`;
      params.push(toDate);
    }

    query += ` ORDER BY gh.MaGiaoHang DESC`;
    const list = await all(query, params);

    // Summary statistics
    const stats = await get(`
      SELECT 
        SUM(CASE WHEN TrangThai = 'Đang giao' THEN TienThuHo ELSE 0 END) as TongTienDangGiao,
        SUM(CASE WHEN TrangThai = 'Thành công' THEN TienThuHo ELSE 0 END) as TongTienChoDoiSoat,
        SUM(CASE WHEN TrangThai = 'Đã đối soát' THEN TienThuHo ELSE 0 END) as TongTienDaDoiSoat,
        COUNT(CASE WHEN TrangThai = 'Thành công' THEN 1 END) as SoDonChoDoiSoat
      FROM GIAO_HANG_COD
    `);

    res.json({ success: true, data: list, summary: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách vận đơn COD.' });
  }
};

const updateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { TrangThai, MaTracking, DonViVanChuyen, GhiChu } = req.body;

    await run(
      `UPDATE GIAO_HANG_COD
       SET TrangThai = COALESCE(?, TrangThai),
           MaTracking = COALESCE(?, MaTracking),
           DonViVanChuyen = COALESCE(?, DonViVanChuyen),
           GhiChu = COALESCE(?, GhiChu)
       WHERE MaGiaoHang = ?`,
      [TrangThai, MaTracking, DonViVanChuyen, GhiChu, id]
    );

    await logAudit(
      req.user.MaNhanVien,
      'CẬP NHẬT VẬN ĐƠN COD',
      `Cập nhật vận đơn #COD${id} - Trạng thái: ${TrangThai}`
    );

    res.json({ success: true, message: 'Cập nhật vận đơn thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật vận đơn.' });
  }
};

// Nghiệp vụ đối soát cuối ngày của Kế toán (QD04)
const reconcileDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await get('SELECT * FROM GIAO_HANG_COD WHERE MaGiaoHang = ?', [id]);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn vận chuyển.' });
    }

    if (delivery.TrangThai === 'Đã đối soát') {
      return res.status(400).json({ success: false, message: 'Đơn này đã được đối soát trước đó.' });
    }

    await run(
      `UPDATE GIAO_HANG_COD
       SET TrangThai = 'Đã đối soát', NgayDoiSoat = datetime('now', 'localtime')
       WHERE MaGiaoHang = ?`,
      [id]
    );

    await logAudit(
      req.user.MaNhanVien,
      'ĐỐI SOÁT COD',
      `Kế toán đối soát đơn #COD${id} (Hóa đơn #HD${delivery.MaHoaDon}) - Số tiền thu hộ: ${delivery.TienThuHo.toLocaleString('vi-VN')} VNĐ theo QD04.`
    );

    res.json({ success: true, message: 'Đối soát tiền thu hộ COD thành công theo QD04!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý đối soát COD.' });
  }
};

module.exports = {
  getDeliveries,
  updateDelivery,
  reconcileDelivery
};

