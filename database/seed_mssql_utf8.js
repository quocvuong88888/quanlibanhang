const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: 'energy_app',
  password: 'EnergyPassword123!',
  server: 'localhost',
  instanceName: 'SQLEXPRESS',
  database: 'ENERGY_STORE_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function seedMSSQL() {
  console.log('--- KHỞI TẠO LẠI DỮ LIỆU CHUẨN UTF-8 TRÊN SQL SERVER ---');
  const pool = await new sql.ConnectionPool(config).connect();

  // 1. Drop and recreate tables cleanly to remove computed columns and mojibake
  const ddl = `
    -- Xoa khoa ngoai va bang cu neu co
    IF OBJECT_ID('CHI_TIET_DOI_TRA', 'U') IS NOT NULL DROP TABLE CHI_TIET_DOI_TRA;
    IF OBJECT_ID('DOI_TRA', 'U') IS NOT NULL DROP TABLE DOI_TRA;
    IF OBJECT_ID('CHI_TIET_KIEM_KE', 'U') IS NOT NULL DROP TABLE CHI_TIET_KIEM_KE;
    IF OBJECT_ID('KIEM_KE', 'U') IS NOT NULL DROP TABLE KIEM_KE;
    IF OBJECT_ID('GIAO_HANG_COD', 'U') IS NOT NULL DROP TABLE GIAO_HANG_COD;
    IF OBJECT_ID('CHI_TIET_HOA_DON', 'U') IS NOT NULL DROP TABLE CHI_TIET_HOA_DON;
    IF OBJECT_ID('HOA_DON', 'U') IS NOT NULL DROP TABLE HOA_DON;
    IF OBJECT_ID('CHI_TIET_NHAP_KHO', 'U') IS NOT NULL DROP TABLE CHI_TIET_NHAP_KHO;
    IF OBJECT_ID('NHAP_KHO', 'U') IS NOT NULL DROP TABLE NHAP_KHO;
    IF OBJECT_ID('SAN_PHAM', 'U') IS NOT NULL DROP TABLE SAN_PHAM;
    IF OBJECT_ID('DANH_MUC', 'U') IS NOT NULL DROP TABLE DANH_MUC;
    IF OBJECT_ID('THUONG_HIEU', 'U') IS NOT NULL DROP TABLE THUONG_HIEU;
    IF OBJECT_ID('NHA_CUNG_CAP', 'U') IS NOT NULL DROP TABLE NHA_CUNG_CAP;
    IF OBJECT_ID('KHUYEN_MAI', 'U') IS NOT NULL DROP TABLE KHUYEN_MAI;
    IF OBJECT_ID('KHACH_HANG', 'U') IS NOT NULL DROP TABLE KHACH_HANG;
    IF OBJECT_ID('NHAT_KY_HOAT_DONG', 'U') IS NOT NULL DROP TABLE NHAT_KY_HOAT_DONG;
    IF OBJECT_ID('PHAN_QUYEN', 'U') IS NOT NULL DROP TABLE PHAN_QUYEN;
    IF OBJECT_ID('CHUC_NANG', 'U') IS NOT NULL DROP TABLE CHUC_NANG;
    IF OBJECT_ID('NHAN_VIEN', 'U') IS NOT NULL DROP TABLE NHAN_VIEN;
    IF OBJECT_ID('VAI_TRO', 'U') IS NOT NULL DROP TABLE VAI_TRO;
    IF OBJECT_ID('THAM_SO', 'U') IS NOT NULL DROP TABLE THAM_SO;

    -- 1. DANH_MUC
    CREATE TABLE DANH_MUC (
        MaDanhMuc INT IDENTITY(1,1) PRIMARY KEY,
        TenDanhMuc NVARCHAR(100) NOT NULL
    );

    -- 2. THUONG_HIEU
    CREATE TABLE THUONG_HIEU (
        MaThuongHieu INT IDENTITY(1,1) PRIMARY KEY,
        TenThuongHieu NVARCHAR(100) NOT NULL
    );

    -- 3. SAN_PHAM
    CREATE TABLE SAN_PHAM (
        MaSanPham INT IDENTITY(1,1) PRIMARY KEY,
        TenSanPham NVARCHAR(200) NOT NULL,
        MaDanhMuc INT NOT NULL FOREIGN KEY REFERENCES DANH_MUC(MaDanhMuc),
        MaThuongHieu INT NOT NULL FOREIGN KEY REFERENCES THUONG_HIEU(MaThuongHieu),
        GiaNhap DECIMAL(18,2) NOT NULL DEFAULT 0,
        GiaBanLe DECIMAL(18,2) NOT NULL DEFAULT 0,
        GiaBanSi DECIMAL(18,2) NOT NULL DEFAULT 0,
        SoLuongTon INT NOT NULL DEFAULT 0,
        DonViTinh NVARCHAR(50) DEFAULT N'Cái',
        HinhAnh NVARCHAR(255) NULL
    );

    -- 4. KHACH_HANG
    CREATE TABLE KHACH_HANG (
        MaKhachHang INT IDENTITY(1,1) PRIMARY KEY,
        HoTen NVARCHAR(100) NOT NULL,
        SoDienThoai VARCHAR(15) UNIQUE NOT NULL,
        Email VARCHAR(100) NULL,
        DiaChi NVARCHAR(255) NULL,
        DiemTichLuy INT NOT NULL DEFAULT 0,
        NgayTao DATETIME DEFAULT GETDATE()
    );

    -- 5. VAI_TRO
    CREATE TABLE VAI_TRO (
        MaVaiTro INT IDENTITY(1,1) PRIMARY KEY,
        TenVaiTro NVARCHAR(50) NOT NULL
    );

    -- 6. NHAN_VIEN
    CREATE TABLE NHAN_VIEN (
        MaNhanVien INT IDENTITY(1,1) PRIMARY KEY,
        HoTen NVARCHAR(100) NOT NULL,
        SoDienThoai VARCHAR(15) NOT NULL,
        MaVaiTro INT NOT NULL FOREIGN KEY REFERENCES VAI_TRO(MaVaiTro),
        TenDangNhap VARCHAR(50) UNIQUE NOT NULL,
        MatKhau VARCHAR(255) NOT NULL,
        TrangThai BIT DEFAULT 1
    );

    -- 7. CHUC_NANG
    CREATE TABLE CHUC_NANG (
        MaChucNang VARCHAR(50) PRIMARY KEY,
        TenChucNang NVARCHAR(150) NOT NULL
    );

    -- 8. PHAN_QUYEN
    CREATE TABLE PHAN_QUYEN (
        MaVaiTro INT NOT NULL FOREIGN KEY REFERENCES VAI_TRO(MaVaiTro),
        MaChucNang VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES CHUC_NANG(MaChucNang),
        PRIMARY KEY (MaVaiTro, MaChucNang)
    );

    -- 9. NHAT_KY_HOAT_DONG
    CREATE TABLE NHAT_KY_HOAT_DONG (
        MaNhatKy INT IDENTITY(1,1) PRIMARY KEY,
        MaNhanVien INT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
        HanhDong NVARCHAR(255) NOT NULL,
        ThoiGian DATETIME DEFAULT GETDATE(),
        ChiTiet NVARCHAR(MAX) NULL
    );

    -- 10. KHUYEN_MAI
    CREATE TABLE KHUYEN_MAI (
        MaKhuyenMai INT IDENTITY(1,1) PRIMARY KEY,
        MaCode VARCHAR(20) UNIQUE NOT NULL,
        TenKhuyenMai NVARCHAR(100) NOT NULL,
        PhanTramGiam INT NOT NULL,
        NgayBatDau DATETIME NOT NULL,
        NgayKetThuc DATETIME NOT NULL,
        TrangThai NVARCHAR(50) DEFAULT N'Đang hoạt động'
    );

    -- 11. HOA_DON
    CREATE TABLE HOA_DON (
        MaHoaDon INT IDENTITY(1,1) PRIMARY KEY,
        NgayLap DATETIME DEFAULT GETDATE(),
        MaKhachHang INT NULL FOREIGN KEY REFERENCES KHACH_HANG(MaKhachHang),
        MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
        MaKhuyenMai INT NULL FOREIGN KEY REFERENCES KHUYEN_MAI(MaKhuyenMai),
        TongTienHang DECIMAL(18,2) DEFAULT 0,
        SoTienGiam DECIMAL(18,2) DEFAULT 0,
        TongTien DECIMAL(18,2) NOT NULL DEFAULT 0,
        TienKhachDua DECIMAL(18,2) DEFAULT 0,
        TienThoiLai DECIMAL(18,2) DEFAULT 0,
        DiemCongThem INT DEFAULT 0,
        HinhThucThanhToan NVARCHAR(50) DEFAULT N'Tiền mặt',
        GhiChu NVARCHAR(255) NULL
    );

    -- 12. CHI_TIET_HOA_DON (ThanhTien khong phai computed column de ho tro insert linh hoat)
    CREATE TABLE CHI_TIET_HOA_DON (
        MaHoaDon INT NOT NULL FOREIGN KEY REFERENCES HOA_DON(MaHoaDon) ON DELETE CASCADE,
        MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
        SoLuong INT NOT NULL,
        DonGia DECIMAL(18,2) NOT NULL,
        LoaiGia NVARCHAR(20) DEFAULT N'Giá lẻ',
        ThanhTien DECIMAL(18,2) NOT NULL DEFAULT 0,
        PRIMARY KEY (MaHoaDon, MaSanPham)
    );

    -- 13. GIAO_HANG_COD
    CREATE TABLE GIAO_HANG_COD (
        MaGiaoHang INT IDENTITY(1,1) PRIMARY KEY,
        MaHoaDon INT NOT NULL FOREIGN KEY REFERENCES HOA_DON(MaHoaDon),
        DonViVanChuyen NVARCHAR(100) DEFAULT N'Giao Hàng Nhanh',
        MaTracking VARCHAR(50) NULL,
        DiaChiGiao NVARCHAR(255) NOT NULL,
        TienThuHo DECIMAL(18,2) NOT NULL DEFAULT 0,
        TrangThai NVARCHAR(50) DEFAULT N'Đang giao',
        NgayDoiSoat DATETIME NULL,
        GhiChu NVARCHAR(255) NULL
    );

    -- 14. THAM_SO
    CREATE TABLE THAM_SO (
        MaThamSo VARCHAR(50) PRIMARY KEY,
        GiaTri NVARCHAR(255) NOT NULL,
        MoTa NVARCHAR(255) NULL
    );

    -- 15. NHA_CUNG_CAP
    CREATE TABLE NHA_CUNG_CAP (
        MaNCC INT IDENTITY(1,1) PRIMARY KEY,
        TenNCC NVARCHAR(150) NOT NULL,
        SoDienThoai VARCHAR(15) NULL,
        Email VARCHAR(100) NULL,
        DiaChi NVARCHAR(255) NULL
    );

    -- 16. NHAP_KHO
    CREATE TABLE NHAP_KHO (
        MaPhieuNhap INT IDENTITY(1,1) PRIMARY KEY,
        NgayNhap DATETIME DEFAULT GETDATE(),
        MaNCC INT NOT NULL FOREIGN KEY REFERENCES NHA_CUNG_CAP(MaNCC),
        MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
        TongTienNhap DECIMAL(18,2) NOT NULL DEFAULT 0,
        TrangThaiDuyet NVARCHAR(50) DEFAULT N'Đã duyệt',
        GhiChu NVARCHAR(255) NULL
    );

    -- 17. CHI_TIET_NHAP_KHO
    CREATE TABLE CHI_TIET_NHAP_KHO (
        MaPhieuNhap INT NOT NULL FOREIGN KEY REFERENCES NHAP_KHO(MaPhieuNhap) ON DELETE CASCADE,
        MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
        SoLuongNhap INT NOT NULL,
        GiaNhap DECIMAL(18,2) NOT NULL,
        PRIMARY KEY (MaPhieuNhap, MaSanPham)
    );

    -- 18. DOI_TRA
    CREATE TABLE DOI_TRA (
        MaDoiTra INT IDENTITY(1,1) PRIMARY KEY,
        MaHoaDon INT NOT NULL FOREIGN KEY REFERENCES HOA_DON(MaHoaDon),
        MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
        NgayDoiTra DATETIME DEFAULT GETDATE(),
        LyDo NVARCHAR(255) NOT NULL,
        TongTienHoan DECIMAL(18,2) DEFAULT 0,
        DiemTru INT DEFAULT 0
    );

    -- 19. CHI_TIET_DOI_TRA
    CREATE TABLE CHI_TIET_DOI_TRA (
        MaDoiTra INT NOT NULL FOREIGN KEY REFERENCES DOI_TRA(MaDoiTra) ON DELETE CASCADE,
        MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
        SoLuongDoiTra INT NOT NULL,
        DonGiaHoan DECIMAL(18,2) NOT NULL,
        PRIMARY KEY (MaDoiTra, MaSanPham)
    );

    -- 20. KIEM_KE
    CREATE TABLE KIEM_KE (
        MaKiemKe INT IDENTITY(1,1) PRIMARY KEY,
        NgayKiemKe DATETIME DEFAULT GETDATE(),
        MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
        TongChenhLechSL INT DEFAULT 0,
        GhiChu NVARCHAR(255) NULL,
        TrangThai NVARCHAR(50) DEFAULT N'Hoàn tất'
    );

    -- 21. CHI_TIET_KIEM_KE (ChenhLech luu truc tiep)
    CREATE TABLE CHI_TIET_KIEM_KE (
        MaKiemKe INT NOT NULL FOREIGN KEY REFERENCES KIEM_KE(MaKiemKe) ON DELETE CASCADE,
        MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
        SoLuongHeThong INT NOT NULL,
        SoLuongThucTe INT NOT NULL,
        ChenhLech INT NOT NULL DEFAULT 0,
        PRIMARY KEY (MaKiemKe, MaSanPham)
    );
  `;

  console.log('Đang tạo lại cấu trúc bảng chuẩn trên SQL Server...');
  await pool.request().query(ddl);
  console.log('✓ Đã tạo thành công các bảng dữ liệu.');

  // 2. Chèn dữ liệu mẫu chuẩn UTF-8
  console.log('Đang nạp dữ liệu mẫu UTF-8 chuẩn xác...');

  // Tham số
  const params = [
    ['TEN_CUA_HANG', 'CÔNG TY TNHH THỂ THAO ENERGY', 'Tên thương hiệu doanh nghiệp'],
    ['DIA_CHI', '280 An Dương Vương, Phường 4, Quận 5, TP.HCM', 'Địa chỉ cửa hàng chính'],
    ['HOTLINE', '0901 888 999', 'Đường dây nóng hỗ trợ khách hàng'],
    ['HAN_MUC_DUYET_NHAP', '20000000', 'Hạn mức giá trị phiếu nhập kho cần Giám đốc phê duyệt (VNĐ) - QD05'],
    ['TI_LE_TICH_DIEM', '0.01', 'Tỷ lệ tích điểm cho khách hàng (1% giá trị hóa đơn) - QD02'],
    ['HAN_DOI_TRA_NGAY', '7', 'Số ngày tối đa cho phép đổi trả hàng hóa - QD02'],
    ['TI_LE_LECH_KHO_DUYET', '0.02', 'Tỷ lệ lệch kiểm kê kho cần Giám đốc duyệt (2%) - QD03']
  ];
  for (const p of params) {
    const req = pool.request();
    req.input('k', sql.VarChar(50), p[0]);
    req.input('v', sql.NVarChar(255), p[1]);
    req.input('d', sql.NVarChar(255), p[2]);
    await req.query('INSERT INTO THAM_SO (MaThamSo, GiaTri, MoTa) VALUES (@k, @v, @d)');
  }

  // Vai trò
  const roles = ['Giám đốc', 'Thu ngân', 'Thủ kho', 'Kế toán', 'Quản trị viên'];
  for (const r of roles) {
    const req = pool.request();
    req.input('r', sql.NVarChar(50), r);
    await req.query('INSERT INTO VAI_TRO (TenVaiTro) VALUES (@r)');
  }

  // Chức năng
  const funcs = [
    ['BAN_HANG', 'Bán hàng tại quầy và online'],
    ['DOI_TRA', 'Đổi trả hàng hóa'],
    ['TRA_CUU_SP', 'Tra cứu sản phẩm và giá bán'],
    ['QUAN_LY_KHO', 'Quản lý sản phẩm và danh mục'],
    ['NHAP_KHO', 'Lập phiếu nhập kho'],
    ['DUYET_NHAP_KHO', 'Duyệt phiếu nhập kho vượt hạn mức'],
    ['KIEM_KE', 'Kiểm kê kho hàng định kỳ'],
    ['KHACH_HANG', 'Quản lý danh sách khách hàng và tích điểm'],
    ['KHUYEN_MAI', 'Quản lý chương trình khuyến mãi'],
    ['DUYET_KHUYEN_MAI', 'Phê duyệt đợt khuyến mãi'],
    ['DOI_SOAT_COD', 'Đối soát thanh toán COD và chuyển khoản'],
    ['BAO_CAO_DOANH_THU', 'Xem báo cáo doanh thu và tài chính'],
    ['BAO_CAO_TON_KHO', 'Xem báo cáo tồn kho'],
    ['QUAN_TRI_HE_THONG', 'Quản trị tài khoản, phân quyền và tham số'],
    ['AUDIT_LOG', 'Xem nhật ký hoạt động hệ thống'],
    ['BACKUP_RESTORE', 'Sao lưu và phục hồi dữ liệu']
  ];
  for (const f of funcs) {
    const req = pool.request();
    req.input('c', sql.VarChar(50), f[0]);
    req.input('n', sql.NVarChar(150), f[1]);
    await req.query('INSERT INTO CHUC_NANG (MaChucNang, TenChucNang) VALUES (@c, @n)');
  }

  // Phân quyền
  for (const f of funcs) {
    await pool.request().query(`INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES (1, '${f[0]}')`);
  }
  for (const f of ['BAN_HANG', 'DOI_TRA', 'TRA_CUU_SP', 'KHACH_HANG']) {
    await pool.request().query(`INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES (2, '${f}')`);
  }
  for (const f of ['QUAN_LY_KHO', 'NHAP_KHO', 'KIEM_KE', 'TRA_CUU_SP', 'BAO_CAO_TON_KHO']) {
    await pool.request().query(`INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES (3, '${f}')`);
  }
  for (const f of ['DOI_SOAT_COD', 'BAO_CAO_DOANH_THU', 'TRA_CUU_SP']) {
    await pool.request().query(`INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES (4, '${f}')`);
  }
  for (const f of ['QUAN_TRI_HE_THONG', 'AUDIT_LOG', 'BACKUP_RESTORE', 'TRA_CUU_SP']) {
    await pool.request().query(`INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES (5, '${f}')`);
  }

  // Nhân viên (Dùng hash Bcrypt thật cho mật khẩu '123456')
  const validHash = bcrypt.hashSync('123456', 10);
  const employees = [
    ['Hoàng Nam Thanh Tiến Quốc Vượng', '0912345678', 1, 'giamdoc', validHash],
    ['Đỗ Chí An', '0923456789', 2, 'thungan', validHash],
    ['Nguyễn Thái Dương', '0934567890', 3, 'thukho', validHash],
    ['Phạm Thành Thuật', '0945678901', 4, 'ketoan', validHash],
    ['Quản trị viên Hệ thống', '0956789012', 5, 'admin', validHash]
  ];
  for (const e of employees) {
    const req = pool.request();
    req.input('ht', sql.NVarChar(100), e[0]);
    req.input('sdt', sql.VarChar(15), e[1]);
    req.input('vt', sql.Int, e[2]);
    req.input('user', sql.VarChar(50), e[3]);
    req.input('pass', sql.VarChar(255), e[4]);
    await req.query('INSERT INTO NHAN_VIEN (HoTen, SoDienThoai, MaVaiTro, TenDangNhap, MatKhau) VALUES (@ht, @sdt, @vt, @user, @pass)');
  }

  // Danh mục
  const cats = [
    'Vợt Cầu Lông & Phụ kiện',
    'Giày Thể Thao',
    'Bóng Đá & Futsal',
    'Quần Áo Thể Thao',
    'Dụng cụ Tennis & Bóng bàn',
    'Phụ kiện & Bình nước'
  ];
  for (const c of cats) {
    const req = pool.request();
    req.input('c', sql.NVarChar(100), c);
    await req.query('INSERT INTO DANH_MUC (TenDanhMuc) VALUES (@c)');
  }

  // Thương hiệu
  const brands = ['Yonex', 'Victor', 'Lining', 'Nike', 'Adidas', 'Puma', 'Wilson', 'Molten'];
  for (const b of brands) {
    const req = pool.request();
    req.input('b', sql.NVarChar(100), b);
    await req.query('INSERT INTO THUONG_HIEU (TenThuongHieu) VALUES (@b)');
  }

  // Nhà cung cấp
  const suppliers = [
    ['Tổng Kho Thể Thao Sunrise Sports', '02838351234', 'sales@sunrisesports.vn', 'Quận 10, TP.HCM'],
    ['Công Ty TNHH Nike Việt Nam Phân Phối', '02839998888', 'contact@nike-distributor.vn', 'Khu chế xuất Tân Thuận, Quận 7, TP.HCM'],
    ['Đại Lý Phân Phối Yonex Sunrise VN', '02837776666', 'yonex@sunrise.com.sg', 'Quận Tân Bình, TP.HCM']
  ];
  for (const s of suppliers) {
    const req = pool.request();
    req.input('t', sql.NVarChar(150), s[0]);
    req.input('sd', sql.VarChar(15), s[1]);
    req.input('em', sql.VarChar(100), s[2]);
    req.input('dc', sql.NVarChar(255), s[3]);
    await req.query('INSERT INTO NHA_CUNG_CAP (TenNCC, SoDienThoai, Email, DiaChi) VALUES (@t, @sd, @em, @dc)');
  }

  // Sản phẩm dụng cụ thể thao chuẩn UTF-8 tiếng Việt
  const products = [
    ['Vợt Cầu Lông Yonex Astrox 88D Pro', 1, 1, 3100000, 3950000, 3550000, 35, 'Cây'],
    ['Vợt Cầu Lông Victor Thruster K 9900', 1, 2, 2200000, 2890000, 2600000, 20, 'Cây'],
    ['Vợt Cầu Lông Lining Axforce 80', 1, 3, 2900000, 3650000, 3300000, 15, 'Cây'],
    ['Giày Cầu Lông Yonex 65Z3 Trắng', 2, 1, 1850000, 2450000, 2200000, 42, 'Đôi'],
    ['Giày Chạy Bộ Nike Pegasus 40', 2, 4, 2100000, 2990000, 2700000, 28, 'Đôi'],
    ['Giày Bóng Đá Adidas Predator Elite', 2, 5, 2300000, 3200000, 2900000, 18, 'Đôi'],
    ['Quả Bóng Đá Molten Vantaggio 5000 FIFA Quality Pro', 3, 8, 850000, 1250000, 1050000, 60, 'Quả'],
    ['Áo Thi Đấu Cầu Lông Yonex Tournament 2026', 4, 1, 220000, 350000, 290000, 85, 'Cái'],
    ['Quần Thể Thao Nike Dri-FIT Co Giãn', 4, 4, 310000, 480000, 420000, 50, 'Cái'],
    ['Hộp 12 Quả Cầu Lông Victor Master No.1', 1, 2, 280000, 380000, 340000, 120, 'Ống'],
    ['Vợt Tennis Wilson Clash 100 V2', 5, 7, 3600000, 4750000, 4300000, 12, 'Cây'],
    ['Bình Nước Giữ Nhiệt Thể Thao Nike 750ml', 6, 4, 190000, 320000, 270000, 4, 'Cái']
  ];

  for (const p of products) {
    const req = pool.request();
    req.input('name', sql.NVarChar(200), p[0]);
    req.input('cat', sql.Int, p[1]);
    req.input('brand', sql.Int, p[2]);
    req.input('cost', sql.Decimal(18, 2), p[3]);
    req.input('retail', sql.Decimal(18, 2), p[4]);
    req.input('wholesale', sql.Decimal(18, 2), p[5]);
    req.input('stock', sql.Int, p[6]);
    req.input('unit', sql.NVarChar(50), p[7]);
    await req.query(`
      INSERT INTO SAN_PHAM (TenSanPham, MaDanhMuc, MaThuongHieu, GiaNhap, GiaBanLe, GiaBanSi, SoLuongTon, DonViTinh)
      VALUES (@name, @cat, @brand, @cost, @retail, @wholesale, @stock, @unit)
    `);
  }

  // Khách hàng
  const customers = [
    ['Trần Minh Tuấn', '0903112233', 'minhtuan@gmail.com', 'Quận 1, TP.HCM', 150],
    ['Lê Thị Hương', '0918445566', 'huongle@gmail.com', 'Quận 3, TP.HCM', 80],
    ['CLB Thể Thao Sao Vàng (Khách Sỉ)', '0988776655', 'saovangclub@gmail.com', 'Quận Phú Nhuận, TP.HCM', 1200]
  ];
  for (const c of customers) {
    const req = pool.request();
    req.input('ht', sql.NVarChar(100), c[0]);
    req.input('sdt', sql.VarChar(15), c[1]);
    req.input('em', sql.VarChar(100), c[2]);
    req.input('dc', sql.NVarChar(255), c[3]);
    req.input('d', sql.Int, c[4]);
    await req.query('INSERT INTO KHACH_HANG (HoTen, SoDienThoai, Email, DiaChi, DiemTichLuy) VALUES (@ht, @sdt, @em, @dc, @d)');
  }

  // Khuyến mãi
  const promotions = [
    ['ENERGY10', 'Chào Bạn Mới - Giảm 10%', 10, '2026-01-01', '2026-12-31'],
    ['SUMMERSPORT', 'Mùa Hè Năng Động - Giảm 15%', 15, '2026-05-01', '2026-08-31']
  ];
  for (const pr of promotions) {
    const req = pool.request();
    req.input('code', sql.VarChar(20), pr[0]);
    req.input('name', sql.NVarChar(100), pr[1]);
    req.input('pct', sql.Int, pr[2]);
    req.input('s', sql.DateTime, new Date(pr[3]));
    req.input('e', sql.DateTime, new Date(pr[4]));
    await req.query(`
      INSERT INTO KHUYEN_MAI (MaCode, TenKhuyenMai, PhanTramGiam, NgayBatDau, NgayKetThuc, TrangThai)
      VALUES (@code, @name, @pct, @s, @e, N'Đang hoạt động')
    `);
  }

  // Hóa đơn mẫu & Vận đơn COD mẫu
  const reqInv = pool.request();
  const invRes = await reqInv.query(`
    INSERT INTO HOA_DON (NgayLap, MaKhachHang, MaNhanVien, MaKhuyenMai, TongTienHang, SoTienGiam, TongTien, TienKhachDua, TienThoiLai, DiemCongThem, HinhThucThanhToan, GhiChu)
    VALUES (DATEADD(day, -2, GETDATE()), 1, 2, 1, 3950000, 395000, 3555000, 4000000, 445000, 35, N'Tiền mặt', N'Đơn hàng bán lẻ mẫu');
    SELECT SCOPE_IDENTITY() as id;
  `);
  const invoiceId = invRes.recordset[0].id;
  await pool.request().query(`
    INSERT INTO CHI_TIET_HOA_DON (MaHoaDon, MaSanPham, SoLuong, DonGia, LoaiGia, ThanhTien)
    VALUES (${invoiceId}, 1, 1, 3950000, N'Giá lẻ', 3950000)
  `);

  // Đơn COD mẫu
  const reqCod = pool.request();
  const codRes = await reqCod.query(`
    INSERT INTO HOA_DON (NgayLap, MaKhachHang, MaNhanVien, TongTienHang, SoTienGiam, TongTien, TienKhachDua, TienThoiLai, DiemCongThem, HinhThucThanhToan, GhiChu)
    VALUES (DATEADD(day, -1, GETDATE()), 2, 2, 2450000, 0, 2450000, 0, 0, 24, N'COD', N'Đơn giao hàng online COD');
    SELECT SCOPE_IDENTITY() as id;
  `);
  const codInvId = codRes.recordset[0].id;
  await pool.request().query(`
    INSERT INTO CHI_TIET_HOA_DON (MaHoaDon, MaSanPham, SoLuong, DonGia, LoaiGia, ThanhTien)
    VALUES (${codInvId}, 4, 1, 2450000, N'Giá lẻ', 2450000);
    INSERT INTO GIAO_HANG_COD (MaHoaDon, DonViVanChuyen, MaTracking, DiaChiGiao, TienThuHo, TrangThai, GhiChu)
    VALUES (${codInvId}, N'Giao Hàng Nhanh', 'GHN9823412', N'12 Nguyễn Trãi, Q.5, TP.HCM', 2450000, N'Đang giao', N'Giao giờ hành chính');
  `);

  // Phiếu nhập kho mẫu (> 20M: Chờ Giám đốc duyệt theo QD05)
  const reqPr = pool.request();
  const prRes = await reqPr.query(`
    INSERT INTO NHAP_KHO (NgayNhap, MaNCC, MaNhanVien, TongTienNhap, TrangThaiDuyet, GhiChu)
    VALUES (DATEADD(hour, -2, GETDATE()), 2, 3, 42000000, N'Chờ Giám đốc duyệt', N'Nhập lô giày Nike Pegasus 40 số lượng lớn (vượt hạn mức 20M)');
    SELECT SCOPE_IDENTITY() as id;
  `);
  const prId = prRes.recordset[0].id;
  await pool.request().query(`
    INSERT INTO CHI_TIET_NHAP_KHO (MaPhieuNhap, MaSanPham, SoLuongNhap, GiaNhap)
    VALUES (${prId}, 5, 20, 2100000)
  `);

  // Audit log ban đầu
  await pool.request().query(`
    INSERT INTO NHAT_KY_HOAT_DONG (MaNhanVien, HanhDong, ChiTiet)
    VALUES (1, N'KHỞI TẠO CSDL', N'Khởi tạo thành công CSDL ENERGY_STORE_DB với font tiếng Việt Unicode chuẩn UTF-8.')
  `);

  console.log('✓ HOÀN TẤT NẠP DỮ LIỆU CHUẨN UTF-8 TRÊN SQL SERVER!');
  await pool.close();
}

seedMSSQL().catch(err => {
  console.error('Lỗi khi nạp dữ liệu:', err);
  process.exit(1);
});

