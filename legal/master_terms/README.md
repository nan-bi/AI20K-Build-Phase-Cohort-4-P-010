# THƯ MỤC HỢP ĐỒNG CHUNG & ĐIỀU KHOẢN GIAO KẾT ĐIỆN TỬ VINSTAY AI
### (MASTER ELECTRONIC TERMS & LEASE AGREEMENT DIRECTORY)

> **MỤC ĐÍCH THIẾT LẬP THƯ MỤC RIÊNG BIỆT:**  
> Thư mục `legal/master_terms/` được tổ chức độc lập và chuyên biệt nhằm tập hợp toàn bộ hồ sơ pháp lý - công nghệ liên quan đến cơ chế **Hợp đồng Chung dưới dạng Điều khoản Giao dịch Điện tử (Click-wrap Master E-Contract)**. Cấu trúc này giúp Ban Lãnh đạo, Cố vấn Pháp lý (Legal Counsel), Đội ngũ Kỹ thuật (Dev Team) và Cơ quan Kiểm toán/Tòa án dễ dàng tra cứu, đánh giá, kiểm thử và tiến hành sửa đổi, cập nhật sau này một cách an toàn, minh bạch và có phiên bản rõ ràng.

---

## 1. DANH MỤC TÀI LIỆU TRONG THƯ MỤC

