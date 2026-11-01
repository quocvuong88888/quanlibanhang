# BÁO CÁO THỰC HÀNH CÔNG NGHỆ PHẦN MỀM
## BÀI LAB 4: THIẾT KẾ GIAO DIỆN & XỬ LÝ
**Trường**: Đại học Sư phạm Thành phố Hồ Chí Minh (HCMUE)  
**Khoa**: Công nghệ Thông tin  
**Học phần**: Nhập môn Công nghệ Phần mềm  
**Đề tài**: Phần mềm Quản lý Bán hàng Dụng cụ Thể thao (Công ty ENERGY)  
**Nhóm thực hiện**: ENERGY  
- Hoàng Nam Thanh Tiến Quốc Vượng (MSSV: 50.01.104.182) - Nhóm trưởng / Phân tích hệ thống
- Đỗ Chí An (MSSV: 51.01.104.001) - Lập trình Frontend & Thiết kế UI/UX
- Nguyễn Thái Dương (MSSV: 49.01.104.024) - Lập trình Backend & CSDL
- Phạm Thành Thuật (MSSV: 50.01.104.159) - Phân tích nghiệp vụ & Backend

---

## I. MỤC TIÊU VÀ PHÂN LOẠI MÀN HÌNH

Dựa trên yêu cầu của Bài Lab 4 và kết quả phân tích Use Case / BFD từ Bài Lab 2, hệ thống quản lý bán hàng ENERGY thiết kế 5 nhóm màn hình tiêu chuẩn:

1. **Màn hình giao diện chính (Dashboard)**:
   - Hiển thị các chỉ số kinh doanh quan trọng: Doanh thu ngày, Số hóa đơn, Lợi nhuận gộp, Đơn COD chờ đối soát, Cảnh báo hàng tồn kho thấp ($\le 5$).
   - Menu điều hướng phân quyền linh hoạt theo vai trò người dùng (Giám đốc, Thu ngân, Thủ kho, Kế toán, Quản trị viên).
   - Biểu đồ đồ thị doanh thu và thông báo phê duyệt chờ xử lý.

2. **Màn hình nhập liệu & giao dịch (POS Bán Hàng - BM01)**:
   - Ô nhập liệu tìm kiếm theo tên hoặc quét mã vạch (Barcode Scanner).
   - Lưới danh mục dụng cụ thể thao hiển thị ảnh, tên, đơn giá bán lẻ, đơn giá sỉ và số lượng tồn thực tế.
   - Giỏ hàng tương tác với tính toán thời gian thực theo quy định QD01 (tự động áp dụng giá sỉ khi $SL \ge 10$).
   - Tra cứu và thêm nhanh thông tin khách hàng, tự động tích điểm 1% theo QD02.
   - Nhập tiền khách đưa, tự động tính tiền thừa thối lại.
   - Hỗ trợ phím tắt bán hàng: F2 (Tìm kiếm), F4 (Thanh toán), F9 (In), Esc (Hủy/Đóng).

3. **Màn hình xử lý, tính toán & phê duyệt nghiệp vụ**:
   - **Màn hình Đổi trả hàng (QD02)**: Tra cứu hóa đơn, kiểm tra hạn 7 ngày, tính tổng tiền hoàn lại, tự động hoàn kho và trừ lại điểm tích lũy tương ứng.
   - **Màn hình Nhập kho & Phê duyệt hạn mức (BM02 & QD05)**: Chọn nhà cung cấp, nhập sản phẩm, tính tổng tiền. Nếu $> 20.000.000$ VNĐ hệ thống tự động kích hoạt trạng thái "Chờ Giám đốc duyệt"; Giám đốc phê duyệt thì hệ thống mới cập nhật tăng tồn kho.
   - **Màn hình Kiểm kê kho (QD03)**: So sánh số lượng hệ thống và số lượng kiểm đếm thực tế; tính tỷ lệ lệch kho, nếu vượt $2\%$ thì chuyển trạng thái phê duyệt cấp quản lý.
   - **Màn hình Đối soát COD (BM05 & QD04)**: Kế toán đối soát tiền thu hộ của đơn vị vận chuyển GHN/Viettel Post cuối ngày.

