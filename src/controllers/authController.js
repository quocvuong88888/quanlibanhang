const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, all, run } = require('../../database/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const user = await get(
      `SELECT nv.*, vt.TenVaiTro 
       FROM NHAN_VIEN nv
       JOIN VAI_TRO vt ON nv.MaVaiTro = vt.MaVaiTro
       WHERE nv.TenDangNhap = ?`,
      [username.trim()]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập không tồn tại.' });
    }

    if (user.TrangThai === 0) {
      return res.status(403).json({ success: false, message: 'Tài khoản nhân viên này đã bị khóa.' });
    }

    // Verify password
    let isMatch = false;
    if (user.MatKhau.startsWith('$2a$') || user.MatKhau.startsWith('$2b$')) {
      isMatch = bcrypt.compareSync(password, user.MatKhau);
    } else {
      isMatch = (password === user.MatKhau);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác.' });
    }

    // Get permissions for user role
    const permissions = await all(
      'SELECT MaChucNang FROM PHAN_QUYEN WHERE MaVaiTro = ?',
      [user.MaVaiTro]
    );
    const permissionKeys = permissions.map(p => p.MaChucNang);

    // Create JWT Token
    const payload = {
      MaNhanVien: user.MaNhanVien,
      HoTen: user.HoTen,
      TenDangNhap: user.TenDangNhap,
      MaVaiTro: user.MaVaiTro,
      TenVaiTro: user.TenVaiTro,
      permissions: permissionKeys
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    // Log audit
    await logAudit(user.MaNhanVien, 'ĐĂNG NHẬP', `Nhân viên [${user.HoTen}] đăng nhập vào hệ thống.`);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng nhập.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await get(
      `SELECT nv.MaNhanVien, nv.HoTen, nv.SoDienThoai, nv.TenDangNhap, nv.MaVaiTro, vt.TenVaiTro
       FROM NHAN_VIEN nv
       JOIN VAI_TRO vt ON nv.MaVaiTro = vt.MaVaiTro
       WHERE nv.MaNhanVien = ?`,
      [req.user.MaNhanVien]
    );

    const permissions = await all(
      'SELECT MaChucNang FROM PHAN_QUYEN WHERE MaVaiTro = ?',
      [user.MaVaiTro]
    );

    res.json({
      success: true,
      user: {
        ...user,
        permissions: permissions.map(p => p.MaChucNang)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải thông tin tài khoản.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới.' });
    }

    const user = await get('SELECT * FROM NHAN_VIEN WHERE MaNhanVien = ?', [req.user.MaNhanVien]);
    let isMatch = false;
    if (user.MatKhau.startsWith('$2a$') || user.MatKhau.startsWith('$2b$')) {
      isMatch = bcrypt.compareSync(oldPassword, user.MatKhau);
    } else {
      isMatch = (oldPassword === user.MatKhau);
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác.' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    await run('UPDATE NHAN_VIEN SET MatKhau = ? WHERE MaNhanVien = ?', [hashed, req.user.MaNhanVien]);

    await logAudit(req.user.MaNhanVien, 'ĐỔI MẬT KHẨU', `Nhân viên thay đổi mật khẩu tài khoản cá nhân.`);

    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi đổi mật khẩu.' });
  }
};

module.exports = {
  login,
  getProfile,
  changePassword
};

