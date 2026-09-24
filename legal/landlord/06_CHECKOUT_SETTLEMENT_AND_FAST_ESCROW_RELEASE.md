# QUY TRÌNH NGHIỆM THU TÀI SẢN CUỐI KỲ, QUYẾT TOÁN CÔNG NỢ & GIẢI TỎA KÝ QUỸ THÔNG MINH 60 GIÂY
### (CHECKOUT SETTLEMENT, ASSET ACCEPTANCE & 60s SMART ESCROW RELEASE PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-LL-06*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015 (Điều 479 - Trả lại tài sản thuê, Điều 554-558 - Hợp đồng gửi giữ), Luật Nhà ở 2023, Nghị định 52/2024/NĐ-CP về thanh toán không dùng tiền mặt và Luật Giao dịch Điện tử 2023.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ THỰC THI
Văn bản này quy định quy trình nghiệm thu bàn giao trả nhà, đối soát hiện trạng tài sản, chốt công nợ dịch vụ và giải tỏa Tiền Cọc Bảo Đảm Tài Sản khi kết thúc hợp đồng thuê căn hộ tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**. 

Quy chế nhằm giải quyết triệt để **Nỗi đau số 3 và Nỗi đau số 4 của Chủ Nhà: Tranh chấp hư hao nội thất nảy lửa khi trả phòng và rủi ro bị bùng tiền điện nước EVN / phí gửi xe**. Bằng việc áp dụng Hộ chiếu bàn giao số, công nghệ so sánh ảnh AI và cơ chế Ký quỹ 3 bên bảo chứng ngân hàng, toàn bộ quy trình Check-out được chuẩn hóa thành một luồng tự động khép kín, minh bạch và giải ngân thông minh chỉ trong **60 giây**.

---

## ĐIỀU 1. ĐỊNH NGHĨA & NGUYÊN TẮC VẬN HÀNH "0% NỢ ĐỌNG CHO CHỦ NHÀ"
1. **Nghiệm Thu Không Tranh Chấp (Frictionless Checkout):** Toàn bộ việc đánh giá hiện trạng trả nhà đều dựa trên bằng chứng dữ liệu số đối chiếu trực tiếp với Hộ chiếu bàn giao số ban đầu (Baseline Check-in). Xóa bỏ hoàn toàn cãi cọ, cảm tính hay ép giá vô lý giữa hai bên.
2. **Cam Kết "0% Nợ Đọng Cho Chủ Nhà" (Zero-Debt Guarantee):** Tiền điện sinh hoạt EVN, tiền nước sinh hoạt và phí gửi xe ô tô/xe máy còn tồn đọng bắt buộc phải được đối soát dứt điểm và tự động cấn trừ thẳng vào Tiền Cọc Bảo Đảm Tài Sản trước khi hoàn trả cọc cho khách. Chủ nhà nhận lại căn hộ với tình trạng sạch công nợ 100%.
3. **Giải Tỏa Ký Quỹ Thông Minh 60 Giây (60s Smart Escrow Release):** Sau khi hai bên cùng ký số xác nhận Biên bản Thanh lý qua mã OTP Zalo/SMS, cổng thanh toán ngân hàng (MB Bank / Techcombank) tự động giải ngân phần tiền cọc tương ứng theo đúng bảng quyết toán trong vòng 60 giây.

---