4. **Màn hình kết xuất & in ấn chuyên dụng**:
   - Màn hình / Modal xem trước và in **Hóa đơn nhiệt K80 (80mm)** chuẩn quầy thu ngân (BM01) có mã vạch, phân tách giá sỉ/lẻ, tích điểm và thông tin chính sách đổi trả.
   - Màn hình kết xuất **Báo cáo Doanh thu & Lợi nhuận gộp (BM06)** kèm biểu đồ trực quan.

5. **Màn hình quản trị hệ thống (Admin - YCHT01 - YCHT04)**:
   - Quản trị tài khoản nhân viên.
   - Ma trận phân quyền 5 vai trò (RBAC).
   - Cấu hình tham số hệ thống (THAM_SO).
   - Xem nhật ký hoạt động (Audit Trail).
   - Sao lưu (Backup) & Phục hồi (Restore) CSDL.

---

## II. DANH SÁCH CÁC LỚP THỰC THỂ DỮ LIỆU (OBJECT CLASSES)

Mỗi lớp đại diện cho một thực thể nghiệp vụ tương ứng với cấu trúc bảng trong CSDL:

### 1. Lớp Sản Phẩm (`SanPhamInfo`)
| STT | Tên thuộc tính | Kiểu dữ liệu | Ràng buộc / Phạm vi | Ghi chú |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `MaSanPham` | `int` | PK, Identity, $> 0$ | Mã định danh sản phẩm |
| 2 | `TenSanPham` | `string` | Not Null, Max 200 | Tên dụng cụ thể thao |
| 3 | `MaDanhMuc` | `int` | FK $\rightarrow$ DanhMuc | Phân loại danh mục |
| 4 | `MaThuongHieu` | `int` | FK $\rightarrow$ ThuongHieu | Hãng thể thao (Yonex, Nike...) |
| 5 | `GiaNhap` | `decimal` | $\ge 0$ | Giá vốn nhập vào |
| 6 | `GiaBanLe` | `decimal` | $\ge 0$ | Áp dụng khi $SL < 10$ (QD01) |
| 7 | `GiaBanSi` | `decimal` | $\ge 0$ | Áp dụng khi $SL \ge 10$ (QD01) |
| 8 | `SoLuongTon` | `int` | $\ge 0$ | Số lượng hàng tồn kho |
| 9 | `DonViTinh` | `string` | Default 'Cái' | Đơn vị tính (Cây, Đôi, Quả, Cái) |

### 2. Lớp Hóa Đơn (`HoaDonInfo`)
| STT | Tên thuộc tính | Kiểu dữ liệu | Ràng buộc / Phạm vi | Ghi chú |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `MaHoaDon` | `int` | PK, Identity, $> 0$ | Mã hóa đơn bán hàng |
| 2 | `NgayLap` | `DateTime` | Default CurrentDate | Thời điểm xuất hóa đơn |
| 3 | `MaKhachHang` | `int?` | FK $\rightarrow$ KhachHang, Nullable | Mã khách hàng mua |
| 4 | `MaNhanVien` | `int` | FK $\rightarrow$ NhanVien | Thu ngân thực hiện |
| 5 | `MaKhuyenMai` | `int?` | FK $\rightarrow$ KhuyenMai, Nullable | Mã voucher áp dụng |
| 6 | `TongTienHang` | `decimal` | $\ge 0$ | Tổng tiền trước giảm giá |
| 7 | `SoTienGiam` | `decimal` | $\ge 0$ | Tiền giảm theo khuyến mãi |
| 8 | `TongTien` | `decimal` | $\ge 0$ | Tổng tiền khách cần thanh toán |
| 9 | `TienKhachDua` | `decimal` | $\ge 0$ | Tiền mặt khách đưa |
| 10 | `TienThoiLai` | `decimal` | $\ge 0$ | Tiền thối lại cho khách |
| 11 | `DiemCongThem` | `int` | $\ge 0$ | Điểm tích lũy ($1\%$ theo QD02) |
| 12 | `HinhThucThanhToan` | `string` | 'Tiền mặt' / 'Chuyển khoản' / 'COD' | Phương thức thanh toán |

