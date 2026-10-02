<!-- nguồn: docs/SAD_v2.md, dòng 529–582 -->
## 10. KHUNG PHÁP LÝ & KÝ SỐ ⚖️

> **Cảnh báo:** Mục này mô tả **thiết kế kỹ thuật dự kiến**, chưa được luật sư/pháp chế xác nhận. Bản Enterprise trích dẫn số điều/khoản cụ thể và khẳng định hiệu lực pháp lý "tối cao"; v2 **không** lặp lại các khẳng định đó. Các trích dẫn gốc được liệt kê ở Phụ lục B để kiểm chứng. Không dùng tài liệu này như bằng chứng đã có ý kiến pháp lý.

### 10.1 Văn bản pháp luật liên quan (cấp tên văn bản — số điều do pháp chế xác định)

| Chủ đề                                     | Văn bản liên quan                                                                                                             | Cần pháp chế xác nhận                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hợp đồng thuê nhà ở                        | Luật Nhà ở 2023                                                                                                               | Hình thức hợp đồng, công chứng/chứng thực có bắt buộc không                                           |
| Giao dịch/chữ ký điện tử                   | Luật Giao dịch điện tử 2023                                                                                                   | Ký tay cảm ứng + OTP có phải "chữ ký điện tử" đáp ứng điều kiện độ tin cậy không; giá trị chứng cứ    |
| Dịch vụ môi giới/quản lý BĐS               | Luật Kinh doanh Bất động sản 2023                                                                                             | Tư cách pháp lý của VinStay và Field Host (CTV); yêu cầu chứng chỉ/đăng ký; hình thức hợp đồng ký gửi |
| Đặt cọc, thuê, ủy quyền, dịch vụ           | Bộ luật Dân sự 2015                                                                                                           | Quy chế đặt cọc/hoàn/tịch thu; quan hệ ba bên                                                         |
| Dữ liệu cá nhân                            | **Luật BVDLCN 2025 (91/2025/QH15) + NĐ 356/2025/NĐ-CP** (hiệu lực 01/01/2026, thay NĐ 13/2023 — theo tra cứu ngày 24/09/2026) | Consent, đánh giá tác động, hợp đồng xử lý dữ liệu với vendor, thời hạn lưu                           |
| Dòng tiền cọc                              | Quy định về thanh toán/trung gian thanh toán, thu hộ–chi hộ                                                                   | Nền tảng giữ/nhận tiền cọc có cần giấy phép hay phải thông qua cấu trúc ngân hàng?                    |
| Dịch vụ tin cậy (dấu thời gian, chứng thư) | Luật GDĐT 2023 và văn bản hướng dẫn                                                                                           | Nhà cung cấp TSA/CA được công nhận ở VN                                                               |

### 10.2 Ba loại tài liệu ký trên nền tảng

| Tài liệu                                    | Các bên                                     | Phương thức dự kiến                        |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| Hợp đồng Ký gửi Quản lý Độc quyền (Mandate) | Chủ nhà ↔ VinStay                           | Ký tay cảm ứng + Zalo OTP chủ nhà          |
| Thỏa thuận cọc giữ chỗ (7 ngày)             | Khách ↔ VinStay ↔ Chủ nhà                   | VietQR 2.000.000đ + eKYC + Zalo OTP khách  |
| Hợp đồng thuê chính thức                    | Chủ nhà ↔ Khách (VinStay làm chứng/quản lý) | Ký hai đầu từ xa: OTP khách và OTP chủ nhà |

### 10.3 Quy trình ký Hybrid 4 bước (🔵 ⚖️ giá trị pháp lý chờ xác nhận)

1. **Xác thực danh tính** qua eKYC + C06 (§7) — điền tự động các trường đã xác thực vào tài liệu.
2. **Tóm tắt điều khoản cốt lõi** (mã căn, All-in Cost, mức cọc, điều khoản thoát 15 ngày, quy chế BQL) — người ký xem trước khi ký.
3. **Ký:** vẽ chữ ký trên canvas + OTP 6 số qua Zalo ZNS tới SĐT chính chủ (SMS dự phòng).
4. **Niêm phong:** SHA-256 của PDF + dấu thời gian RFC 3161 + chứng thư số máy chủ (🟡 nhà cung cấp TSA/CA chưa chọn); gửi PDF cho các bên qua Zalo OA.

Mỗi lần ký lưu: `signer`, `method`, `otp_verified_at`, IP, user-agent, thời điểm, vector chữ ký.

### 10.4 Thoát ủy quyền 15 ngày (✅)

1. Chủ nhà gửi yêu cầu hủy trên Portal.
2. Hệ thống kiểm tra: căn phải ở `available` (không `holding`, không hợp đồng hiệu lực) **và** chủ nhà báo trước ≥ 15 ngày. Căn đang `holding` → từ chối cho đến khi hết 7 ngày hoặc ký hợp đồng.
3. Worker chạy `mandate_termination_countdown` 15 ngày; các lịch đã hẹn vẫn được phục vụ trừ khi chủ nhà đóng lịch (lịch trong ngày: hoàn tất rồi mới bắt đầu đếm).
4. Hết hạn: căn → `unlisted`, **`KeySvc` thu hồi mã/chìa và xóa khỏi hệ thống Host**, xuất biên bản thanh lý gửi Zalo chủ nhà.

### 10.5 Cọc giữ chỗ 7 ngày & ký quỹ (🔵 🟡 ⚖️)

- Cọc cố định **2.000.000đ**, VietQR động; cú pháp `COC [Mã căn] [SĐT khách]`; nhúng `host_id` (Attribution Lock).
- Khi webhook xác nhận: căn `HOLDING` **7 ngày** (§6.3).
- Khi ký hợp đồng thuê: khoản cọc chuyển thành một phần **Tiền cọc bảo đảm** giữ nguyên suốt kỳ thuê, **không khấu trừ vào tiền thuê tháng đầu** (quy tắc nghiệp vụ đề xuất).
- Hoàn cọc khi thanh lý (đề xuất ≤ 48 giờ sau khi đối soát công tơ/hư hại và chủ nhà duyệt).
- **Chưa chốt:** mô hình tài khoản (ký quỹ ba bên hay cách khác), chính sách hoàn/tịch thu khi hết 7 ngày không ký, tỷ lệ hoàn khi khách hủy. → §19 #2, #8, #14.

### 10.6 Gói chứng cứ pháp lý (🔵 ⚖️)

Với mỗi tài liệu ký, sinh **Evidence Manifest (JSON)**: `document_id`, `document_sha256`, dấu thời gian, danh sách bên ký (tham chiếu kết quả eKYC — không nhúng ảnh CCCD), chữ ký + bằng chứng OTP, `network_audit` (IP, user-agent, thời điểm), tham chiếu giao dịch ngân hàng. Thời hạn lưu: 🟡 pháp chế xác nhận (bản Enterprise ghi 10 năm nhưng chưa dẫn căn cứ đã kiểm chứng).

---

