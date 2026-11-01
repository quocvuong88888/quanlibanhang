const { all } = require('../../database/db');

// Kiểm tra quyền hạn theo mã chức năng (RBAC)
const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      }

      // Giám đốc (MaVaiTro = 1) hoặc Admin (MaVaiTro = 5) có toàn quyền
      if (req.user.MaVaiTro === 1 || req.user.MaVaiTro === 5) {
        return next();
      }

      // Kiểm tra quyền cụ thể của vai trò
      const permissions = await all(
        'SELECT MaChucNang FROM PHAN_QUYEN WHERE MaVaiTro = ?',
        [req.user.MaVaiTro]
      );

      const hasPermission = permissions.some(p => p.MaChucNang === requiredPermission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Bạn không có quyền thực hiện chức năng: [${requiredPermission}].`
        });
      }

      next();
    } catch (err) {
      console.error('Lỗi kiểm tra quyền RBAC:', err);
      res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền hệ thống.' });
    }
  };
};

module.exports = { authorize };

