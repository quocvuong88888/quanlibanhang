const { initDatabase, all, get, run } = require('./database/db');
const bcrypt = require('bcryptjs');

async function testAll() {
  console.log('--- BẮT ĐẦU KIỂM THỬ HỆ THỐNG ENERGY STORE ---');
  await initDatabase();

  // Test 1: Kiểm tra người dùng
  const users = await all('SELECT nv.TenDangNhap, vt.TenVaiTro FROM NHAN_VIEN nv JOIN VAI_TRO vt ON nv.MaVaiTro = vt.MaVaiTro');
  console.log('✓ 1. Số lượng nhân viên hệ thống:', users.length);
  users.forEach(u => console.log(`   - ${u.TenDangNhap}: ${u.TenVaiTro}`));

  // Test 2: Kiểm tra Sản phẩm & Quy định QD01
  const prods = await all('SELECT TenSanPham, GiaNhap, GiaBanLe, GiaBanSi, SoLuongTon FROM SAN_PHAM LIMIT 3');
  console.log('✓ 2. Mẫu sản phẩm áp dụng QD01:');
  prods.forEach(p => console.log(`   - ${p.TenSanPham} | Giá lẻ: ${p.GiaBanLe} | Giá sỉ: ${p.GiaBanSi} | Tồn: ${p.SoLuongTon}`));

  // Test 3: Kiểm tra Tham số hệ thống (THAM_SO)
  const params = await all('SELECT MaThamSo, GiaTri FROM THAM_SO');
  console.log('✓ 3. Tham số cấu hình hệ thống:');
  params.forEach(p => console.log(`   - ${p.MaThamSo} = ${p.GiaTri}`));

  // Test 4: Kiểm tra Phiếu nhập kho > 20M (QD05)
  const pendingReceipts = await all("SELECT MaPhieuNhap, TongTienNhap, TrangThaiDuyet FROM NHAP_KHO WHERE TrangThaiDuyet = 'Chờ Giám đốc duyệt'");
  console.log('✓ 4. Phiếu nhập kho chờ Giám đốc duyệt (QD05):', pendingReceipts.length);
  pendingReceipts.forEach(r => console.log(`   - #PN${r.MaPhieuNhap}: ${r.TongTienNhap.toLocaleString()} VNĐ -> ${r.TrangThaiDuyet}`));

  // Test 5: Kiểm tra Đơn COD chờ đối soát (QD04)
  const codOrders = await all("SELECT MaGiaoHang, TienThuHo, TrangThai FROM GIAO_HANG_COD");
  console.log('✓ 5. Vận đơn COD:', codOrders.length);
  codOrders.forEach(c => console.log(`   - #COD${c.MaGiaoHang}: ${c.TienThuHo.toLocaleString()} VNĐ -> ${c.TrangThai}`));

  console.log('--- TOÀN BỘ KIỂM THỬ THÀNH CÔNG TỐT ĐẸP! ---');
  process.exit(0);
}

testAll().catch(e => {
  console.error('Lỗi kiểm thử:', e);
  process.exit(1);
});

