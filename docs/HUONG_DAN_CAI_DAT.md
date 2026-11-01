# HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH HỆ THỐNG
## Ứng Dụng Desktop Windows (Electron) & Web Bán Hàng ENERGY SPORTS
**Khoa CNTT - Trường Đại học Sư phạm TP.HCM (HCMUE)**  
**Môn học**: Nhập môn Công nghệ Phần mềm  
**Đề tài**: Phần mềm Quản lý Bán hàng Dụng cụ Thể thao ENERGY

---

### 1. Giới Thiệu Kiến Trúc Desktop Ứng Dụng
Hệ thống sử dụng **Electron** để đóng gói toàn bộ mã nguồn Web (`public/index.html`, `pos.js`, `inventory.js`, `admin.js`, `cod.js`, `reports.js`) thành một **Ứng dụng Desktop chạy độc lập trên Windows**:
- Tự động kích hoạt Backend Express và mở cửa sổ Desktop chuyên nghiệp (kích thước 1366x820, hỗ trợ menu Native, phím tắt F2, F4, F9, F11, F12).
- Kết nối trực tiếp tới cơ sở dữ liệu **Microsoft SQL Server (Database: `ENERGY_STORE_DB`)** trên máy tính thông qua tài khoản ứng dụng `energy_app`.
- Tự động chuyển đổi dự phòng sang SQLite nếu môi trường không có SQL Server, đảm bảo ứng dụng không bao giờ bị gián đoạn.

---

### 2. Cách Khởi Chạy Ứng Dụng Desktop

#### Cách 1: Chạy bằng file Batch (Khuyên dùng - 1 Click)
Vào thư mục dự án và nhấp đúp chuột vào file:
👉 **`run-desktop.bat`**

Ứng dụng Desktop Electron sẽ tự động khởi động máy chủ và hiển thị giao diện phần mềm ngay lập tức!

#### Cách 2: Chạy từ Terminal / Command Prompt
```powershell
cd "c:\Users\MY PC\Downloads\quanlibanhang"
npm run desktop
```
Hoặc:
```powershell
npx electron .
```

#### Cách 3: Chạy chế độ Web Browser (Truy cập qua mạng LAN / Wi-Fi)
```powershell
npm start
```
Và mở trình duyệt tại: **`http://localhost:3000`** (hoặc nhấp đúp file `run-web.bat`).

---

### 3. Cấu Hình Kết Nối Microsoft SQL Server (`ENERGY_STORE_DB`)

Cấu hình kết nối nằm trong file [`.env`](file:///c:/Users/MY%20PC/Downloads/quanlibanhang/.env):

```env
PORT=3000
JWT_SECRET=ENERGY_SPORTS_SECRET_KEY_2026

# Chọn động cơ CSDL: 'mssql' (SQL Server) hoặc 'sqlite'
DB_TYPE=mssql

# Thông số kết nối Microsoft SQL Server
DB_SERVER=localhost
DB_INSTANCE=SQLEXPRESS
DB_DATABASE=ENERGY_STORE_DB
DB_USER=energy_app
DB_PASSWORD=EnergyPassword123!
DB_PORT=1433
```

#### Thông tin tài khoản SQL Server đã được thiết lập sẵn:
- **Tên Server / Instance**: `localhost\SQLEXPRESS` (hoặc `.\SQLEXPRESS`)
- **Tên Database**: `ENERGY_STORE_DB`
- **Tài khoản (SQL Login)**: `energy_app`
- **Mật khẩu**: `EnergyPassword123!`
- **Quyền hạn**: `db_owner` trên database `ENERGY_STORE_DB`

*(Nếu cần khởi tạo lại CSDL trên SSMS, chạy file [`database/database.sql`](file:///c:/Users/MY%20PC/Downloads/quanlibanhang/database/database.sql)).*

---

### 4. Danh Sách Tài Khoản Đăng Nhập & Phân Quyền (RBAC)

| Vai trò | Tên đăng nhập | Mật khẩu | Quyền hạn nghiệp vụ chính |
| :--- | :--- | :---: | :--- |
| **👑 Giám đốc** | `giamdoc` | `123456` | Toàn quyền hệ thống; Phê duyệt phiếu nhập kho $> 20.000.000$ VNĐ (QD05); Duyệt khuyến mãi; Xem Dashboard & Báo cáo doanh thu lợi nhuận. |
| **💵 Thu ngân** | `thungan` | `123456` | Bán hàng POS tại quầy (QD01, QD02); In hóa đơn nhiệt K80; Xử lý đổi trả hàng hóa $< 7$ ngày; Quản lý thông tin khách hàng & tích điểm. |
| **📦 Thủ kho** | `thukho` | `123456` | Quản lý danh mục & thương hiệu sản phẩm; Lập phiếu nhập kho từ NCC; Kiểm kê kho hàng định kỳ (QD03); Cảnh báo tồn kho thấp. |
| **📑 Kế toán** | `ketoan` | `123456` | Quản lý vận đơn giao hàng COD; Đối soát tiền thu hộ COD cuối ngày (QD04); Xem báo cáo tài chính, giá vốn & doanh thu (BM06). |
| **🛠️ Quản trị viên** | `admin` | `123456` | Quản lý danh sách tài khoản nhân viên; Thiết lập ma trận phân quyền RBAC; Cấu hình tham số hệ thống (THAM_SO); Xem Audit Trail; Sao lưu (Backup) & Phục hồi CSDL. |

> **Thanh chuyển đổi nhanh vai trò**: Ngay phía trên đầu trang có thanh công cụ chuyển đổi nhanh 1-click giữa 5 vai trò để phục vụ kiểm thử và báo cáo đề tài!

---

### 5. Bảng Phím Tắt Nghiệp Vụ Trên Desktop (YCCL02)
- **`F4`**: Kích hoạt thanh toán giỏ hàng POS và mở hộp thoại in hóa đơn nhiệt K80.
- **`F2`**: Đưa con trỏ nhanh vào ô tìm kiếm sản phẩm / quét mã vạch Barcode.
- **`F11`**: Bật/tắt chế độ toàn màn hình Desktop.
- **`F12`**: Bật/tắt DevTools để kiểm tra mạng và console.
- **`Ctrl + R`**: Tải lại giao diện phần mềm.
- **`Esc`**: Đóng nhanh các hộp thoại (Modal dialog).