### 3. Lớp Chi Tiết Hóa Đơn (`ChiTietHoaDonInfo`)
| STT | Tên thuộc tính | Kiểu dữ liệu | Ràng buộc / Phạm vi | Ghi chú |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `MaHoaDon` | `int` | PK, FK $\rightarrow$ HoaDon | Mã hóa đơn |
| 2 | `MaSanPham` | `int` | PK, FK $\rightarrow$ SanPham | Mã sản phẩm |
| 3 | `SoLuong` | `int` | $> 0$ | Số lượng mua |
| 4 | `DonGia` | `decimal` | $\ge 0$ | Đơn giá thực tế (lẻ hoặc sỉ) |
| 5 | `LoaiGia` | `string` | 'Giá lẻ' / 'Giá sỉ (≥10)' | Ghi chú phân loại giá (QD01) |
| 6 | `ThanhTien` | `decimal` | $SoLuong \times DonGia$ | Thành tiền mặt hàng |

### 4. Lớp Phiếu Nhập Kho (`NhapKhoInfo`)
| STT | Tên thuộc tính | Kiểu dữ liệu | Ràng buộc / Phạm vi | Ghi chú |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `MaPhieuNhap` | `int` | PK, Identity, $> 0$ | Mã phiếu nhập |
| 2 | `NgayNhap` | `DateTime` | Default CurrentDate | Ngày giờ nhập kho |
| 3 | `MaNCC` | `int` | FK $\rightarrow$ NhaCungCap | Nhà cung cấp giao hàng |
| 4 | `MaNhanVien` | `int` | FK $\rightarrow$ NhanVien | Thủ kho lập phiếu |
| 5 | `TongTienNhap` | `decimal` | $\ge 0$ | Tổng giá trị đợt hàng |
| 6 | `TrangThaiDuyet` | `string` | 'Đã duyệt' / 'Chờ Giám đốc duyệt' / 'Bị từ chối' | Áp dụng QD05 ($>20M$) |

### 5. Lớp Khách Hàng (`KhachHangInfo`)
| STT | Tên thuộc tính | Kiểu dữ liệu | Ràng buộc / Phạm vi | Ghi chú |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `MaKhachHang` | `int` | PK, Identity, $> 0$ | Mã khách hàng |
| 2 | `HoTen` | `string` | Not Null, Max 100 | Họ tên |
| 3 | `SoDienThoai` | `string` | Unique, Not Null | SĐT tra cứu tích điểm |
| 4 | `DiemTichLuy` | `int` | $\ge 0$, Default 0 | Số điểm thưởng hiện có |

---

## III. MÔ TẢ CÁC THUẬT GIẢI XỬ LÝ (ALGORITHMS & PROCESS FLOWS)

### 1. Thuật giải Xử lý Bán hàng & Lập hóa đơn (`btnThanhToan_Click` / `posController.createInvoice`)
**Mục tiêu**: Kiểm tra số lượng tồn kho, tự động áp dụng giá bán sỉ/lẻ theo quy định QD01, tính giảm giá voucher, cộng điểm tích lũy 1% theo QD02, trừ tồn kho và xuất hóa đơn K80.

