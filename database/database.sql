-- =========================================================================================
-- HỌC PHẦN: NHẬP MÔN CÔNG NGHỆ PHẦN MỀM - KHOA CÔNG NGHỆ THÔNG TIN
-- TRƯỜNG ĐẠI HỌC SƯ PHẠM THÀNH PHỐ HỒ CHÍ MINH (HCMUE)
-- ĐỀ TÀI: HỆ THỐNG QUẢN LÝ BÁN HÀNG DỤNG CỤ THỂ THAO (CÔNG TY ENERGY)
-- NHÓM THỰC HIỆN: ENERGY
-- BÀI LAB 3: THIẾT KẾ CƠ SỞ DỮ LIỆU TOÀN DIỆN (FULL DDL & DML SCRIPT)
-- HỆ QUẢN TRỊ CSDL: MICROSOFT SQL SERVER 2008 R2 / 2019 / 2022
-- =========================================================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'ENERGY_STORE_DB')
BEGIN
    ALTER DATABASE ENERGY_STORE_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ENERGY_STORE_DB;
END
GO

CREATE DATABASE ENERGY_STORE_DB;
GO

USE ENERGY_STORE_DB;
GO

-- =========================================================================================
-- 1. BẢNG PHÂN HỆ DANH MỤC & THƯƠNG HIỆU
-- =========================================================================================

-- 1.1 Bảng DANH_MUC
CREATE TABLE DANH_MUC (
    MaDanhMuc INT IDENTITY(1,1) PRIMARY KEY,
    TenDanhMuc NVARCHAR(100) NOT NULL
);
GO

-- 1.2 Bảng THUONG_HIEU
CREATE TABLE THUONG_HIEU (
    MaThuongHieu INT IDENTITY(1,1) PRIMARY KEY,
    TenThuongHieu NVARCHAR(100) NOT NULL
);
GO

-- =========================================================================================
-- 2. BẢNG SẢN PHẨM (Áp dụng QD01: Giá bán lẻ khi SL < 10, Giá bán sỉ khi SL >= 10)
-- =========================================================================================
CREATE TABLE SAN_PHAM (
    MaSanPham INT IDENTITY(1,1) PRIMARY KEY,
    TenSanPham NVARCHAR(200) NOT NULL,
    MaDanhMuc INT NOT NULL FOREIGN KEY REFERENCES DANH_MUC(MaDanhMuc),
    MaThuongHieu INT NOT NULL FOREIGN KEY REFERENCES THUONG_HIEU(MaThuongHieu),
    GiaNhap DECIMAL(18,2) NOT NULL CHECK (GiaNhap >= 0),
    GiaBanLe DECIMAL(18,2) NOT NULL CHECK (GiaBanLe >= 0),
    GiaBanSi DECIMAL(18,2) NOT NULL CHECK (GiaBanSi >= 0),
    SoLuongTon INT NOT NULL DEFAULT 0 CHECK (SoLuongTon >= 0),
    DonViTinh NVARCHAR(50) DEFAULT N'Cái',
    HinhAnh NVARCHAR(255) NULL
);
GO

-- =========================================================================================
-- 3. BẢNG KHÁCH HÀNG & TÍCH ĐIỂM (Áp dụng QD02: Tích 1% giá trị đơn hàng)
-- =========================================================================================
CREATE TABLE KHACH_HANG (
    MaKhachHang INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(15) UNIQUE NOT NULL,
    Email VARCHAR(100) NULL,
    DiaChi NVARCHAR(255) NULL,
    DiemTichLuy INT NOT NULL DEFAULT 0 CHECK (DiemTichLuy >= 0),
    NgayTao DATETIME DEFAULT GETDATE()
);
GO

-- =========================================================================================
-- 4. BẢNG VAI TRÒ, NHÂN VIÊN, CHỨC NĂNG & PHÂN QUYỀN (Mô hình RBAC)
-- =========================================================================================
CREATE TABLE VAI_TRO (
    MaVaiTro INT IDENTITY(1,1) PRIMARY KEY,
    TenVaiTro NVARCHAR(50) NOT NULL
);
GO

