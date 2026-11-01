<<<<<<< HEAD
# HỆ THỐNG QUẢN LÝ BÁN HÀNG DỤNG CỤ THỂ THAO ENERGY
### TRƯỜNG ĐẠI HỌC SƯ PHẠM THÀNH PHỐ HỒ CHÍ MINH (HCMUE)
**Khoa Công nghệ Thông tin**  
**Học phần**: Nhập môn Công nghệ Phần mềm  
**Đồ án**: Xây dựng Phần mềm Quản lý Bán hàng Công ty TNHH Bán lẻ & Thương mại Điện tử ENERGY  
**Nhóm sinh viên thực hiện**: **Nhóm ENERGY**
- **Hoàng Nam Thanh Tiến Quốc Vượng** (MSSV: 50.01.104.182) - *Nhóm trưởng / Phân tích hệ thống*
- **Đỗ Chí An** (MSSV: 51.01.104.001) - *Lập trình Frontend / Thiết kế UI/UX*
- **Nguyễn Thái Dương** (MSSV: 49.01.104.024) - *Lập trình Backend / Quản trị CSDL*
- **Phạm Thành Thuật** (MSSV: 50.01.104.159) - *Phân tích nghiệp vụ / Backend*

---

## ⚡ Giới thiệu Dự án

Dự án là một hệ thống phần mềm quản lý bán hàng toàn diện, hiện đại dành cho chuỗi cửa hàng bán lẻ dụng cụ thể thao (Cầu lông, Bóng đá, Giày chạy bộ, Tennis, Phụ kiện...).

Hệ thống được thiết kế và hiện thực hóa chuẩn mực dựa trên tài liệu đặc tả yêu cầu **Lab 2**, thiết kế cơ sở dữ liệu quan hệ **Lab 3** và thiết kế giao diện & xử lý thuật giải **Lab 4**.

---

## 🌟 Điểm nổi bật & Quy định Nghiệp vụ (Business Rules)

- 🛒 **POS Bán Hàng & In Hóa Đơn Nhiệt K80 (BM01)**:
  - Tự động áp dụng quy tắc giá **QD01**: Mua $< 10$ chiếc tính **Giá bán lẻ**, mua $\ge 10$ chiếc tự động áp dụng **Giá bán sỉ** ưu đãi.
  - Tích lũy điểm thưởng **QD02**: Khách hàng được tích lũy **1%** giá trị hóa đơn thành điểm thưởng.
  - Phím tắt bán hàng nhanh: `F2` tìm kiếm/quét barcode, `F4` thanh toán & in hóa đơn K80, `Esc` đóng modal.
- 🔄 **Xử lý Đổi Trả Hàng Hóa (QD02)**:
  - Tra cứu hóa đơn cũ, kiểm tra chính sách đổi trả trong vòng **07 ngày**.
  - Tự động hoàn trả số lượng vào kho và khấu trừ lại điểm tích lũy của khách hàng tương ứng.
- 📥 **Quản lý Nhập Kho & Phê Duyệt Cấp Quản Lý (QD05, BM02)**:
  - Lập phiếu nhập kho từ Nhà cung cấp.
  - Quy định phê duyệt **QD05**: Phiếu nhập có tổng giá trị **$> 20.000.000$ VNĐ** (cấu hình trong `THAM_SO`) tự động chuyển sang trạng thái **"Chờ Giám đốc duyệt"**. Sau khi Giám đốc phê duyệt thì hệ thống mới cập nhật tăng tồn kho và giá vốn!
- 📝 **Kiểm Kê Kho Định Kỳ (QD03)**:
  - So sánh số lượng thực tế và số lượng hệ thống; tự động tính chênh lệch.
  - Nếu sai lệch **$> 2\%$** sẽ chuyển trạng thái chờ Giám đốc xem xét.
- 🚚 **Giao Hàng COD & Đối Soát Cuối Ngày (QD04, BM05)**:
  - Quản lý vận đơn thu hộ COD; Cuối ngày, Kế toán đối soát tiền COD do đơn vị vận chuyển chuyển về.
- 📈 **Báo Cáo Doanh Thu & Lợi Nhuận Gộp (BM06)**:
  - Biểu đồ đồ thị doanh thu và lợi nhuận gộp theo từng ngày.
  - Bảng thống kê Top 5 sản phẩm bán chạy nhất và danh sách cảnh báo tồn kho thấp ($\le 5$).
- 🛡️ **Quản Trị Hệ Thống & Bảo Mật (YCHT01 - YCHT04)**:
  - Mô hình phân quyền dựa trên vai trò (**RBAC**) cho 5 nhóm tài khoản: *Giám đốc, Thu ngân, Thủ kho, Kế toán, Admin*.
  - Mật khẩu băm an toàn bằng thuật toán **BCrypt**.
  - Bảng tham số linh hoạt (`THAM_SO`) loại bỏ hard-code.
  - Nhật ký hoạt động hệ thống (**Audit Trail**) ghi vết mọi thay đổi dữ liệu.
  - Sao lưu (Backup) & Phục hồi CSDL (Restore).

---

## 📁 Cấu trúc Thư mục Dự án