```text
Thuật giải (Hàm xử lý Lập Hóa Đơn Bán Hàng):
BƯỚC 1: Kiểm tra Giỏ hàng
    Nếu Giỏ hàng rỗng:
        Thông báo lỗi: "Giỏ hàng trống! Vui lòng chọn sản phẩm.";
        Dừng thực hiện.

BƯỚC 2: Duyệt từng sản phẩm trong giỏ hàng và Kiểm tra Tồn kho
    TongTienHang = 0;
    Với mỗi Sản phẩm SP trong Giỏ hàng:
        Đọc thông tin SP từ CSDL theo MaSanPham;
        Nếu SP không tồn tại:
            Thông báo lỗi; Dừng thực hiện;
        Nếu SP.SoLuongMua > SP.SoLuongTon:
            Thông báo lỗi: "Sản phẩm " + SP.TenSanPham + " không đủ tồn kho (Còn: " + SP.SoLuongTon + ")!";
            Dừng thực hiện;

        // Áp dụng Quy định QD01: Bảng giá sỉ và lẻ
        Nếu SP.SoLuongMua >= 10:
            SP.DonGia = SP.GiaBanSi;
            SP.LoaiGia = "Giá sỉ (≥10)";
        Ngược lại:
            SP.DonGia = SP.GiaBanLe;
            SP.LoaiGia = "Giá lẻ";

        SP.ThanhTien = SP.SoLuongMua * SP.DonGia;
        TongTienHang = TongTienHang + SP.ThanhTien;

BƯỚC 3: Xử lý Khuyến mãi (nếu có mã Voucher)
    SoTienGiam = 0;
    Nếu có MaCodeKhuyenMai:
        Đọc bảng KHUYEN_MAI kiểm tra hạn sử dụng và trạng thái;
        Nếu hợp lệ:
            SoTienGiam = TongTienHang * (KHUYEN_MAI.PhanTramGiam / 100);

    TongTien = MAX(0, TongTienHang - SoTienGiam);

BƯỚC 4: Kiểm tra Tiền khách thanh toán
    Nếu HinhThucThanhToan == "Tiền mặt":
        Nếu TienKhachDua < TongTien:
            Thông báo lỗi: "Tiền khách đưa không đủ thanh toán!";
            Dừng thực hiện;
        TienThoiLai = TienKhachDua - TongTien;
    Ngược lại:
        TienThoiLai = 0;

BƯỚC 5: Tính điểm tích lũy (Quy định QD02)
    Đọc tham số TI_LE_TICH_DIEM từ bảng THAM_SO (mặc định 0.01 = 1%);
    DiemCongThem = Phần nguyên của ((TongTien * TI_LE_TICH_DIEM) / 1000);

BƯỚC 6: Ghi nhận CSDL (Transaction)
    Ghi thông tin vào bảng HOA_DON;
    Lấy MaHoaDon vừa sinh;

    Với mỗi mặt hàng SP trong Giỏ:
        Ghi vào bảng CHI_TIET_HOA_DON (MaHoaDon, MaSanPham, SoLuong, DonGia, LoaiGia, ThanhTien);
        Cập nhật tồn kho: SAN_PHAM.SoLuongTon = SAN_PHAM.SoLuongTon - SP.SoLuongMua;

    Nếu có MaKhachHang và DiemCongThem > 0:
        Cập nhật: KHACH_HANG.DiemTichLuy = KHACH_HANG.DiemTichLuy + DiemCongThem;

    Nếu HinhThucThanhToan == "COD":
        Ghi thông tin vận chuyển vào bảng GIAO_HANG_COD (MaHoaDon, DiaChi, TienThuHo, TrangThai = 'Đang giao');

    Ghi Audit Log vào bảng NHAT_KY_HOAT_DONG;

BƯỚC 7: Kết xuất & In ấn
    Gọi giao diện xem trước và in ấn Hóa đơn nhiệt K80 (BM01);
    Xóa giỏ hàng và làm mới danh sách sản phẩm;
    Thông báo thành công.
```

---