CREATE TABLE NHAN_VIEN (
    MaNhanVien INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(15) NOT NULL,
    MaVaiTro INT NOT NULL FOREIGN KEY REFERENCES VAI_TRO(MaVaiTro),
    TenDangNhap VARCHAR(50) UNIQUE NOT NULL,
    MatKhau VARCHAR(255) NOT NULL,
    TrangThai BIT DEFAULT 1
);
GO

CREATE TABLE CHUC_NANG (
    MaChucNang VARCHAR(50) PRIMARY KEY,
    TenChucNang NVARCHAR(150) NOT NULL
);
GO

CREATE TABLE PHAN_QUYEN (
    MaVaiTro INT NOT NULL FOREIGN KEY REFERENCES VAI_TRO(MaVaiTro),
    MaChucNang VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES CHUC_NANG(MaChucNang),
    PRIMARY KEY (MaVaiTro, MaChucNang)
);
GO

-- =========================================================================================
-- 5. BẢNG NHẬT KÝ HOẠT ĐỘNG (Audit Trail)
-- =========================================================================================
CREATE TABLE NHAT_KY_HOAT_DONG (
    MaNhatKy INT IDENTITY(1,1) PRIMARY KEY,
    MaNhanVien INT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
    HanhDong NVARCHAR(255) NOT NULL,
    ThoiGian DATETIME DEFAULT GETDATE(),
    ChiTiet NVARCHAR(MAX) NULL
);
GO

-- =========================================================================================
-- 6. BẢNG KHUYẾN MÃI (Áp dụng QD05: Giám đốc phê duyệt khuyến mãi)
-- =========================================================================================
CREATE TABLE KHUYEN_MAI (
    MaKhuyenMai INT IDENTITY(1,1) PRIMARY KEY,
    MaCode VARCHAR(20) UNIQUE NOT NULL,
    TenKhuyenMai NVARCHAR(100) NOT NULL,
    PhanTramGiam INT NOT NULL CHECK (PhanTramGiam BETWEEN 1 AND 100),
    NgayBatDau DATETIME NOT NULL,
    NgayKetThuc DATETIME NOT NULL,
    TrangThai NVARCHAR(50) DEFAULT N'Đang hoạt động'
);
GO

-- =========================================================================================
-- 7. BẢNG HÓA ĐƠN & CHI TIẾT HÓA ĐƠN (BM01)
-- =========================================================================================
CREATE TABLE HOA_DON (
    MaHoaDon INT IDENTITY(1,1) PRIMARY KEY,
    NgayLap DATETIME DEFAULT GETDATE(),
    MaKhachHang INT NULL FOREIGN KEY REFERENCES KHACH_HANG(MaKhachHang),
    MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
    MaKhuyenMai INT NULL FOREIGN KEY REFERENCES KHUYEN_MAI(MaKhuyenMai),
    TongTienHang DECIMAL(18,2) DEFAULT 0 CHECK (TongTienHang >= 0),
    SoTienGiam DECIMAL(18,2) DEFAULT 0 CHECK (SoTienGiam >= 0),
    TongTien DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (TongTien >= 0),
    TienKhachDua DECIMAL(18,2) DEFAULT 0 CHECK (TienKhachDua >= 0),
    TienThoiLai DECIMAL(18,2) DEFAULT 0 CHECK (TienThoiLai >= 0),
    DiemCongThem INT DEFAULT 0,
    HinhThucThanhToan NVARCHAR(50) DEFAULT N'Tiền mặt',
    GhiChu NVARCHAR(255) NULL
);
GO

CREATE TABLE CHI_TIET_HOA_DON (
    MaHoaDon INT NOT NULL FOREIGN KEY REFERENCES HOA_DON(MaHoaDon) ON DELETE CASCADE,
    MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
    SoLuong INT NOT NULL CHECK (SoLuong > 0),
    DonGia DECIMAL(18,2) NOT NULL CHECK (DonGia >= 0),
    LoaiGia NVARCHAR(20) DEFAULT N'Giá lẻ', -- 'Giá lẻ' hoặc 'Giá sỉ'
    ThanhTien AS (SoLuong * DonGia),
    PRIMARY KEY (MaHoaDon, MaSanPham)
);
GO