```text
quanlibanhang/
├── package.json                     # Thông tin dependencies
├── server.js                        # Điểm khởi chạy Web Server
├── database/
│   ├── database.sql                 # Toàn bộ mã nguồn T-SQL DDL & DML cho SQL Server (Lab 3)
│   ├── db.js                        # Module kết nối CSDL và khởi tạo schema & seed data
│   └── energy_pos.db                # File CSDL SQLite khởi tạo sẵn
├── src/
│   ├── middleware/
│   │   ├── auth.js                  # Xác thực người dùng (JWT)
│   │   ├── rbac.js                  # Middleware kiểm tra vai trò & chức năng (RBAC)
│   │   └── audit.js                 # Middleware ghi nhận nhật ký (NHAT_KY_HOAT_DONG)
│   ├── controllers/
│   │   ├── authController.js        # Đăng nhập, đổi mật khẩu
│   │   ├── productController.js     # Danh mục, thương hiệu, sản phẩm
│   │   ├── posController.js         # Lập hóa đơn, tính giá sỉ/lẻ, tích điểm, in K80
│   │   ├── returnController.js      # Đổi trả hàng hóa < 7 ngày, hoàn kho
│   │   ├── inventoryController.js   # Nhập kho, duyệt phiếu > 20M, kiểm kê
│   │   ├── customerController.js    # Khách hàng, điểm tích lũy, khuyến mãi
│   │   ├── codController.js         # Vận đơn COD, đối soát kế toán
│   │   ├── reportController.js      # Báo cáo doanh thu, giá vốn, lợi nhuận gộp
│   │   └── systemController.js      # Quản trị tài khoản, phân quyền, tham số, backup
│   └── routes/
│       └── api.js                   # Tập hợp và định tuyến tất cả RESTful API
├── public/
│   ├── index.html                   # Giao diện chính Single-Page Application (SPA)
│   ├── css/
│   │   ├── app.css                  # Giao diện hiện đại phong cách thể thao ENERGY
│   │   └── print-k80.css            # Định dạng in hóa đơn nhiệt K80 chuẩn mực
│   └── js/
│       ├── app.js                   # Quản lý luồng ứng dụng, thông báo, chuyển view
│       ├── pos.js                   # Xử lý bán hàng POS, giỏ hàng, in K80
│       ├── inventory.js             # Quản lý kho, lập phiếu nhập, duyệt hạn mức
│       ├── cod.js                   # Xử lý giao hàng COD & đối soát kế toán
│       ├── reports.js               # Biểu đồ doanh thu, thống kê sản phẩm
│       └── admin.js                 # Quản trị nhân viên, RBAC, tham số, audit log
└── docs/
    ├── LAB3_THIET_KE_CSDL.md        # Báo cáo chi tiết thiết kế CSDL (Lab 3)
    ├── LAB4_THIET_KE_GIAO_DIEN.md   # Báo cáo thiết kế giao diện & thuật giải (Lab 4)
    └── HUONG_DAN_CAI_DAT.md         # Hướng dẫn chi tiết cài đặt và vận hành
```

---

## 🚀 Hướng Dẫn Chạy Nhanh Ứng Dụng Desktop & Web

### 1. Khởi chạy Ứng dụng Desktop Windows (Electron)
- **Cách nhanh nhất**: Nhấp đúp chuột vào file **`run-desktop.bat`**.
- **Hoặc chạy qua lệnh Terminal**:
  ```powershell
  npm run desktop
  ```
  *(Cửa sổ phần mềm Desktop sẽ mở tự động với độ phân giải chuẩn, tích hợp sẵn menu Native và kết nối trực tiếp đến CSDL SQL Server).*

### 2. Khởi chạy Web Server (Chạy trên trình duyệt)
- Nhấp đúp chuột vào file **`run-web.bat`** hoặc gõ lệnh:
  ```powershell
  npm start
  ```
- Mở trình duyệt Web tại: **`http://localhost:3000`**

---

## 🗄️ Cấu Hình Kết Nối Microsoft SQL Server (`ENERGY_STORE_DB`)
Hệ thống kết nối trực tiếp tới CSDL SQL Server thật trên máy tính thông qua cấu hình trong file [`.env`](file:///.env):
- **Server**: `localhost\SQLEXPRESS` (hoặc `.\SQLEXPRESS`)
- **Database**: `ENERGY_STORE_DB`
- **User**: `energy_app`
- **Password**: `EnergyPassword123!`
*(Hệ thống đã có sẵn cơ chế fallback thông minh sang SQLite cục bộ nếu môi trường không có SQL Server, đảm bảo ứng dụng không bao giờ bị dừng hoạt động).*

---

### Tài khoản đăng nhập mẫu:
- **Giám đốc**: `giamdoc` / `123456`
- **Thu ngân**: `thungan` / `123456`
- **Thủ kho**: `thukho` / `123456`
- **Kế toán**: `ketoan` / `123456`
- **Quản trị viên**: `admin` / `123456`
*(Ứng dụng có sẵn thanh nút bấm chuyển đổi 1-click giữa các tài khoản để phục vụ chấm điểm và kiểm thử nhanh).*

=======
# QuanLyBanHang
>>>>>>> 620cdfadf1a8019086dd0c01646ea2930f2c3eff
