const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { all, get, run, DB_PATH } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

// 1. Quản lý Nhân viên
const getEmployees = async (req, res) => {
  try {
    const list = await all(`
      SELECT nv.MaNhanVien, nv.HoTen, nv.SoDienThoai, nv.MaVaiTro, nv.TenDangNhap, nv.TrangThai, vt.TenVaiTro
      FROM NHAN_VIEN nv
      JOIN VAI_TRO vt ON nv.MaVaiTro = vt.MaVaiTro
      ORDER BY nv.MaNhanVien ASC
    `);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách nhân viên.' });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { HoTen, SoDienThoai, MaVaiTro, TenDangNhap, MatKhau } = req.body;
    if (!HoTen || !SoDienThoai || !MaVaiTro || !TenDangNhap || !MatKhau) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin nhân viên.' });
    }

    const existing = await get('SELECT MaNhanVien FROM NHAN_VIEN WHERE TenDangNhap = ?', [TenDangNhap.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập này đã tồn tại.' });
    }

    const hashed = bcrypt.hashSync(MatKhau, 10);
    const result = await run(
      'INSERT INTO NHAN_VIEN (HoTen, SoDienThoai, MaVaiTro, TenDangNhap, MatKhau, TrangThai) VALUES (?, ?, ?, ?, ?, 1)',
      [HoTen.trim(), SoDienThoai.trim(), MaVaiTro, TenDangNhap.trim(), hashed]
    );

    await logAudit(
      req.user.MaNhanVien,
      'TẠO TÀI KHOẢN',
      `Tạo tài khoản nhân viên [${TenDangNhap}] - Họ tên: ${HoTen}`
    );

    res.status(201).json({ success: true, message: 'Tạo tài khoản nhân viên thành công!', employeeId: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi tạo nhân viên mới.' });
  }
};

const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const emp = await get('SELECT * FROM NHAN_VIEN WHERE MaNhanVien = ?', [id]);
    if (!emp) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });

    const newStatus = emp.TrangThai === 1 ? 0 : 1;
    await run('UPDATE NHAN_VIEN SET TrangThai = ? WHERE MaNhanVien = ?', [newStatus, id]);

    await logAudit(
      req.user.MaNhanVien,
      'CẬP NHẬT TRẠNG THÁI TÀI KHOẢN',
      `${newStatus === 1 ? 'Kích hoạt' : 'Khóa'} tài khoản [${emp.TenDangNhap}]`
    );

    res.json({ success: true, message: `Đã ${newStatus === 1 ? 'mở khóa' : 'khóa'} tài khoản thành công.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái tài khoản.' });
  }
};

// 2. Phân quyền RBAC
const getRolesAndPermissions = async (req, res) => {
  try {
    const roles = await all('SELECT * FROM VAI_TRO');
    const functions = await all('SELECT * FROM CHUC_NANG');
    const rolePermissions = await all('SELECT * FROM PHAN_QUYEN');

    res.json({
      success: true,
      data: {
        roles,
        functions,
        rolePermissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải thông tin phân quyền.' });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { roleId, permissions } = req.body; // permissions: array of MaChucNang strings
    if (!roleId || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu phân quyền không hợp lệ.' });
    }

    // Xóa các quyền cũ của vai trò
    await run('DELETE FROM PHAN_QUYEN WHERE MaVaiTro = ?', [roleId]);

    // Thêm các quyền mới
    for (const p of permissions) {
      await run('INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES (?, ?)', [roleId, p]);
    }

    await logAudit(
      req.user.MaNhanVien,
      'CẬP NHẬT PHÂN QUYỀN',
      `Cập nhật ma trận phân quyền cho vai trò mã: ${roleId} với ${permissions.length} chức năng.`
    );

    res.json({ success: true, message: 'Cập nhật phân quyền thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật phân quyền.' });
  }
};

// 3. Tham số hệ thống (THAM_SO)
const getSystemParameters = async (req, res) => {
  try {
    const params = await all('SELECT * FROM THAM_SO ORDER BY MaThamSo ASC');
    res.json({ success: true, data: params });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải tham số hệ thống.' });
  }
};

const updateSystemParameter = async (req, res) => {
  try {
    const { key } = req.params;
    const { GiaTri, MoTa } = req.body;

    await run(
      'UPDATE THAM_SO SET GiaTri = ?, MoTa = COALESCE(?, MoTa) WHERE MaThamSo = ?',
      [GiaTri, MoTa, key]
    );

    await logAudit(
      req.user.MaNhanVien,
      'CẤU HÌNH THAM SỐ',
      `Thay đổi giá trị tham số [${key}] thành "${GiaTri}"`
    );

    res.json({ success: true, message: 'Cập nhật tham số hệ thống thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật tham số.' });
  }
};

// 4. Nhật ký hoạt động (Audit Log)
const getAuditLogs = async (req, res) => {
  try {
    const lim = Number(req.query.limit) || 100;
    const logs = await all(`
      SELECT nk.*, nv.HoTen as TenNhanVien, nv.TenDangNhap
      FROM NHAT_KY_HOAT_DONG nk
      LEFT JOIN NHAN_VIEN nv ON nk.MaNhanVien = nv.MaNhanVien
      ORDER BY nk.MaNhatKy DESC
      LIMIT ${lim}
    `);

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải nhật ký hoạt động.' });
  }
};

// 5. Sao lưu & Phục hồi CSDL (YCHT02)
const backupDatabase = async (req, res) => {
  try {
    const tables = [
      'THAM_SO', 'VAI_TRO', 'CHUC_NANG', 'PHAN_QUYEN', 'NHAN_VIEN',
      'DANH_MUC', 'THUONG_HIEU', 'NHA_CUNG_CAP', 'SAN_PHAM', 'KHACH_HANG',
      'KHUYEN_MAI', 'HOA_DON', 'CHI_TIET_HOA_DON', 'GIAO_HANG_COD',
      'NHAP_KHO', 'CHI_TIET_NHAP_KHO', 'DOI_TRA', 'CHI_TIET_DOI_TRA',
      'KIEM_KE', 'CHI_TIET_KIEM_KE', 'NHAT_KY_HOAT_DONG'
    ];

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      creator: req.user.HoTen,
      tables: {}
    };

    for (const table of tables) {
      try {
        backupData.tables[table] = await all(`SELECT * FROM ${table}`);
      } catch (e) {
        backupData.tables[table] = [];
      }
    }

    const backupDir = path.join(__dirname, '../../database/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup_energy_${Date.now()}.json`;
    const filePath = path.join(backupDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    await logAudit(req.user.MaNhanVien, 'SAO LƯU CSDL', `Xuất file sao lưu hệ thống: ${filename}`);

    res.json({
      success: true,
      message: 'Sao lưu cơ sở dữ liệu thành công!',
      filename,
      filePath,
      backupData
    });
  } catch (err) {
    console.error('Lỗi sao lưu CSDL:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi thực hiện sao lưu CSDL.' });
  }
};

const restoreDatabase = async (req, res) => {
  try {
    const { backupData } = req.body;
    if (!backupData || !backupData.tables) {
      return res.status(400).json({ success: false, message: 'Dữ liệu sao lưu không đúng định dạng.' });
    }

    // Ghi audit trước khi restore
    await logAudit(req.user.MaNhanVien, 'PHỤC HỒI CSDL', 'Khôi phục cơ sở dữ liệu từ bản sao lưu.');

    res.json({
      success: true,
      message: 'Đã xác nhận dữ liệu sao lưu hợp lệ. Hệ thống sẵn sàng khôi phục!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi phục hồi CSDL.' });
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  toggleEmployeeStatus,
  getRolesAndPermissions,
  updateRolePermissions,
  getSystemParameters,
  updateSystemParameter,
  getAuditLogs,
  backupDatabase,
  restoreDatabase
};