-- =========================================================================================
-- 8. BẢNG GIAO HÀNG & ĐỐI SOÁT COD (BM05 & QD04)
-- =========================================================================================
CREATE TABLE GIAO_HANG_COD (
    MaGiaoHang INT IDENTITY(1,1) PRIMARY KEY,
    MaHoaDon INT NOT NULL FOREIGN KEY REFERENCES HOA_DON(MaHoaDon),
    DonViVanChuyen NVARCHAR(100) DEFAULT N'Giao Hàng Nhanh',
    MaTracking VARCHAR(50) NULL,
    DiaChiGiao NVARCHAR(255) NOT NULL,
    TienThuHo DECIMAL(18,2) NOT NULL CHECK (TienThuHo >= 0),
    TrangThai NVARCHAR(50) DEFAULT N'Đang giao', -- 'Đang giao', 'Thành công', 'Hủy/Hoàn trả', 'Đã đối soát'
    NgayDoiSoat DATETIME NULL,
    GhiChu NVARCHAR(255) NULL
);
GO

-- =========================================================================================
-- 9. BẢNG THAM SỐ CẤU HÌNH HỆ THỐNG
-- =========================================================================================
CREATE TABLE THAM_SO (
    MaThamSo VARCHAR(50) PRIMARY KEY,
    GiaTri NVARCHAR(255) NOT NULL,
    MoTa NVARCHAR(255) NULL
);
GO

-- =========================================================================================
-- 10. BẢNG NHÀ CUNG CẤP & NHẬP KHO (BM02 & QD03, QD05)
-- =========================================================================================
CREATE TABLE NHA_CUNG_CAP (
    MaNCC INT IDENTITY(1,1) PRIMARY KEY,
    TenNCC NVARCHAR(150) NOT NULL,
    SoDienThoai VARCHAR(15) NULL,
    Email VARCHAR(100) NULL,
    DiaChi NVARCHAR(255) NULL
);
GO

CREATE TABLE NHAP_KHO (
    MaPhieuNhap INT IDENTITY(1,1) PRIMARY KEY,
    NgayNhap DATETIME DEFAULT GETDATE(),
    MaNCC INT NOT NULL FOREIGN KEY REFERENCES NHA_CUNG_CAP(MaNCC),
    MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
    TongTienNhap DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (TongTienNhap >= 0),
    TrangThaiDuyet NVARCHAR(50) DEFAULT N'Đã duyệt', -- 'Đã duyệt', 'Chờ Giám đốc duyệt', 'Bị từ chối'
    GhiChu NVARCHAR(255) NULL
);
GO

CREATE TABLE CHI_TIET_NHAP_KHO (
    MaPhieuNhap INT NOT NULL FOREIGN KEY REFERENCES NHAP_KHO(MaPhieuNhap) ON DELETE CASCADE,
    MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
    SoLuongNhap INT NOT NULL CHECK (SoLuongNhap > 0),
    GiaNhap DECIMAL(18,2) NOT NULL CHECK (GiaNhap >= 0),
    PRIMARY KEY (MaPhieuNhap, MaSanPham)
);
GO

-- =========================================================================================
-- 11. BẢNG ĐỔI TRẢ HÀNG & KIỂM KÊ KHO (QD02, QD03)
-- =========================================================================================
CREATE TABLE DOI_TRA (
    MaDoiTra INT IDENTITY(1,1) PRIMARY KEY,
    MaHoaDon INT NOT NULL FOREIGN KEY REFERENCES HOA_DON(MaHoaDon),
    MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
    NgayDoiTra DATETIME DEFAULT GETDATE(),
    LyDo NVARCHAR(255) NOT NULL,
    TongTienHoan DECIMAL(18,2) DEFAULT 0,
    DiemTru INT DEFAULT 0
);
GO

CREATE TABLE CHI_TIET_DOI_TRA (
    MaDoiTra INT NOT NULL FOREIGN KEY REFERENCES DOI_TRA(MaDoiTra) ON DELETE CASCADE,
    MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
    SoLuongDoiTra INT NOT NULL CHECK (SoLuongDoiTra > 0),
    DonGiaHoan DECIMAL(18,2) NOT NULL CHECK (DonGiaHoan >= 0),
    PRIMARY KEY (MaDoiTra, MaSanPham)
);
GO

