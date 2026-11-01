const { all, get } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

const getDashboardSummary = async (req, res) => {
  try {
    // 1. Tổng doanh thu hôm nay
    const todayRevenue = await get(`
      SELECT 
        COUNT(MaHoaDon) as SoDonHomNay,
        COALESCE(SUM(TongTien), 0) as DoanhThuHomNay
      FROM HOA_DON
      WHERE date(NgayLap) = date('now')
    `);

    // 2. Tổng doanh thu toàn bộ & Tổng giá vốn chính xác
    const totalRev = await get(`
      SELECT 
        COUNT(MaHoaDon) as TongSoDon,
        COALESCE(SUM(TongTien), 0) as TongDoanhThu
      FROM HOA_DON
    `);

    const totalCost = await get(`
      SELECT COALESCE(SUM(cthd.SoLuong * sp.GiaNhap), 0) as TongGiaVon
      FROM CHI_TIET_HOA_DON cthd
      JOIN SAN_PHAM sp ON cthd.MaSanPham = sp.MaSanPham
    `);

    const tongDoanhThu = totalRev ? totalRev.TongDoanhThu : 0;
    const tongGiaVon = totalCost ? totalCost.TongGiaVon : 0;
    const loiNhuanGop = tongDoanhThu - tongGiaVon;

    // 3. Số sản phẩm sắp hết hàng (tồn <= 5)
    const lowStockCount = await get(`SELECT COUNT(*) as count FROM SAN_PHAM WHERE SoLuongTon <= 5`);

    // 4. Đơn COD chờ đối soát
    const codPending = await get(`SELECT COUNT(*) as count, COALESCE(SUM(TienThuHo), 0) as total FROM GIAO_HANG_COD WHERE TrangThai = 'Thành công'`);

    // 5. Phiếu nhập chờ Giám đốc duyệt (QD05)
    const pendingReceipts = await get(`SELECT COUNT(*) as count FROM NHAP_KHO WHERE TrangThaiDuyet = 'Chờ Giám đốc duyệt'`);

    res.json({
      success: true,
      data: {
        doanhThuHomNay: todayRevenue ? todayRevenue.DoanhThuHomNay : 0,
        soDonHomNay: todayRevenue ? todayRevenue.SoDonHomNay : 0,
        tongDoanhThu,
        tongGiaVon,
        loiNhuanGop,
        tongSoDon: totalRev ? totalRev.TongSoDon : 0,
        soSanPhamCanhBaoTon: lowStockCount ? lowStockCount.count : 0,
        soDonCodChoDoiSoat: codPending ? codPending.count : 0,
        tienCodChoDoiSoat: codPending ? codPending.total : 0,
        soPhieuNhapChoDuyet: pendingReceipts ? pendingReceipts.count : 0
      }
    });
  } catch (err) {
    console.error('Lỗi tải báo cáo tổng quan:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải thống kê báo cáo.' });
  }
};

const getRevenueReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Doanh thu theo từng ngày gần nhất (cho biểu đồ đồ thị)
    let dailyQuery = `
      SELECT 
        date(hd.NgayLap) as Ngay,
        COUNT(DISTINCT hd.MaHoaDon) as SoDonHang,
        COALESCE(SUM(DISTINCT hd.TongTien), 0) as DoanhThu,
        COALESCE(SUM(cthd.SoLuong * sp.GiaNhap), 0) as GiaVon
      FROM HOA_DON hd
      LEFT JOIN CHI_TIET_HOA_DON cthd ON hd.MaHoaDon = cthd.MaHoaDon
      LEFT JOIN SAN_PHAM sp ON cthd.MaSanPham = sp.MaSanPham
      WHERE 1=1
    `;
    const params = [];

    if (fromDate) {
      dailyQuery += ` AND date(hd.NgayLap) >= date(?)`;
      params.push(fromDate);
    }
    if (toDate) {
      dailyQuery += ` AND date(hd.NgayLap) <= date(?)`;
      params.push(toDate);
    }

    dailyQuery += ` GROUP BY date(hd.NgayLap) ORDER BY date(hd.NgayLap) ASC LIMIT 30`;
    const dailyData = await all(dailyQuery, params);

    // Tính lợi nhuận gộp từng ngày
    const formattedDaily = dailyData.map(d => ({
      ...d,
      LoiNhuanGop: Math.max(0, d.DoanhThu - d.GiaVon)
    }));

    // Top 5 sản phẩm bán chạy nhất
    let topQuery = `
      SELECT 
        sp.MaSanPham,
        sp.TenSanPham,
        sp.DonViTinh,
        SUM(cthd.SoLuong) as TongSoLuongBan,
        SUM(cthd.SoLuong * cthd.DonGia) as TongDoanhThuSp
      FROM CHI_TIET_HOA_DON cthd
      JOIN SAN_PHAM sp ON cthd.MaSanPham = sp.MaSanPham
      JOIN HOA_DON hd ON cthd.MaHoaDon = hd.MaHoaDon
      WHERE 1=1
    `;
    const topParams = [];
    if (fromDate) {
      topQuery += ` AND date(hd.NgayLap) >= date(?)`;
      topParams.push(fromDate);
    }
    if (toDate) {
      topQuery += ` AND date(hd.NgayLap) <= date(?)`;
      topParams.push(toDate);
    }
    topQuery += ` GROUP BY sp.MaSanPham, sp.TenSanPham, sp.DonViTinh ORDER BY TongSoLuongBan DESC LIMIT 5`;

    const topProducts = await all(topQuery, topParams);

    // Cảnh báo tồn kho thấp (BM06)
    const lowStockProducts = await all(`
      SELECT sp.*, dm.TenDanhMuc, th.TenThuongHieu
      FROM SAN_PHAM sp
      JOIN DANH_MUC dm ON sp.MaDanhMuc = dm.MaDanhMuc
      JOIN THUONG_HIEU th ON sp.MaThuongHieu = th.MaThuongHieu
      WHERE sp.SoLuongTon <= 5
      ORDER BY sp.SoLuongTon ASC
    `);

    res.json({
      success: true,
      data: {
        daily: formattedDaily,
        topProducts,
        lowStockProducts
      }
    });
  } catch (err) {
    console.error('Lỗi tạo báo cáo:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải báo cáo doanh thu.' });
  }
};

module.exports = {
  getDashboardSummary,
  getRevenueReport
};
