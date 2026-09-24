# QUY CHẾ VẬN HÀNH CÔNG CỤ CẤU HÌNH BIẾN PHÍ TRÊN ADMIN PORTAL & BẢNG GHI VẾT KIỂM TOÁN BẤT BIẾN
### (DYNAMIC COMMISSION CONFIGURATION ENGINE & IMMUTABLE AUDIT TRAIL PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-ADM-03*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015, Luật Thương mại 2005, Luật Giao dịch Điện tử 2023, Luật Kế toán 2015, Hợp đồng Đối tác Tiếp đón Thực địa và Quy chế Quản trị Nền tảng VinStay AI.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ MINH BẠCH BẤT BIẾN
Văn bản này quy định quy chế vận hành công cụ cấu hình tham số tài chính trực tiếp trên **Trang Quản Trị Hệ Thống (Admin Portal)**, cơ chế bảo đảm tính minh bạch kinh tế cho mạng lưới **Field Host** và quy chuẩn ghi vết kiểm toán không thể chỉnh sửa (Immutable Audit Trail) của nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Tôn chỉ vận hành tài chính nền tảng:
1. **Linh hoạt tối đa theo thị trường (Dynamic & Agile):** Cho phép Quản trị viên chủ động điều chỉnh thù lao lượt dẫn, hoa hồng chốt cọc và các gói thưởng nóng kích cầu bằng thanh trượt trực quan trên Admin Portal theo từng phân khu và mùa vụ thị trường.
2. **Minh bạch tuyệt đối (Absolute Transparency):** Mọi điều chỉnh tham số bắt buộc phải lưu vết kiểm toán bất biến (Audit Log) kèm lý do kinh doanh; nghiêm cấm tuyệt đối mọi hành vi can thiệp âm thầm hoặc thay đổi hồi tố làm phương hại thu nhập của đối tác.
3. **Phê duyệt kép an toàn (Maker - Checker Workflow):** Áp dụng quy trình kiểm soát rủi ro tài chính 2 lớp đối với các thay đổi tham số có quy mô ngân sách lớn.

---

## ĐIỀU 1. DANH MỤC THAM SỐ CẤU HÌNH TRỰC TIẾP TRÊN ADMIN PORTAL (`fee_configs`)
Toàn bộ các khoản chi phí, thù lao và hoa hồng của hệ thống được tham số hóa trong cơ sở dữ liệu `fee_configs` và hiển thị trực tiếp trên giao diện Admin Portal:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│             BẢNG CẤU HÌNH THAM SỐ TÀI CHÍNH TRỰC TIẾP TRÊN ADMIN PORTAL (FEE CONFIGS)            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [1] THÙ LAO LƯỢT DẪN TIÊU CHUẨN (base_viewing_fee) ─────────► Dải điều chỉnh: 30k – 100k VNĐ    │
│      Thù lao cố định chi trả cho Field Host khi hoàn thành 01 lượt dẫn khách xem phòng hợp lệ.   │
│                                                                                                  │
│  [2] HOA HỒNG CHỐT CỌC THÀNH CÔNG (deal_commission_pct / fix) ► Dải: 200k – 1.000k VNĐ hoặc %    │
│      Hoa hồng chi trả khi khách thuê hoàn tất ký cọc VietQR 2.000.000 VNĐ khóa căn 24h.          │
│                                                                                                  │
│  [3] HỆ SỐ NHÂN THƯỞNG 5 SAO (rating_multiplier_5star) ──────► Dải điều chỉnh: 1.1x – 1.5x       │
│      Hệ số nhân thù lao tự động kích hoạt khi khách bấm đánh giá 5★ trên tin nhắn Zalo OA.       │
│                                                                                                  │
│  [4] HỆ SỐ GIỜ CAO ĐIỂM / CUỐI TUẦN (peak_hour_multiplier) ──► Dải điều chỉnh: 1.1x – 1.5x       │
│      Kích hoạt tự động vào các khung giờ vàng (17h–20h ngày thường và cả ngày Thứ 7, Chủ Nhật). │
│                                                                                                  │
│  [5] THƯỞNG NÓNG CĂN KHÓ CHO THUÊ (slow_inventory_bonus) ────► Dải điều chỉnh: 100k – 500k VNĐ   │
│      Thưởng thêm cho Host chốt cọc các căn hộ tồn trống > 15 ngày thuộc Vùng Đỏ trên Heatmap.    │
│                                                                                                  │
│  [6] THÙ LAO KIỂM ĐỊNH BÀN GIAO (handover_inspection_fee) ───► Dải điều chỉnh: 50k – 100k VNĐ    │
│      Chi trả cho Host phối hợp lập Hộ chiếu bàn giao 10 hạng mục và chốt công tơ điện nước EVN. │
│                                                                                                  │
│  [7] TỶ LỆ BÙ THÙ LAO NO-SHOW (no_show_wait_allowance_pct) ──► Mặc định: 50% thù lao lượt dẫn   │
│      Tự động thanh toán vào ví Host khi khách vắng mặt sau 20 phút và 02 cuộc gọi ZCC không nghe.│
│                                                                                                  │
│  [8] PHẠT HỦY LỊCH MUỘN SÁT GIỜ (penalty_late_cancel) ───────► Mặc định: 50.000 VNĐ / lần        │
│      Khấu trừ thù lao đối với Host bấm hủy nhận ca dưới 15 phút trước giờ hẹn đón khách.         │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 2. GIAO DIỆN ĐIỀU KHIỂN BẰNG THANH TRƯỢT & MÔ PHỎNG DÒNG TIỀN (SIMULATOR)
1. **Điều khiển trực quan (Visual Sliders & Inputs):**
   - Quản trị viên chỉ cần kéo thanh trượt (Sliders) hoặc nhập số trực tiếp trên giao diện Admin Portal để thay đổi giá trị tham số.
   - Không đòi hỏi can thiệp mã nguồn lập trình (Zero-Code Adjustment), giúp đội ngũ vận hành phản ứng nhanh với biến động thị trường trong 30 giây.