CREATE TABLE KIEM_KE (
    MaKiemKe INT IDENTITY(1,1) PRIMARY KEY,
    NgayKiemKe DATETIME DEFAULT GETDATE(),
    MaNhanVien INT NOT NULL FOREIGN KEY REFERENCES NHAN_VIEN(MaNhanVien),
    TongChenhLechSL INT DEFAULT 0,
    GhiChu NVARCHAR(255) NULL,
    TrangThai NVARCHAR(50) DEFAULT N'Hoàn tất' -- 'Hoàn tất', 'Chờ Giám đốc duyệt lệch > 2%'
);
GO

CREATE TABLE CHI_TIET_KIEM_KE (
    MaKiemKe INT NOT NULL FOREIGN KEY REFERENCES KIEM_KE(MaKiemKe) ON DELETE CASCADE,
    MaSanPham INT NOT NULL FOREIGN KEY REFERENCES SAN_PHAM(MaSanPham),
    SoLuongHeThong INT NOT NULL,
    SoLuongThucTe INT NOT NULL,
    ChenhLech AS (SoLuongThucTe - SoLuongHeThong),
    PRIMARY KEY (MaKiemKe, MaSanPham)
);
GO

-- =========================================================================================
-- 12. CHÈN DỮ LIỆU BAN ĐẦU (SEED DATA CHUẨN)
-- =========================================================================================

-- 12.1 THAM SỐ HỆ THỐNG
INSERT INTO THAM_SO (MaThamSo, GiaTri, MoTa) VALUES
('TEN_CUA_HANG', N'CÔNG TY TNHH THỂ THAO ENERGY', N'Tên thương hiệu doanh nghiệp'),
('DIA_CHI', N'280 An Dương Vương, Phường 4, Quận 5, TP.HCM', N'Địa chỉ cửa hàng chính'),
('HOTLINE', '0901 888 999', N'Đường dây nóng hỗ trợ khách hàng'),
('HAN_MUC_DUYET_NHAP', '20000000', N'Hạn mức giá trị phiếu nhập kho cần Giám đốc phê duyệt (VNĐ) - QD05'),
('TI_LE_TICH_DIEM', '0.01', N'Tỷ lệ tích điểm cho khách hàng (1% giá trị hóa đơn) - QD02'),
('HAN_DOI_TRA_NGAY', '7', N'Số ngày tối đa cho phép đổi trả hàng hóa - QD02'),
('TI_LE_LECH_KHO_DUYET', '0.02', N'Tỷ lệ lệch kiểm kê kho cần Giám đốc duyệt (2%) - QD03');
GO

-- 12.2 VAI TRÒ
INSERT INTO VAI_TRO (TenVaiTro) VALUES
(N'Giám đốc'),
(N'Thu ngân'),
(N'Thủ kho'),
(N'Kế toán'),
(N'Quản trị viên');
GO

-- 12.3 CHỨC NĂNG HỆ THỐNG
INSERT INTO CHUC_NANG (MaChucNang, TenChucNang) VALUES
('BAN_HANG', N'Bán hàng tại quầy và online'),
('DOI_TRA', N'Đổi trả hàng hóa'),
('TRA_CUU_SP', N'Tra cứu sản phẩm và giá bán'),
('QUAN_LY_KHO', N'Quản lý sản phẩm và danh mục'),
('NHAP_KHO', N'Lập phiếu nhập kho'),
('DUYET_NHAP_KHO', N'Duyệt phiếu nhập kho vượt hạn mức'),
('KIEM_KE', N'Kiểm kê kho hàng định kỳ'),
('KHACH_HANG', N'Quản lý danh sách khách hàng và tích điểm'),
('KHUYEN_MAI', N'Quản lý chương trình khuyến mãi'),
('DUYET_KHUYEN_MAI', N'Phê duyệt đợt khuyến mãi'),
('DOI_SOAT_COD', N'Đối soát thanh toán COD và chuyển khoản'),
('BAO_CAO_DOANH_THU', N'Xem báo cáo doanh thu và tài chính'),
('BAO_CAO_TON_KHO', N'Xem báo cáo tồn kho'),
('QUAN_TRI_HE_THONG', N'Quản trị tài khoản, phân quyền và tham số'),
('AUDIT_LOG', N'Xem nhật ký hoạt động hệ thống'),
('BACKUP_RESTORE', N'Sao lưu và phục hồi dữ liệu');
GO

