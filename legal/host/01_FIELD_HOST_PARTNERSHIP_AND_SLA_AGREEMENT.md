# HỢP ĐỒNG HỢP TÁC ĐỐI TÁC THỰC ĐỊA & TIÊU CHUẨN TIẾP ĐÓN KHÁCH THUÊ (SLA 3 PHÚT)
### (FIELD HOST PARTNERSHIP & SERVICE LEVEL AGREEMENT - SLA)
*Mã văn bản: VINSTAY-LEGAL-FH-01*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015 (Điều 513-521 - Hợp đồng dịch vụ), Luật Thương mại 2005, Luật Giao dịch Điện tử 2023 và Quy chế Vận hành Đại đô thị Vinhomes Ocean Park.*

---

## LỜI MỞ ĐẦU & NGUYÊN TẮC HỢP TÁC
Văn bản này xác lập quan hệ hợp tác cung ứng dịch vụ thực địa độc lập giữa **Nền tảng Vận hành Cho thuê VinStay AI** (sau đây gọi là **"VinStay AI"**) và **Đối tác Tiếp đón Thực địa** (sau đây gọi là **"Field Host"**). 

Hợp đồng được thiết kế nhằm xây dựng mạng lưới tiếp đón chuyên nghiệp, đúng giờ, thân thiện tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**, vận hành theo mô hình biến phí linh hoạt (**Asset-Light 100% — Zero Fixed OpEx Trap**), bảo đảm tiêu chuẩn tiếp đón thần tốc với **SLA tiếp nhận ticket trong 3 phút** và quẹt thẻ thang máy dẫn khách lên căn hộ trong **60 giây**.

---

## ĐIỀU 1. ĐỊNH NGHĨA & BẢN CHẤT ĐỐI TÁC ĐỘC LẬP (INDEPENDENT CONTRACTOR)
1. **Đối Tác Tiếp Đón Thực Địa (Field Host):** Cá nhân là cư dân đang sinh sống, học tập (sinh viên Đại học VinUniversity, cư dân Ocean Park) hoặc làm việc thường trực tại các phân khu Vinhomes Ocean Park, đã hoàn tất xác thực danh tính điện tử qua AI OCR CCCD, vượt qua bài kiểm tra quy chuẩn tiếp đón và được cấp chứng chỉ số hoạt động trên nền tảng VinStay AI.
2. **Bản Chất Hợp Tác Dịch Vụ Độc Lập:** Field Host là đối tác cung ứng dịch vụ độc lập (Freelance Partner), chủ động hoàn toàn về thời gian nhận việc và khu vực hoạt động. Hợp tác này **KHÔNG PHẢI LÀ QUAN HỆ LAO ĐỘNG HƯỞNG LƯƠNG CỨNG**, không phát sinh nghĩa vụ lương cố định hàng tháng từ VinStay AI, giúp giải phóng nền tảng khỏi bẫy chi phí vận hành cố định (Fixed OpEx Trap) trong mùa thấp điểm.
3. **Thẻ Cư Dân Thang Máy Hợp Lệ (RFID Access Card):** Thẻ cư dân chính thức do Ban Quản lý (BQL) Vinhomes phát hành cho Field Host, đã được phân quyền truy cập thang máy các tòa nhà thuộc phân khu đăng ký tiếp đón.

---

## ĐIỀU 2. THUẬT TOÁN ĐIỀU PHỐI AUTO-DISPATCH 3 TẦNG & SLA 3 PHÚT
Nhằm triệt tiêu triệt để tình trạng tranh giành khách (Lead Cannibalization) hoặc để khách phải chờ đợi lâu tại sảnh, hệ thống áp dụng thuật toán phân bổ tự động 3 tầng:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                  THUẬT TOÁN AUTO-DISPATCH 3 TẦNG & CAM KẾT TIẾP NHẬN TICKET (SLA)                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [TẦNG 1] Host Cùng Tòa / Cùng Phân Khu (Bán Kính ≤ 200m) ── SLA: 60 Giây                         │
│          • Thuật toán quét Host đang Online, có trạng thái Rảnh và ở gần nhất.                  │
│          • Ticket được bắn độc quyền tới Host Tầng 1. Host có 60 giây để bấm "Nhận Ticket".       │
│                                                                                                  │
│ [TẦNG 2] Mở Bể Chung Phân Khu (Open Pool Bán Kính ≤ 500m) ── SLA: 120 Giây                      │
│          • Nếu sau 60 giây Host Tầng 1 không nhận hoặc từ chối:                                  │
│          • Ticket tự động chuyển vào Open Pool cho tất cả các Host trong bán kính 500m.         │
│          • Cơ chế tiếp nhận: Ai bấm trước nhận trước (First-Come, First-Served).                 │
│                                                                                                  │
│ [TẦNG 3] Chuyển Cấp Khẩn Cấp (Escalate to Area Lead) ── SLA: Sau 3 Phút                         │
│          • Nếu sau 3 phút chưa có Host nào tiếp nhận:                                            │
│          • Hệ thống tự động kích hoạt chuông cảnh báo tới Trưởng Phân Khu (Area Lead) để trực   │
│            tiếp chỉ định nhân sự tiếp đón, bảo đảm 100% khách không bị bỏ rơi tại sảnh.         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Chỉ số SLA Bắt buộc đối với Field Host:**
  * Thời gian phản hồi tiếp nhận ticket: **$\le 03$ phút** kể từ thời điểm nhận thông báo.
  * Tỷ lệ nhận ticket thành công (Acceptance Rate): Duy trì tối thiểu **$\ge 80\%$** trong tháng.
  * Tỷ lệ hoàn thành buổi xem phòng (Completion Rate): Đạt tối thiểu **$\ge 95\%$**.