## ĐIỀU 2. QUY TRÌNH 4 BƯỚC NGHIỆM THU THỰC ĐỊA & ĐỐI SOÁT HỘ CHIẾU SỐ
Quy trình trả nhà được Field Host nội khu thực hiện trực tiếp tại căn hộ trong vòng 15 phút:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      QUY TRÌNH 4 BƯỚC NGHIỆM THU CHECK-OUT & ĐỐI SOÁT HỘ CHIẾU SỐ                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BƯỚC 1] Field Host Đón Tiếp Tại Căn Hộ Đúng Giờ:                                                │
│          • Khách thuê đặt lịch trả phòng trước tối thiểu 03 ngày trên ứng dụng.                  │
│          • Field Host nội khu có mặt tại căn hộ đúng giờ hẹn, mở VinStay Field App.             │
│                                                                                                  │
│ [BƯỚC 2] Chụp Ảnh Đối Soát 10 Hạng Mục Nội Thất (Timestamp + Geofence):                          │
│          • Chụp ảnh 10 hạng mục ở cùng góc chụp và điều kiện ánh sáng tương đương lúc nhận nhà.  │
│          • Ảnh tự động gắn Dấu thời gian (Timestamp), Tọa độ GPS Geofence và mã băm SHA-256.    │
│                                                                                                  │
│ [BƯỚC 3] AI Phân Tích So Sánh Trước - Sau (AI Visual Inspection):                                │
│          • Thuật toán thị giác AI tự động so sánh ảnh Check-in vs Check-out trong 30 giây.       │
│          • Khoanh vùng sai khác và phân loại sơ bộ:                                              │
│            + Hao mòn tự nhiên (Fair Wear & Tear): Tường xỉn màu nhẹ, đệm lún nhẹ ──> Chủ nhà chịu.│
│            + Hư hỏng do bất cẩn (Damage): Sofa rách, sàn phồng ngấm nước, vỡ kính ──> Khách đền. │
│                                                                                                  │
│ [BƯỚC 4] Chốt Chỉ Số Công Tơ Điện Nước EVN Thời Gian Thực:                                       │
│          • Chụp ảnh mặt công tơ điện EVN và đồng hồ nước sinh hoạt.                              │
│          • Hệ thống tự động tính toán tiền điện nước lũy kế phát sinh theo bậc thang EVN.        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 3. THIẾT LẬP BẢNG QUYẾT TOÁN NGHIỆM THU SỐ (DIGITAL SETTLEMENT STATEMENT)
Ngay sau khi hoàn tất kiểm tra thực địa, hệ thống tự động sinh **Bảng Quyết Toán Nghiệm Thu Số** minh bạch đến từng đồng:

$$\text{Tiền Cọc Hoàn Lại Khách} = \text{Tiền Cọc Bảo Đảm Ban Đầu} - \text{Chi Phí Hư Hỏng Nội Thất} - \text{Công Nợ Điện Nước EVN} - \text{Phí Xe \& Phạt BQL}$$

1. **Khoản Tiền Cọc Bảo Đảm Ban Đầu:** Toàn bộ khoản tiền tương đương 1–2 tháng tiền thuê đang được lưu ký an toàn tại Tài khoản Ký quỹ 3 bên bảo chứng ngân hàng.
2. **Chi Phí Bồi Thường Hư Hỏng Nội Thất (nếu có):** Căn cứ theo danh mục hư hỏng thực tế được hai bên xác nhận và bảng báo giá vật tư/sửa chữa niêm yết công khai (khoản này được giải ngân trực tiếp cho Chủ nhà để khắc phục).
3. **Công Nợ Dịch Vụ Cấn Trừ:**
   - Tiền điện EVN lũy kế từ ngày chốt kỳ gần nhất đến thời điểm bàn giao.
   - Tiền nước sinh hoạt và tiền rác nội khu.
   - Phí gửi xe ô tô/xe máy còn nợ tại BQL Vinhomes Ocean Park.
   - Tiền phạt vi phạm nội quy BQL (nếu có biên bản xử lý chưa nộp).

---

## ĐIỀU 4. CƠ CHẾ GIẢI TỎA KÝ QUỸ THÔNG MINH 60 GIÂY (SMART RELEASE)
1. **Ký duyệt biên bản thanh lý số:**
   - Chủ nhà (theo dõi từ xa trên ứng dụng tại nhà) và Khách thuê (tại căn hộ) kiểm tra Bảng Quyết Toán Nghiệm Thu Số.
   - Hai bên bấm nút **"Xác nhận & Ký Thanh Lý"** bằng mã xác thực **OTP gửi qua Zalo/SMS**.