-- 12.4 PHÂN QUYỀN VAI TRÒ (RBAC)
-- Giám đốc (MaVaiTro = 1): Full quyền
INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang)
SELECT 1, MaChucNang FROM CHUC_NANG;

-- Thu ngân (MaVaiTro = 2): Bán hàng, đổi trả, tra cứu, khách hàng
INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES
(2, 'BAN_HANG'), (2, 'DOI_TRA'), (2, 'TRA_CUU_SP'), (2, 'KHACH_HANG');

-- Thủ kho (MaVaiTro = 3): Quản lý kho, nhập kho, kiểm kê, tra cứu, báo cáo tồn kho
INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES
(3, 'QUAN_LY_KHO'), (3, 'NHAP_KHO'), (3, 'KIEM_KE'), (3, 'TRA_CUU_SP'), (3, 'BAO_CAO_TON_KHO');

-- Kế toán (MaVaiTro = 4): Đối soát COD, báo cáo doanh thu, tra cứu
INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES
(4, 'DOI_SOAT_COD'), (4, 'BAO_CAO_DOANH_THU'), (4, 'TRA_CUU_SP');

-- Admin (MaVaiTro = 5): Quản trị hệ thống, Audit log, Backup, Phân quyền
INSERT INTO PHAN_QUYEN (MaVaiTro, MaChucNang) VALUES
(5, 'QUAN_TRI_HE_THONG'), (5, 'AUDIT_LOG'), (5, 'BACKUP_RESTORE'), (5, 'TRA_CUU_SP');
GO

-- 12.5 NHÂN VIÊN MẪU (Mật khẩu mặc định: '123456')
-- Băm bcrypt: $2a$10$wN0oH1U1oJq9i6N/uD1Jq.2aKq.sKqm1q9r2Yx5eD5EwL2M3N4O5P hoặc plaintext tương thích
INSERT INTO NHAN_VIEN (HoTen, SoDienThoai, MaVaiTro, TenDangNhap, MatKhau) VALUES
(N'Hoàng Nam Thanh Tiến Quốc Vượng', '0912345678', 1, 'giamdoc', '$2a$10$qR6iUv8pC1bY8NqVn5ZkO.dKlZg9G0D1S4H7kK8L0P2M1N3Q5R7S9'),
(N'Đỗ Chí An', '0923456789', 2, 'thungan', '$2a$10$qR6iUv8pC1bY8NqVn5ZkO.dKlZg9G0D1S4H7kK8L0P2M1N3Q5R7S9'),
(N'Nguyễn Thái Dương', '0934567890', 3, 'thukho', '$2a$10$qR6iUv8pC1bY8NqVn5ZkO.dKlZg9G0D1S4H7kK8L0P2M1N3Q5R7S9'),
(N'Phạm Thành Thuật', '0945678901', 4, 'ketoan', '$2a$10$qR6iUv8pC1bY8NqVn5ZkO.dKlZg9G0D1S4H7kK8L0P2M1N3Q5R7S9'),
(N'Quản trị viên Hệ thống', '0956789012', 5, 'admin', '$2a$10$qR6iUv8pC1bY8NqVn5ZkO.dKlZg9G0D1S4H7kK8L0P2M1N3Q5R7S9');
GO

-- 12.6 DANH MỤC SẢN PHẨM
INSERT INTO DANH_MUC (TenDanhMuc) VALUES
(N'Vợt Cầu Lông & Phụ kiện'),
(N'Giày Thể Thao'),
(N'Bóng Đá & Futsal'),
(N'Quần Áo Thể Thao'),
(N'Dụng cụ Tennis & Bóng bàn'),
(N'Phụ kiện & Bình nước');
GO

-- 12.7 THƯƠNG HIỆU
INSERT INTO THUONG_HIEU (TenThuongHieu) VALUES
('Yonex'),
('Victor'),
('Lining'),
('Nike'),
('Adidas'),
('Puma'),
('Wilson'),
('Molten');
GO