---

## ĐIỀU 3. TIÊU CHUẨN TIẾP ĐÓN TẠI SẢNH TÒA NHÀ (LOBBY RECEPTION STANDARDS)
Field Host có nghĩa vụ thực hiện đúng 5 quy chuẩn tiếp đón văn minh, chuyên nghiệp:
1. **Quy chuẩn thời gian (Quy trình Nhắc hẹn kép T-10m):**
   * Đúng 10 phút trước giờ hẹn, khi nhận được thông báo T-10m từ hệ thống, Field Host bắt buộc phải di chuyển xuống sảnh tầng 1 của tòa nhà để sẵn sàng đón khách.
2. **Tác phong & Nhận diện thương hiệu:**
   * Trang phục lịch sự, gọn gàng, mang giày hoặc dép quai hậu kín đáo.
   * Đeo thẻ đối tác VinStay AI định danh (hiển thị Họ tên, Mã Host và mã QR chứng chỉ nghiệp vụ).
   * Thái độ niềm nở, chủ động chào hỏi khách khi khách bấm nút *"Tôi đã có mặt tại sảnh"*.
3. **Thao tác quẹt thẻ thang máy thần tốc (60 giây):**
   * Sử dụng thẻ cư dân RFID hợp lệ đưa khách qua cửa an ninh và quẹt thang máy lên đúng tầng căn hộ trong vòng **60 giây** kể từ khi gặp khách tại sảnh.
   * Tuyệt đối **KHÔNG ĐƯỢC ĐI KÉ THANG MÁY** của cư dân khác, không bấm nhờ thang máy gây mất mỹ quan và phiền toái cho cư dân tòa nhà.
4. **Tuyệt đối cấm dán mã QR bừa bãi tại sảnh:**
   * Nghiêm cấm mọi hành vi in ấn hoặc dán mã QR, tờ rơi tiếp đón tại sảnh chờ, vách kính hay bảng tin của tòa nhà (vi phạm nghiêm trọng quy chế BQL Vinhomes).

---

## ĐIỀU 4. QUY TRÌNH DẪN XEM PHÒNG & CẤP MÃ MỞ CỬA TỨC THỜI (JIT ACCESS)
1. **Xác nhận vị trí trước cửa căn hộ:**
   - Khi dẫn khách lên tới cửa căn hộ, Field Host mở Host Mobile PWA và bấm nút **"Xác nhận đã tới trước cửa căn hộ"**.
   - Hệ thống kiểm tra tọa độ GPS Geofence thực tế của thiết bị ($\le 50m$ so với tòa nhà) và tự động giải mã cấp mã mở cửa tức thời (**Just-in-Time Access Code**) hiển thị trên màn hình của Host.
   - Phiên mở cửa có hiệu lực tối đa trong **45 phút**.
2. **Quy chuẩn tiếp đón & Mở cửa chính thống:**
   - Toàn bộ việc mở cửa căn hộ được thực hiện an toàn qua mã mở cửa điện tử tức thời JIT trên ứng dụng (phiên hiệu lực 45 phút) hoặc chìa khóa cơ lưu ký an toàn tại văn phòng phân khu; Field Host trực tiếp đón khách tại sảnh và quẹt thẻ thang máy dẫn lên phòng.