### 2. Thuật giải Xử lý Đổi Trả Hàng Hóa (`btnDoiTra_Click` / `returnController.processReturn`)
**Mục tiêu**: Xử lý hoàn trả/đổi sản phẩm lỗi theo quy định QD02, kiểm tra thời hạn 7 ngày, hoàn lại số lượng tồn kho và khấu trừ lại điểm tích lũy của khách hàng.

```text
Thuật giải (Hàm xử lý Đổi Trả Hàng Hóa):
BƯỚC 1: Kiểm tra Hóa đơn gốc
    Đọc hóa đơn từ CSDL theo MaHoaDon;
    Nếu không tìm thấy:
        Thông báo lỗi: "Mã hóa đơn không tồn tại."; Dừng lại.

BƯỚC 2: Kiểm tra Quy định QD02 về Thời hạn Đổi trả
    Đọc tham số HAN_DOI_TRA_NGAY từ bảng THAM_SO (mặc định 7 ngày);
    SoNgayDaMua = NgàyHienTai - HoaDon.NgayLap (tính theo ngày);
    Nếu SoNgayDaMua > HAN_DOI_TRA_NGAY:
        Thông báo lỗi: "Hóa đơn đã quá hạn đổi trả (" + SoNgayDaMua + " ngày vượt quá quy định " + HAN_DOI_TRA_NGAY + " ngày)!";
        Dừng thực hiện.

BƯỚC 3: Kiểm tra tính hợp lệ của sản phẩm và số lượng đổi trả
    TongTienHoan = 0;
    Với mỗi Sản phẩm SP_Tra trong danh sách yêu cầu đổi trả:
        Kiểm tra SP_Tra có trong CHI_TIET_HOA_DON của MaHoaDon không;
        Nếu không có hoặc SP_Tra.SoLuongDoiTra > CHI_TIET_HOA_DON.SoLuong:
            Thông báo lỗi: "Số lượng đổi trả không hợp lệ.";
            Dừng thực hiện;
        
        TongTienHoan = TongTienHoan + (SP_Tra.SoLuongDoiTra * CHI_TIET_HOA_DON.DonGia);

BƯỚC 4: Tính điểm tích lũy cần thu hồi (QD02)
    Đọc tỷ lệ tích điểm (1%);
    DiemTru = Phần nguyên của ((TongTienHoan * TI_LE_TICH_DIEM) / 1000);

BƯỚC 5: Cập nhật CSDL
    Ghi vào bảng DOI_TRA (MaHoaDon, MaNhanVien, NgayDoiTra, LyDo, TongTienHoan, DiemTru);
    Lấy MaDoiTra vừa tạo;

    Với mỗi Sản phẩm đổi trả:
        Ghi vào bảng CHI_TIET_DOI_TRA;
        // Tự động hoàn trả tồn kho sản phẩm
        Cập nhật: SAN_PHAM.SoLuongTon = SAN_PHAM.SoLuongTon + SP_Tra.SoLuongDoiTra;

    Nếu Hóa đơn có MaKhachHang và DiemTru > 0:
        Cập nhật: KHACH_HANG.DiemTichLuy = MAX(0, KHACH_HANG.DiemTichLuy - DiemTru);

    Ghi Audit Log vào NHAT_KY_HOAT_DONG;
    Thông báo thành công: "Đã đổi trả hàng, hoàn kho và trừ lại " + DiemTru + " điểm tích lũy.".
```

---

### 3. Thuật giải Lập Phiếu Nhập Kho & Phê duyệt Hạn mức (`btnNhapKho_Click` / `inventoryController.createReceipt`)
**Mục tiêu**: Xử lý quy định QD05 về hạn mức phê duyệt của Giám đốc đối với phiếu nhập kho có giá trị $> 20.000.000$ VNĐ.