-- 12.8 NHÀ CUNG CẤP
INSERT INTO NHA_CUNG_CAP (TenNCC, SoDienThoai, Email, DiaChi) VALUES
(N'Tổng Kho Thể Thao Sunrise Sports', '02838351234', 'sales@sunrisesports.vn', N'Quận 10, TP.HCM'),
(N'Công Ty TNHH Nike Việt Nam Phân Phối', '02839998888', 'contact@nike-distributor.vn', N'Khu chế xuất Tân Thuận, Quận 7, TP.HCM'),
(N'Đại Lý Phân Phối Yonex Sunrise VN', '02837776666', 'yonex@sunrise.com.sg', N'Quận Tân Bình, TP.HCM');
GO

-- 12.9 SẢN PHẨM THỂ THAO TIÊU BIỂU
INSERT INTO SAN_PHAM (TenSanPham, MaDanhMuc, MaThuongHieu, GiaNhap, GiaBanLe, GiaBanSi, SoLuongTon, DonViTinh) VALUES
(N'Vợt Cầu Lông Yonex Astrox 88D Pro', 1, 1, 3100000, 3950000, 3550000, 35, N'Cây'),
(N'Vợt Cầu Lông Victor Thruster K 9900', 1, 2, 2200000, 2890000, 2600000, 20, N'Cây'),
(N'Vợt Cầu Lông Lining Axforce 80', 1, 3, 2900000, 3650000, 3300000, 15, N'Cây'),
(N'Giày Cầu Lông Yonex 65Z3 Trắng', 2, 1, 1850000, 2450000, 2200000, 42, N'Đôi'),
(N'Giày Chạy Bộ Nike Pegasus 40', 2, 4, 2100000, 2990000, 2700000, 28, N'Đôi'),
(N'Giày Bóng Đá Adidas Predator Elite', 2, 5, 2300000, 3200000, 2900000, 18, N'Đôi'),
(N'Quả Bóng Đá Molten Vantaggio 5000 FIFA Quality Pro', 3, 8, 850000, 1250000, 1050000, 60, N'Quả'),
(N'Áo Thi Đấu Cầu Lông Yonex Tournament 2026', 4, 1, 220000, 350000, 290000, 85, N'Cái'),
(N'Quần Thể Thao Nike Dri-FIT Co Giãn', 4, 4, 310000, 480000, 420000, 50, N'Cái'),
(N'Hộp 12 Quả Cầu Lông Victor Master No.1', 1, 2, 280000, 380000, 340000, 120, N'Ống'),
(N'Vợt Tennis Wilson Clash 100 V2', 5, 7, 3600000, 4750000, 4300000, 12, N'Cây'),
(N'Bình Nước Giữ Nhiệt Thể Thao Nike 750ml', 6, 4, 190000, 320000, 270000, 4, N'Cái'); -- Tồn kho <= 5 để test cảnh báo
GO

-- 12.10 KHÁCH HÀNG
INSERT INTO KHACH_HANG (HoTen, SoDienThoai, Email, DiaChi, DiemTichLuy) VALUES
(N'Trần Minh Tuấn', '0903112233', 'minhtuan@gmail.com', N'Quận 1, TP.HCM', 150),
(N'Lê Thị Hương', '0918445566', 'huongle@gmail.com', N'Quận 3, TP.HCM', 80),
(N'CLB Thể Thao Sao Vàng (Khách Sỉ)', '0988776655', 'saovangclub@gmail.com', N'Quận Phú Nhuận, TP.HCM', 1200);
GO

-- 12.11 MÃ KHUYẾN MÃI
INSERT INTO KHUYEN_MAI (MaCode, TenKhuyenMai, PhanTramGiam, NgayBatDau, NgayKetThuc, TrangThai) VALUES
('ENERGY10', N'Chào Bạn Mới - Giảm 10%', 10, '2026-01-01', '2026-12-31', N'Đang hoạt động'),
('SUMMERSPORT', N'Mùa Hè Năng Động - Giảm 15%', 15, '2026-05-01', '2026-08-31', N'Đang hoạt động');
GO

PRINT N'Cơ sở dữ liệu ENERGY_STORE_DB đã được khởi tạo hoàn chỉnh!';