| Tên Tệp Tài Liệu | Mục Đích & Vai Trò Pháp Lý | Đối Tượng Sử Dụng Chính |
| :--- | :--- | :---: |
| **[`01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md`](file:///Users/duy/Documents/antigravity/resilient-mendeleev/P-010/legal/master_terms/01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md)** | **Văn bản Hợp đồng & Điều khoản Dịch vụ cốt lõi (Core Agreement)** gồm 14 điều khoản quy chuẩn; xác lập hiệu lực pháp lý ràng buộc khi khách thuê tích chọn [Đồng ý] + eKYC CCCD FPT.AI + mã xác thực Zalo OTP. | Khách thuê, Chủ nhà, Tòa án, Trọng tài |
| **[`02_GIAI_TRINH_CO_SO_PHAP_LY_CLICKWRAP_EKYC.md`](file:///Users/duy/Documents/antigravity/resilient-mendeleev/P-010/legal/master_terms/02_GIAI_TRINH_CO_SO_PHAP_LY_CLICKWRAP_EKYC.md)** | **Bản Giải trình Cơ sở Pháp lý & Khả năng Thi hành (Legal Memo)** trích dẫn và phân tích đối chiếu chuyên sâu từng điều luật: Khoản 2 Điều 164 Luật Nhà ở 2023, Điều 9, 23, 34-35 Luật Giao dịch điện tử 2023, Điều 119 & 405 BLDS 2015, Nghị định 13/2023/NĐ-CP. | Luật sư, Cố vấn Pháp lý, Hội đồng Quản trị |
| **[`03_QUY_TRINH_GIAO_KET_VA_GOI_CHUNG_CU_SO.md`](file:///Users/duy/Documents/antigravity/resilient-mendeleev/P-010/legal/master_terms/03_QUY_TRINH_GIAO_KET_VA_GOI_CHUNG_CU_SO.md)** | **Đặc tả Kỹ thuật - Pháp lý (Technical & Evidence Spec)** mô tả luồng UI/UX 4 bước, kiến trúc CSDL Cọc linh hoạt do Admin quản trị (`units.holding_deposit_amount`), cấu trúc JSON Gói Chứng cứ Điện tử (Audit Trail) và script kiểm tra toàn vẹn SHA-256. | Dev Team, DevOps, Kiểm toán viên Hệ thống |
| **[`README.md`](file:///Users/duy/Documents/antigravity/resilient-mendeleev/P-010/legal/master_terms/README.md)** | **Chỉ mục tổng quan, Ma trận đối chiếu nghiệp vụ** và Quy trình hướng dẫn rà soát, đánh giá, sửa đổi điều khoản sau này. | Toàn bộ các bên liên quan |

---

## 2. MA TRẬN ĐỐI CHIẾU 4 NỖI ĐAU CỦA CHỦ NHÀ (`AGENTS.md`)

Mọi điều khoản trong bộ tài liệu này đều được thiết kế để giải quyết triệt để 4 nỗi đau thực tế của Chủ nhà căn hộ tại Vinhomes Ocean Park:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│             MA TRẬN GIẢI QUYẾT 4 NỖI ĐAU CỦA CHỦ NHÀ QUA HỢP ĐỒNG ĐIỆN TỬ VINSTAY AI             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [1. TRỐNG PHÒNG KÉO DÀI & THIỆT HẠI TÀI CHÍNH KÉP (PRE-LEASING VACANCY)]                        │
│  • Giải pháp pháp lý: Cọc giữ chỗ linh hoạt (Dynamic Holding Deposit) qua VietQR động.            │
│  • Khóa căn 'HOLDING' trong 24h ngay khi quét QR, chặn đứng khách ảo / do dự so đo.             │
│  • Mức cọc do Admin cấu hình linh động theo căn hộ đầu vào (tham chiếu chuẩn 2.000.000 VNĐ).     │
│  ==> Quy định chi tiết tại: ĐIỀU 5 (01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md)           │
│                                                                                                  │
│  [2. CỰC HÌNH ĐI XA 20-30KM MỞ CỬA & MÔI GIỚI LÀM PHIỀN (DISTANCE & BROKER CHAOS)]              │
│  • Giải pháp pháp lý: Chủ nhà ở nhà 100%. Field Host nội khu dùng thẻ cư dân RFID đón sảnh.      │
│  • Cấp mã mở cửa JIT qua App khi có mặt trước cửa. Tuyệt đối KHÔNG dùng Lockbox vi phạm BQL.    │
│  • Xác thực Zalo OTP chính chủ + Nhắc hẹn T-10m loại trừ 100% no-show và môi giới ăn cắp ảnh.   │
│  ==> Quy định chi tiết tại: ĐIỀU 3 & ĐIỀU 6 (01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md)   │
│                                                                                                  │
│  [3. TRANH CHẤP HƯ HAO NỘI THẤT & RỦI RO TIỀN CỌC (DEPOSIT & ASSET DISPUTES)]                    │
│  • Giải pháp pháp lý: Hộ chiếu Bàn giao số 10 hạng mục nội thất nhúng Timestamp + GPS Geofence. │
│  • Phân định rõ ràng: Hao mòn tự nhiên (Chủ nhà chịu) vs Hư hỏng do bất cẩn (Khách bồi thường).   │
│  • QUY TẮC VÀNG: Cọc giữ chỗ chuyển đổi 100% thành Tiền Cọc Bảo Đảm Tài Sản (Security Deposit),  │
│    TUYỆT ĐỐI KHÔNG KHẤU TRỪ VÀO TIỀN THUÊ THÁNG ĐẦU để bảo vệ trọn vẹn tài sản chủ nhà.        │
│  ==> Quy định chi tiết tại: ĐIỀU 5 & ĐIỀU 7 (01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md)   │
│                                                                                                  │
│  [4. KHỦNG HOẢNG BẢO TRÌ VẶT & RỦI RO BỊ BQL PHẠT / BÙNG TIỀN DỊCH VỤ (OPERATIONS & RULES)]      │
│  • Giải pháp pháp lý: Vận hành tinh gọn Asset-Light (giới thiệu Danh bạ Thợ kỹ thuật ngoài).   │
│  • VinStay AI và Field Host KHÔNG làm tổng thầu sửa chữa, miễn trừ rủi ro thi công.              │
│  • Số hóa Nội quy BQL Vinhomes: Tự động khấu trừ tiền phạt trực tiếp từ Tiền Cọc Bảo Đảm.        │
│  • Chốt công tơ điện nước EVN có timestamp, đối soát 0% nợ đọng mới hoàn cọc.                    │
│  ==> Quy định chi tiết tại: ĐIỀU 8, 9 & 10 (01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md)  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CƠ CHẾ CỌC GIỮ CHỖ LINH HOẠT DO ADMIN QUẢN LÝ (DYNAMIC DEPOSIT)
Khác với việc ấn định cứng một mức cọc 2.000.000 VNĐ cho toàn bộ các căn hộ, hệ thống VinStay AI áp dụng mô hình **Cọc Giữ Chỗ Linh Hoạt (Dynamic Holding Deposit)**:
1. **Quản trị tại đầu vào:** Khi chủ nhà ký gửi hoặc khi duyệt thông tin căn hộ, mức cọc giữ chỗ `holding_deposit_amount` được thiết lập tại bảng dữ liệu căn hộ và được **Quản trị viên (Admin)** phê duyệt.
2. **Khung tham chiếu:**
   * Căn Studio / 1PN The Sapphire: Chuẩn hóa 2.000.000 VNĐ (biến thiên 1.5M – 2.5M).
   * Căn 2PN The Sapphire: 2.500.000 VNĐ (biến thiên 2.0M – 3.5M).
   * Căn 3PN The Sapphire / The Pavilion: 3.000.000 VNĐ (biến thiên 2.5M – 4.0M).
   * Phân khu The Zenpark / Masteri Waterfront (Full nội thất cao cấp): 3.500.000 – 5.000.000 VNĐ.
3. **Quy tắc bất biến khi ký kết:** Dù mức cọc giữ chỗ là bao nhiêu, khi phát sinh Hợp đồng chính thức, khoản cọc này **luôn luôn được chuyển đổi 100% thành Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)** và **không được khấu trừ vào tiền thuê tháng đầu tiên**.

---

## 4. HƯỚNG DẪN DÀNH CHO CỐ VẤN PHÁP LÝ KHI ĐÁNH GIÁ & RÀ SOÁT
Khi Cố vấn Pháp lý hoặc Luật sư tiếp nhận thư mục này để đánh giá, vui lòng rà soát theo danh sách kiểm tra (Legal Checklist) 5 tiêu chí sau:

- [x] **Tiêu chuẩn không công chứng:** Đối chiếu Điều 14 của Hợp đồng với Khoản 2 Điều 164 Luật Nhà ở 2023.
- [x] **Tính hợp lệ của Click-wrap & eKYC:** Đối chiếu Điều 3 với Điều 405 BLDS 2015 và Điều 9, 23, 34-35 Luật Giao dịch điện tử 2023.
- [x] **Bảo vệ quyền sở hữu của Chủ nhà:** Kiểm tra Điều 5 (Không cấn trừ cọc giữ chỗ vào tiền thuê), Điều 7 (Hộ chiếu bàn giao 10 hạng mục) và Điều 8 (Khấu trừ phạt BQL).
- [x] **Tuân thủ Quyền riêng tư:** Kiểm tra Điều 11 về cơ chế Zero-Storage (0 byte ảnh CCCD lưu trên server) đối chiếu với Nghị định 13/2023/NĐ-CP.
- [x] **Khả năng làm chứng cứ tại Tòa:** Kiểm tra Điều 13 và đối chiếu cấu trúc JSON trong tệp `03_QUY_TRINH_GIAO_KET_VA_GOI_CHUNG_CU_SO.md` với Điều 94, 95 Bộ luật Tố tụng Dân sự 2015.

---

## 5. QUY TRÌNH SỬA ĐỔI & QUẢN LÝ PHIÊN BẢN (AMENDMENT & VERSION CONTROL SOP)
Khi cần điều chỉnh, cập nhật bất kỳ điều khoản nào trong tương lai, các bên bắt buộc tuân thủ quy trình 4 bước sau:

1. **Bước 1 — Tạo nhánh tính năng riêng biệt trên Git:**
   * Tạo nhánh mới từ `main` theo quy tắc đặt tên: `legal/update-[tên-nội-dung]-[năm-tháng]` (Ví dụ: `legal/update-deposit-threshold-2026`).
2. **Bước 2 — Sửa đổi đồng bộ trên cả 3 tệp tài liệu:**
   * Cập nhật nội dung điều khoản tại `01_HOP_DONG_THUE_CAN_HO_VA_DIEU_KHOAN_DIEN_TU.md`.
   * Bổ sung căn cứ giải trình tại `02_GIAI_TRINH_CO_SO_PHAP_LY_CLICKWRAP_EKYC.md` (nếu có thay đổi về mặt luật định).
   * Điều chỉnh cấu trúc trường dữ liệu kỹ thuật tại `03_QUY_TRINH_GIAO_KET_VA_GOI_CHUNG_CU_SO.md` (nếu có thay đổi về luồng dữ liệu).
   * Tăng số phiên bản tại phần đầu tệp (Ví dụ: từ `Version 2.0` lên `Version 2.1`).
3. **Bước 3 — Thẩm định chéo (Cross-functional Review):**
   * Cố vấn Pháp lý xác nhận tính tuân thủ luật Việt Nam.
   * Lead Developer xác nhận tính tương thích với cơ sở dữ liệu Supabase/PostgreSQL và giao diện người dùng Next.js.
4. **Bước 4 — Phê duyệt Pull Request và Đồng bộ:**
   * Tạo Pull Request trên GitHub repository của nhóm.
   * Sau khi được phê duyệt và merge vào `main`, phiên bản mới chính thức có hiệu lực trên toàn hệ thống VinStay AI.
