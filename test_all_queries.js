const { initDatabase, all, get, run } = require('./database/db');

async function testAllQueries() {
  console.log('=== BẮT ĐẦU KIỂM TRA TẤT CẢ TRUY VẤN VỚI SQL SERVER ===');
  await initDatabase();

  // 1. Products list with category, brand and search
  const prods = await all(`
    SELECT sp.*, dm.TenDanhMuc, th.TenThuongHieu
    FROM SAN_PHAM sp
    JOIN DANH_MUC dm ON sp.MaDanhMuc = dm.MaDanhMuc
    JOIN THUONG_HIEU th ON sp.MaThuongHieu = th.MaThuongHieu
    WHERE 1=1
    ORDER BY sp.MaSanPham DESC
  `);
  console.log('✓ 1. Lấy danh sách sản phẩm thành công:', prods.length, 'sản phẩm.');
  console.log('   Tên SP đầu tiên:', prods[0].TenSanPham);

  // 2. Categories & Brands
  const cats = await all('SELECT * FROM DANH_MUC ORDER BY MaDanhMuc ASC');
  const brands = await all('SELECT * FROM THUONG_HIEU ORDER BY MaThuongHieu ASC');
  console.log('✓ 2. Danh mục & Thương hiệu:', cats.length, 'danh mục,', brands.length, 'thương hiệu.');
  console.log('   Tên DM đầu tiên:', cats[0].TenDanhMuc);

  // 3. Khách hàng
  const custs = await all('SELECT * FROM KHACH_HANG ORDER BY MaKhachHang DESC');
  console.log('✓ 3. Khách hàng:', custs.length, 'khách.');
  console.log('   Tên KH đầu tiên:', custs[0].HoTen);

  // 4. Khuyến mãi (Kiểm tra query có date() so sánh)
  const km = await get(
    `SELECT * FROM KHUYEN_MAI 
     WHERE MaCode = ? AND TrangThai = 'Đang hoạt động' 
     AND date(NgayBatDau) <= date('now') AND date(NgayKetThuc) >= date('now')`,
    ['ENERGY10']
  );
  console.log('✓ 4. Tra cứu khuyến mãi ENERGY10:', km ? `${km.TenKhuyenMai} (-${km.PhanTramGiam}%)` : 'Không thấy');

  // 5. Dashboard summary query (doanh thu, đơn hôm nay)
  const todayRevenue = await get(`
    SELECT 
      COUNT(MaHoaDon) as SoDonHomNay,
      COALESCE(SUM(TongTien), 0) as DoanhThuHomNay
    FROM HOA_DON
    WHERE date(NgayLap) = date('now')
  `);
  console.log('✓ 5. Doanh thu hôm nay:', todayRevenue);

  // 6. Daily revenue report query (có GROUP BY date)
  const daily = await all(`
    SELECT 
      date(hd.NgayLap) as Ngay,
      COUNT(DISTINCT hd.MaHoaDon) as SoDonHang,
      COALESCE(SUM(DISTINCT hd.TongTien), 0) as DoanhThu,
      COALESCE(SUM(cthd.SoLuong * sp.GiaNhap), 0) as GiaVon
    FROM HOA_DON hd
    LEFT JOIN CHI_TIET_HOA_DON cthd ON hd.MaHoaDon = cthd.MaHoaDon
    LEFT JOIN SAN_PHAM sp ON cthd.MaSanPham = sp.MaSanPham
    GROUP BY date(hd.NgayLap)
    ORDER BY date(hd.NgayLap) ASC
    LIMIT 30
  `);
  console.log('✓ 6. Biểu đồ doanh thu theo ngày:', daily.length, 'ngày có dữ liệu.');

  // 7. Top 5 sản phẩm bán chạy (có LIMIT 5)
  const top = await all(`
    SELECT 
      sp.MaSanPham,
      sp.TenSanPham,
      sp.DonViTinh,
      SUM(cthd.SoLuong) as TongSoLuongBan,
      SUM(cthd.SoLuong * cthd.DonGia) as TongDoanhThuSp
    FROM CHI_TIET_HOA_DON cthd
    JOIN SAN_PHAM sp ON cthd.MaSanPham = sp.MaSanPham
    JOIN HOA_DON hd ON cthd.MaHoaDon = hd.MaHoaDon
    GROUP BY sp.MaSanPham, sp.TenSanPham, sp.DonViTinh
    ORDER BY TongSoLuongBan DESC
    LIMIT 5
  `);
  console.log('✓ 7. Top 5 sản phẩm bán chạy:', top.length, 'sản phẩm.');

  // 8. Phiếu nhập kho (với trạng thái duyệt QD05)
  const receipts = await all(`
    SELECT nk.*, ncc.TenNCC, nv.HoTen as TenNhanVien
    FROM NHAP_KHO nk
    JOIN NHA_CUNG_CAP ncc ON nk.MaNCC = ncc.MaNCC
    JOIN NHAN_VIEN nv ON nk.MaNhanVien = nv.MaNhanVien
    ORDER BY nk.MaPhieuNhap DESC
  `);
  console.log('✓ 8. Phiếu nhập kho:', receipts.length, 'phiếu.');
  console.log('   Phiếu #PN' + receipts[0].MaPhieuNhap + ':', receipts[0].TrangThaiDuyet);

  // 9. Vận đơn COD
  const codList = await all(`
    SELECT gh.*, hd.TongTien, kh.HoTen as TenKhachHang
    FROM GIAO_HANG_COD gh
    JOIN HOA_DON hd ON gh.MaHoaDon = hd.MaHoaDon
    LEFT JOIN KHACH_HANG kh ON hd.MaKhachHang = kh.MaKhachHang
    ORDER BY gh.MaGiaoHang DESC
  `);
  console.log('✓ 9. Vận đơn COD:', codList.length, 'đơn.');

  // 10. Audit logs (với LIMIT 100)
  const audit = await all(`
    SELECT nk.*, nv.HoTen as TenNhanVien, nv.TenDangNhap
    FROM NHAT_KY_HOAT_DONG nk
    LEFT JOIN NHAN_VIEN nv ON nk.MaNhanVien = nv.MaNhanVien
    ORDER BY nk.MaNhatKy DESC
    LIMIT 100
  `);
  console.log('✓ 10. Nhật ký hoạt động Audit Log:', audit.length, 'bản ghi.');

  console.log('\n=== TẤT CẢ 10/10 MODULE TRUY VẤN ĐỀU CHẠY HOÀN HẢO TRÊN SQL SERVER! ===');
  process.exit(0);
}

testAllQueries().catch(err => {
  console.error('LỖI KIỂM TRA TRUY VẤN:', err);
  process.exit(1);
});