2. **Giải ngân tự động trong 60 giây:**
   - Ngay khi nhận đủ 02 chữ ký OTP hợp lệ, hệ thống gửi lệnh API có chữ ký số sang Ngân hàng đối tác (MB Bank / Techcombank).
   - Ngân hàng tự động thực hiện lệnh giải tỏa kép:
     * **Chuyển khoản tức thì cho Chủ Nhà:** Tiền bồi thường hư hỏng tài sản + Tiền điện nước/dịch vụ cấn trừ.
     * **Chuyển khoản tức thì cho Khách Thuê:** Số dư tiền cọc còn lại sau khi trừ các khoản trên.
   - Hai bên nhận thông báo biến động số dư tài khoản ngân hàng trong vòng **60 giây**.

---

## ĐIỀU 5. CƠ CHẾ PHÊ DUYỆT THỤ ĐỘNG BẢO VỆ CHỦ NHÀ (PASSIVE APPROVAL SLA 07 NGÀY)
Nhằm triệt tiêu rủi ro Khách thuê cố tình gây khó dễ, không hợp tác, từ chối ký biên bản hoặc tự ý dọn đồ bỏ đi:
1. **Kích hoạt quy trình thông báo chính thức:**
   - Nếu Khách thuê không có mặt bàn giao hoặc từ chối bấm ký OTP sau buổi kiểm tra của Field Host, hệ thống gửi Bảng Quyết Toán kèm toàn bộ ảnh bằng chứng qua Zalo ZNS, Email và Tin nhắn SMS có giá trị pháp lý.
2. **Áp dụng cơ chế Passive Approval:**
   - Khách thuê có thời hạn tối đa **07 (bảy) ngày làm việc** để đưa ra văn bản khiếu nại chính thức kèm bằng chứng phản hồi.
   - Nếu quá thời hạn 07 ngày làm việc mà Khách thuê **không phản hồi hoặc không khiếu nại hợp lệ**, hệ thống sẽ **TỰ ĐỘNG PHÊ DUYỆT BẢNG QUYẾT TOÁN (PASSIVE APPROVAL)**.
   - Cổng ngân hàng tự động giải ngân chi phí bồi thường hư hại và công nợ điện nước cho Chủ nhà; phần tiền cọc còn lại (nếu có) được hoàn trả về tài khoản nguồn mà khách đã dùng chuyển cọc trước đây. Chủ nhà được bảo vệ 100% quyền lợi tài chính mà không bị tắc nghẽn dòng tiền.

---

## ĐIỀU 6. THU HỒI QUYỀN TRUY CẬP & BẢO MẬT CĂN HỘ SAU CHECK-OUT
1. **Vô hiệu hóa quyền truy cập:** Ngay sau khi ký biên bản thanh lý số, hệ thống tự động:
   - Thu hồi mã mở cửa tạm thời của khách thuê và Field Host trên hệ thống.
   - Hủy bỏ quyền sử dụng thẻ cư dân thang máy đối với khách thuê.
2. **Thiết lập an ninh mới cho căn hộ:**
   - Hệ thống tự động gửi thông báo hướng dẫn Chủ nhà đổi mã số khóa cửa điện tử mới (hoặc Field Host niêm phong chìa cơ đưa về lưu kho an toàn tại Văn phòng Phân khu).
3. **Tái kích hoạt giỏ hàng tìm khách mới trong 30 giây:**
   - Căn hộ tự động chuyển trạng thái sang `available` trên hệ thống VinStay AI.
   - Thuật toán **AI Matchmaker** lập tức quét tệp khách hàng tiềm năng đang có nhu cầu All-in Cost phù hợp để gợi ý và xếp lịch xem phòng mới trong vòng 24–48 giờ, rút ngắn thời gian trống phòng giữa hai chu kỳ thuê xuống dưới 07 ngày!

---

## ĐIỀU 7. HIỆU LỰC THI HÀNH
1. Quy chế này có hiệu lực kể từ thời điểm các bên ký kết Hợp đồng Thuê Căn hộ Chính thức và là điều khoản bắt buộc của quy trình thanh lý hợp đồng.
2. Dữ liệu nghiệm thu, hình ảnh kiểm định và nhật ký giải tỏa ký quỹ được lưu trữ vĩnh viễn trên cơ sở dữ liệu mã hóa của VinStay AI theo tiêu chuẩn **Nghị định 13/2023/NĐ-CP** và Luật Giao dịch Điện tử 2023.

---
*Văn bản thuộc Hệ thống Pháp lý Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