```text
Thuật giải (Hàm xử lý Lập Phiếu Nhập Kho & Duyệt QD05):
BƯỚC 1: Tính Tổng giá trị phiếu nhập
    TongTienNhap = 0;
    Với mỗi mặt hàng nhập:
        TongTienNhap = TongTienNhap + (SoLuongNhap * GiaNhap);

BƯỚC 2: Kiểm tra Hạn mức phê duyệt (Quy định QD05)
    Đọc tham số HAN_MUC_DUYET_NHAP từ bảng THAM_SO (mặc định 20.000.000 VNĐ);
    Nếu TongTienNhap > HAN_MUC_DUYET_NHAP:
        TrangThaiDuyet = "Chờ Giám đốc duyệt";
    Ngược lại:
        TrangThaiDuyet = "Đã duyệt";

BƯỚC 3: Ghi dữ liệu Phiếu nhập
    Ghi vào bảng NHAP_KHO (NgayNhap, MaNCC, MaNhanVien, TongTienNhap, TrangThaiDuyet, GhiChu);
    Lấy MaPhieuNhap vừa tạo;

    Với mỗi mặt hàng nhập:
        Ghi vào bảng CHI_TIET_NHAP_KHO;

        // Nếu giá trị <= 20M (Đã duyệt), cập nhật kho ngay lập tức:
        Nếu TrangThaiDuyet == "Đã duyệt":
            Cập nhật tồn kho: SAN_PHAM.SoLuongTon = SAN_PHAM.SoLuongTon + SoLuongNhap;
            Cập nhật giá vốn: SAN_PHAM.GiaNhap = GiaNhap;

BƯỚC 4: Ghi Audit Log và Thông báo
    Nếu TrangThaiDuyet == "Chờ Giám đốc duyệt":
        Thông báo cảnh báo: "Phiếu nhập vượt hạn mức 20.000.000 VNĐ (QD05) và đã được chuyển sang Chờ Giám đốc phê duyệt.";
    Ngược lại:
        Thông báo: "Lập phiếu nhập thành công và đã gia tăng số lượng tồn kho.";
```

---

### 4. Thuật giải Giám đốc Duyệt Phiếu Nhập Kho (`btnDuyetPhieu_Click`)
```text
Thuật giải (Giám đốc Phê Duyệt Phiếu Nhập):
BƯỚC 1: Kiểm tra quyền hạn
    Nếu MaVaiTro của người dùng hiện tại != 1 (Không phải Giám đốc):
        Thông báo lỗi: "Chỉ Giám đốc mới có thẩm quyền phê duyệt phiếu nhập vượt hạn mức!";
        Dừng thực hiện.

BƯỚC 2: Kiểm tra trạng thái phiếu
    Đọc NHAP_KHO theo MaPhieuNhap;
    Nếu TrangThaiDuyet != "Chờ Giám đốc duyệt":
        Thông báo: "Phiếu nhập không ở trạng thái chờ duyệt."; Dừng lại.

BƯỚC 3: Xử lý theo quyết định của Giám đốc
    Nếu Quyết định == "Từ chối":
        Cập nhật NHAP_KHO: TrangThaiDuyet = "Bị từ chối";
        Ghi Audit Log;
        Thông báo: "Đã từ chối phiếu nhập. Tồn kho không thay đổi.";
    Nếu Quyết định == "Phê duyệt":
        Đọc toàn bộ CHI_TIET_NHAP_KHO của MaPhieuNhap;
        Với mỗi sản phẩm:
            Cập nhật: SAN_PHAM.SoLuongTon = SAN_PHAM.SoLuongTon + SoLuongNhap;
            Cập nhật: SAN_PHAM.GiaNhap = GiaNhap;
        Cập nhật NHAP_KHO: TrangThaiDuyet = "Đã duyệt";
        Ghi Audit Log;
        Thông báo: "Đã phê duyệt phiếu nhập và cập nhật tăng tồn kho thành công.";
```

---

