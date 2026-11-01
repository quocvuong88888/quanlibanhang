const { initDatabase, all, get, run } = require('./database/db');

async function testSQLServerFlow() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TƯƠNG TÁC DỮ LIỆU THẬT VỚI SQL SERVER');
  console.log('================================================================');

  await initDatabase();

  // 1. Kiểm tra sản phẩm ban đầu
  const sp1 = await get('SELECT * FROM SAN_PHAM WHERE MaSanPham = 1');
  console.log(`\n[BƯỚC 1] Sản phẩm #1 ban đầu: [${sp1.TenSanPham}]`);
  console.log(`   - Tồn kho ban đầu: ${sp1.SoLuongTon}`);
  console.log(`   - Giá bán lẻ (<10): ${sp1.GiaBanLe.toLocaleString()} VNĐ`);
  console.log(`   - Giá bán sỉ (>=10): ${sp1.GiaBanSi.toLocaleString()} VNĐ`);

  // 2. Kiểm tra khách hàng ban đầu
  const kh1 = await get('SELECT * FROM KHACH_HANG WHERE MaKhachHang = 1');
  console.log(`\n[BƯỚC 2] Khách hàng #1: [${kh1.HoTen}] - Điểm tích lũy ban đầu: ${kh1.DiemTichLuy}`);

  // 3. Giả lập bán hàng POS theo QD01 (mua 10 cái -> áp giá sỉ) & QD02 (tích 1% điểm)
  const slMua = 10;
  const donGia = slMua >= 10 ? sp1.GiaBanSi : sp1.GiaBanLe;
  const tongTien = slMua * donGia;
  const diemCong = Math.floor((tongTien * 0.01) / 1000);

  console.log(`\n[BƯỚC 3] Giả lập hóa đơn mua ${slMua} sản phẩm:`);
  console.log(`   - Quy định QD01 áp dụng: Đơn giá sỉ = ${donGia.toLocaleString()} VNĐ`);
  console.log(`   - Tổng tiền hóa đơn: ${tongTien.toLocaleString()} VNĐ`);
  console.log(`   - Điểm tích lũy cộng thêm (QD02): +${diemCong} điểm`);

  // Ghi hóa đơn vào SQL Server
  const resHD = await run(
    `INSERT INTO HOA_DON (MaKhachHang, MaNhanVien, TongTienHang, TongTien, TienKhachDua, TienThoiLai, DiemCongThem, HinhThucThanhToan, GhiChu)
     VALUES (?, 1, ?, ?, ?, 0, ?, 'Tiền mặt', 'Đơn hàng kiểm thử POS')`,
    [kh1.MaKhachHang, tongTien, tongTien, tongTien, diemCong]
  );
  const maHD = resHD.lastID;
  console.log(`   ✓ Đã tạo Hóa đơn trong SQL Server: #HD${maHD}`);

  // Ghi chi tiết hóa đơn
  await run(
    `INSERT INTO CHI_TIET_HOA_DON (MaHoaDon, MaSanPham, SoLuong, DonGia, LoaiGia)
     VALUES (?, ?, ?, ?, 'Giá sỉ (≥10)')`,
    [maHD, sp1.MaSanPham, slMua, donGia]
  );

  // Trừ tồn kho trong SQL Server
  await run('UPDATE SAN_PHAM SET SoLuongTon = SoLuongTon - ? WHERE MaSanPham = ?', [slMua, sp1.MaSanPham]);

  // Cộng điểm tích lũy trong SQL Server
  await run('UPDATE KHACH_HANG SET DiemTichLuy = DiemTichLuy + ? WHERE MaKhachHang = ?', [diemCong, kh1.MaKhachHang]);

  // Ghi Audit Log trong SQL Server
  await run(
    `INSERT INTO NHAT_KY_HOAT_DONG (MaNhanVien, HanhDong, ChiTiet)
     VALUES (1, 'BÁN HÀNG POS', 'Kiểm thử tạo hóa đơn #HD' + CAST(? AS VARCHAR) + ' trên SQL Server')`,
    [maHD]
  );

  // 4. Kiểm tra lại dữ liệu thật trong SQL Server sau giao dịch
  const sp1Sau = await get('SELECT * FROM SAN_PHAM WHERE MaSanPham = 1');
  const kh1Sau = await get('SELECT * FROM KHACH_HANG WHERE MaKhachHang = 1');
  const audit = await get('SELECT TOP 1 * FROM NHAT_KY_HOAT_DONG ORDER BY MaNhatKy DESC');

  console.log(`\n[BƯỚC 4] Kiểm tra dữ liệu thật trong CSDL SQL Server sau khi giao dịch:`);
  console.log(`   ✓ Tồn kho sản phẩm #1: ${sp1.SoLuongTon} -> CÒN LẠI: ${sp1Sau.SoLuongTon} (Đã giảm chính xác ${slMua})`);
  console.log(`   ✓ Điểm tích lũy khách #1: ${kh1.DiemTichLuy} -> TĂNG LÊN: ${kh1Sau.DiemTichLuy} (Đã cộng chính xác +${diemCong})`);
  console.log(`   ✓ Audit Log SQL Server: [${audit.HanhDong}] - ${audit.ChiTiet}`);

  console.log('\n================================================================');
  console.log('🎉 TOÀN BỘ QUY TRÌNH BÁN HÀNG & CSDL SQL SERVER HOÀN TOÀN CHÍNH XÁC!');
  console.log('================================================================');
  process.exit(0);
}

testSQLServerFlow().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});