2. **Công cụ mô phỏng tác động dòng tiền (Financial Impact Simulator):**
   - Trước khi bấm Lưu, Admin Portal tự động tính toán mô phỏng:
     * *Dự toán chi phí vận hành tuần thay đổi: $[+/-\Delta \%]$.*
     * *Thu nhập trung bình dự kiến của Field Host: $[+/-\Delta \%]$.*
     * *Biên độ lợi nhuận ròng của nền tảng (Net Operating Margin).*

---

## ĐIỀU 3. BỐN NGUYÊN TẮC MINH BẠCH BẤT BIẾN (IMMUTABLE TRANSPARENCY)
Mọi quyết định điều chỉnh cấu hình biến phí trên Admin Portal bắt buộc phải tuân thủ nghiêm ngặt 4 nguyên tắc sau:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         4 NGUYÊN TẮC MINH BẠCH TÀI CHÍNH BẤT BIẾN                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [NGUYÊN TẮC 1: NHẬT KÝ KIỂM TOÁN BẤT BIẾN (IMMUTABLE AUDIT LOG)]                                │
│  Mỗi lần bấm Lưu tham số, hệ thống tự động ghi 01 bản ghi vào bảng 'fee_configs_audit':          │
│  • Tên tham số & Giá trị cũ (Old Value) -> Giá trị mới (New Value).                              │
│  • ID Quản trị viên thực hiện (Changed By) + Địa chỉ IP + Timestamp chính xác đến mili-giây.    │
│  • Lý do kinh doanh bắt buộc (Business Reason) + Chữ ký số mã băm SHA-256 chống sửa xóa.        │
│                                                                                                  │
│  [NGUYÊN TẮC 2: TUYỆT ĐỐI KHÔNG ÁP DỤNG HỒI TỐ (STRICT NO-RETROACTIVITY)]                        │
│  Tham số mới CHỈ ÁP DỤNG cho các ticket được phát sinh KỂ TỪ THỜI ĐIỂM LƯU CẤU HÌNH trở về sau.   │
│  100% các ticket đã phát, đã nhận hoặc đang trong quá trình dẫn giữ nguyên mức thù lao cũ.      │
│                                                                                                  │
│  [NGUYÊN TẮC 3: THÔNG BÁO IN-APP THỜI GIAN THỰC (REAL-TIME PARTNER PUSH)]                        │
│  Hệ thống tự động bắn thông báo tức thì qua Zalo OA và Host App:                                 │
│  "Thông báo: VinStay AI cập nhật chính sách thù lao [Tên tham số] từ [Giờ:Ngày], chi tiết xem    │
│   tại mục Chính Sách Đối Tác trên ứng dụng".                                                     │
│                                                                                                  │
│  [NGUYÊN TẮC 4: BÓC TÁCH CÔNG THỨC THỜI GIAN THỰC (EARNING BREAKDOWN)]                           │
│  Trên màn hình Ví Thu Nhập của Host, mỗi khoản tiền cộng vào đều hiển thị công thức phân rã:     │
│  Ví dụ: [50.000đ (Gốc) x 1.2 (Đánh giá 5★) + 200.000đ (Thưởng căn hời) = 260.000 VNĐ].          │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 4. QUY TRÌNH PHÊ DUYỆT KÉP (MAKER - CHECKER WORKFLOW)
Nhằm ngăn chặn sai sót nhập liệu hoặc hành vi lạm quyền tư lợi:

1. **Phân loại ngưỡng thay đổi tham số:**
   * **Thay đổi Thông Thường (Mức độ 1):** Điều chỉnh tham số trong biên độ $\le 15\%$ (ví dụ: tăng thù lao từ 50k lên 55k) $\rightarrow$ *Finance Auditor (Kế toán)* có quyền duyệt trực tiếp.
   * **Thay đổi Trọng Yếu (Mức độ 2):** Điều chỉnh tham số vượt biên độ $> 15\%$ hoặc tổng ngân sách thưởng nóng phân khu vượt quá **10.000.000 VNĐ / tuần**:
2. **Quy trình Phê duyệt 2 Lớp (Maker - Checker):**
   * *Bước 1 (Đề xuất - Maker):* Chuyên viên Quản trị hoặc Area Operations Lead nhập thông số mới kèm văn bản giải trình lý do kích cầu.
   * *Bước 2 (Kiểm soát & Ký duyệt - Checker):* Hệ thống sinh mã OTP gửi về thiết bị bảo mật của **Super Admin (CTO)** hoặc **Giám Đốc Tài Chính (CFO)**. Khi Checker nhập đúng OTP, cấu hình mới chính thức có hiệu lực trên toàn hệ thống.

---

## ĐIỀU 5. QUYẾT TOÁN THÙ LAO TUẦN TỰ ĐỘNG & BẢNG KÊ MINH BẠCH (WEEKLY PAYOUT)
Admin Portal chịu trách nhiệm tự động hóa toàn bộ khâu chi trả thù lao cho mạng lưới Field Host:

1. **Chu kỳ quyết toán định kỳ (Weekly Payout Batch):**
   * Chu kỳ chốt số liệu: **23:59:59 Chủ Nhật hàng tuần**.
   * Hệ thống tự động tổng hợp toàn bộ lượt dẫn, hoa hồng chốt cọc, thưởng 5 sao và các khoản khấu trừ phạt vi phạm trong tuần của từng Host thành Bảng Kê Thu Nhập Cá Nhân.
2. **Xuất lệnh thanh toán 1-chạm (One-Click Bank Payout):**
   * Vào 09:00 sáng Thứ Hai, Finance Auditor mở giao diện Quyết Toán trên Admin Portal bấm nút **`[Xuất Lệnh Chi Ngân Hàng]`**:
     * Hệ thống xuất file định dạng chuẩn (Excel/CSV) kết nối cổng Open Banking của ngân hàng đối tác (VietinBank / Techcombank / VPBank).
     * Tiền được chuyển khoản tự động vào tài khoản ngân hàng chính chủ của Field Host kèm tin nhắn Zalo thông báo chi tiết trong vòng **02 giờ làm việc**.
3. **Lưu trữ hồ sơ thuế thu nhập cá nhân (TNCN):**
   * Hệ thống tự động khấu trừ thuế TNCN theo quy định của Tổng cục Thuế đối với hợp đồng dịch vụ đối tác và xuất chứng từ khấu trừ thuế điện tử cho Host vào cuối năm tài chính.

---

## ĐIỀU 6. QUY TRÌNH TIẾP NHẬN & PHÂN XỬ KHIẾU NẠI THÙ LAO
1. Trường hợp Field Host có khiếu nại về số tiền thù lao thực nhận (sai lệch lượt dẫn hoặc chưa được cộng thưởng nóng), Host bấm nút **`[Khiếu Nại Thu Nhập]`** trên Host App trong vòng **03 ngày làm việc** kể từ ngày nhận bảng kê.
2. Finance Auditor có nghĩa vụ kiểm tra đối soát chéo với nhật ký GPS Geofence và lịch sử Webhook ngân hàng; ra quyết định phân xử và hoàn trả tiền bổ sung (nếu có sai sót) trong vòng **24 giờ làm việc**.

---

## ĐIỀU 7. HIỆU LỰC THỰC THI
1. Quy chế này có hiệu lực áp dụng kể từ ngày công bố và là cơ sở pháp lý cao nhất điều chỉnh công tác quản trị tài chính, thù lao và hoa hồng trên nền tảng VinStay AI.
2. Mọi cán bộ quản trị có hành vi tự ý sửa đổi số liệu ngoài quy trình Maker - Checker hoặc can thiệp bất hợp pháp vào nhật ký kiểm toán sẽ bị xử lý kỷ luật sa thải và truy cứu trách nhiệm theo pháp luật.

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