### 5. Thuật giải Kế toán Đối soát Tiền COD Cuối Ngày (`btnDoiSoat_Click` / QD04)
```text
Thuật giải (Kế toán Đối Soát Tiền Thu Hộ COD):
BƯỚC 1: Kiểm tra quyền hạn
    Nếu MaVaiTro không thuộc (Kế toán, Giám đốc, Admin):
        Thông báo lỗi: "Chỉ Kế toán hoặc cấp Quản lý mới có quyền đối soát COD.";
        Dừng lại.

BƯỚC 2: Kiểm tra vận đơn
    Đọc GIAO_HANG_COD theo MaGiaoHang;
    Nếu TrangThai != "Thành công":
        Thông báo lỗi: "Đơn giao hàng chưa hoàn thành, chưa thể đối soát tiền.";
        Dừng lại.

BƯỚC 3: Cập nhật đối soát
    Cập nhật GIAO_HANG_COD:
        TrangThai = "Đã đối soát";
        NgayDoiSoat = Thời điểm hiện tại;
    Ghi Audit Log vào NHAT_KY_HOAT_DONG;
    Thông báo thành công: "Đã đối soát tiền thu hộ COD cho đơn hàng.";
```

---

## IV. BẢNG THỐNG KÊ CÁC PHƯƠNG THỨC XỬ LÝ (METHOD CATALOG)

| STT | Tên hàm / API | Loại hàm | Tham số đầu vào (Tham trị) | Kết quả đầu ra | Nghiệp vụ liên quan |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `login` | Xử lý & Xác thực | `username`, `password` | Token JWT, Thông tin nhân viên, Quyền RBAC | YCHT01: Đăng nhập |
| 2 | `getProducts` | Tra cứu & Lọc | `keyword`, `categoryId`, `brandId`, `lowStock` | Danh sách Sản phẩm, Tồn kho | YCNV03, UC07: Tra cứu SP |
| 3 | `createInvoice` | Tính toán & Lưu trữ | `MaKhachHang`, `items[]`, `Voucher`, `HinhThuc` | MaHoaDon, Tổng tiền, Điểm cộng, Tiền thừa | YCNV01, UC01, QD01, QD02 |
| 4 | `processReturn` | Tính toán & Cập nhật | `MaHoaDon`, `items[]`, `LyDo` | MaDoiTra, Tổng tiền hoàn, Điểm trừ | QD02, BFD 1.3: Đổi trả hàng |
| 5 | `createReceipt` | Tính toán & Kiểm tra hạn mức | `MaNCC`, `items[]`, `GhiChu` | MaPhieuNhap, TrangThaiDuyet | YCNV02, UC02, QD03, QD05 |
| 6 | `approveReceipt` | Phê duyệt cấp quản lý | `MaPhieuNhap`, `action ('approve'/'reject')` | Kết quả cập nhật kho & giá vốn | QD05: Giám đốc duyệt nhập kho |
| 7 | `processStockCheck` | Kiểm kê & Tính tỷ lệ lệch | `items[]` (SL thực tế) | MaKiemKe, % lệch kho, Cảnh báo duyệt | QD03: Kiểm kê kho hàng |
| 8 | `reconcileDelivery` | Kế toán chốt sổ | `MaGiaoHang` | Cập nhật ngày & trạng thái đã đối soát | QD04: Đối soát COD |
| 9 | `getDashboardSummary` | Tính toán tổng hợp | Không | Doanh thu ngày, Lợi nhuận gộp, Cảnh báo | YCNV06, UC05, BM06 |
| 10 | `backupDatabase` | Kết xuất an toàn | Không | File JSON / SQL sao lưu dữ liệu | YCHT02: Sao lưu CSDL |
| 11 | `updateRolePermissions` | Quản trị RBAC | `roleId`, `permissions[]` | Cập nhật ma trận phân quyền | YCHT01, UC06: Phân quyền |
| 12 | `updateSystemParameter` | Cấu hình hệ thống | `key`, `GiaTri` | Cập nhật tham số THAM_SO | YCHT03: Cấu hình tham số |