3. **Giám sát an ninh trong suốt thời gian xem phòng:**
   - Field Host đồng hành cùng khách trong toàn bộ thời gian tham quan; không để khách ở một mình trong căn hộ.
   - Hướng dẫn khách tháo giày ngoài cửa hoặc sử dụng bọc giày bảo hộ để bảo vệ sàn gỗ/thảm.
   - Giải thích công khai, minh bạch bảng tính **All-in Cost** (tiền thuê, phí BQL, tiền xe, điện nước ước tính), không tự ý báo giá chênh lệch.
4. **Chốt kiểm tra an ninh khi rời căn hộ (Check-out Viewing):**
   - Trước khi rời đi, Host kiểm tra tắt toàn bộ đèn điện, đóng kín cửa sổ/ban công, kéo chốt khóa cửa chính an toàn và chụp 01 ảnh xác nhận cửa đã khóa gửi lên hệ thống để hoàn tất ticket.

---

## ĐIỀU 5. CƠ CHẾ CHỐT CỌC VIETQR ĐỘNG & BẢO VỆ DÒNG TIỀN NỀN TẢNG
1. **Thao tác bấm chốt cọc trên ứng dụng:**
   - Khi khách thuê ưng ý căn hộ, Field Host mở Host Mobile PWA và bấm nút **"Khách Chốt Cọc"**.
   - Hệ thống lập tức sinh mã **VietQR động 2.000.000 VNĐ** (chứa mã căn và SĐT khách thuê) hiển thị trực tiếp trên màn hình.
2. **Quy định thanh toán độc quyền qua VietQR động:**
   - Field Host hướng dẫn khách quét mã QR để chuyển khoản trực tiếp vào **Tài khoản Ký quỹ 3 bên bảo chứng ngân hàng** của VinStay AI.
   - **ĐIỀU CẤM KỶ LUẬT TUYỆT ĐỐI:** Field Host tuyệt đối **KHÔNG ĐƯỢC THU TIỀN MẶT**, không nhận chuyển khoản vào tài khoản cá nhân của Host dưới bất kỳ hình thức nào. Vi phạm quy định này sẽ bị chấm dứt hợp đồng ngay lập tức và chuyển hồ sơ cơ quan pháp luật xử lý hành vi lạm dụng tín nhiệm chiếm đoạt tài sản.
3. **Quyền lợi bảo vệ công sức chốt cọc (Attribution Lock):**
   - Ngay khi tiền cọc 2.000.000 VNĐ gạch nợ thành công vào tài khoản ký quỹ qua Webhook, hệ thống tự động khóa mã Host ID của người dẫn phòng gắn liền với giao dịch thành công đó, bảo đảm **100% quyền lợi hoa hồng chốt cọc** cho Host, không bị người khác tranh giành công sức.

---

## ĐIỀU 6. NGHĨA VỤ BẢO MẬT & CAM KẾT CHỐNG CẮT CẦU (NON-CIRCUMVENTION)
1. **Bảo mật dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP):**
   - Field Host không được chụp ảnh, ghi chép lại hoặc phát tán số điện thoại, thông tin định danh của Khách thuê và Chủ nhà cho bất kỳ bên thứ ba hoặc môi giới bên ngoài nào.
2. **Cam kết chống cắt cầu (Strict Non-Circumvention):**
   - Field Host cam kết không chủ động cho số điện thoại riêng, không thỏa thuận ngầm và không môi giới khách thuê ký hợp đồng trực tiếp với chủ nhà ngoài nền tảng VinStay AI để hưởng lợi riêng.
3. **Chế tài xử phạt vi phạm:**
   - Trường hợp phát hiện hành vi cắt cầu hoặc cung cấp thông tin cho môi giới ngoài:
     * Khóa vĩnh viễn tài khoản Field Host trên toàn bộ hệ thống VinStay AI.
     * Tịch thu 100% thù lao và hoa hồng chưa đối soát trong kỳ.
     * Bồi hoàn toàn bộ chi phí tổn thất tương đương **01 tháng tiền thuê căn hộ** cho nền tảng theo quy định của pháp luật dân sự.

---

## ĐIỀU 7. HIỆU LỰC HỢP ĐỒNG & KÝ KẾT ĐIỆN TỬ
1. Hợp đồng có hiệu lực kể từ thời điểm Field Host hoàn tất xác thực AI OCR CCCD, kích hoạt tài khoản và ký xác nhận điện tử thông qua mã OTP gửi qua Zalo/SMS.
2. Hợp đồng được lưu trữ vĩnh viễn trên cơ sở dữ liệu mã hóa AES-256 của VinStay AI và có đầy đủ giá trị pháp lý chứng cứ theo Luật Giao dịch Điện tử 2023.

---
*Văn bản thuộc Hệ thống Pháp lý Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
