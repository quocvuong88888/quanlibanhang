const { run } = require('../../database/db');

const logAudit = async (employeeId, action, details) => {
  try {
    await run(
      'INSERT INTO NHAT_KY_HOAT_DONG (MaNhanVien, HanhDong, ChiTiet) VALUES (?, ?, ?)',
      [employeeId || null, action, details || '']
    );
  } catch (err) {
    console.error('Lỗi khi ghi nhật ký hoạt động (Audit Log):', err.message);
  }
};

module.exports = { logAudit };

