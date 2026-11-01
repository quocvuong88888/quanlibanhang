const sql = require('mssql');

const config = {
  user: 'energy_app',
  password: 'EnergyPassword123!',
  server: 'localhost',
  instanceName: 'SQLEXPRESS',
  database: 'ENERGY_STORE_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testConnection() {
  console.log('--- Kiểm tra kết nối SQL Server với tài khoản energy_app ---');
  try {
    const pool = await new sql.ConnectionPool(config).connect();
    console.log('✓ KẾT NỐI SQL SERVER THÀNH CÔNG VỚI DATABASE ENERGY_STORE_DB!');
    const result = await pool.request().query('SELECT COUNT(*) as count FROM SAN_PHAM');
    console.log('✓ Số sản phẩm thực tế trong SQL Server:', result.recordset[0].count);
    
    const sample = await pool.request().query('SELECT TOP 3 TenSanPham, GiaBanLe, GiaBanSi, SoLuongTon FROM SAN_PHAM');
    console.log('✓ Dữ liệu mẫu từ SQL Server:');
    sample.recordset.forEach(p => console.log(`   - ${p.TenSanPham} | Bán lẻ: ${p.GiaBanLe} | Bán sỉ: ${p.GiaBanSi} | Tồn: ${p.SoLuongTon}`));

    await pool.close();
    console.log('✓ ĐÃ HOÀN TẤT KIỂM TRA THÀNH CÔNG RỰC RỠ!');
  } catch (err) {
    console.error('✗ Lỗi kết nối:', err.message);
  }
}

testConnection();
