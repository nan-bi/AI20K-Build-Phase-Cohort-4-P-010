# VINSTAY AI — CORE PROJECT TENETS & LANDLORD PAIN POINTS (ALWAYS ON)

> **MỤC TIÊU TỐI THƯỢNG CỦA ĐỀ ÁN:**  
> VinStay AI là Hệ điều hành Cho thuê & Vận hành Căn hộ tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**. Mọi quyết định thiết kế sản phẩm, kiến trúc CSDL, giao diện Frontend và kịch bản AI bắt buộc phải **bám sát 100% vào 4 khó khăn thực tế cốt lõi của Chủ nhà (Landlords)** dưới đây:

---

## 4 NỖI ĐAU CỐT LÕI CỦA CHỦ NHÀ (LANDLORD PAIN POINTS) — BẮT BUỘC BÁM SÁT 100%:

### 1. Trống Phòng Kéo Dài & Thiệt Hại Tài Chính Kép (Pre-Leasing Vacancy)
* **Khó khăn thực tế:** Tốn 15–30 ngày (thậm chí 45 ngày) tìm khách mới giữa 2 chu kỳ thuê. Mỗi tháng trống mất trắng 6–12 triệu VNĐ tiền thuê trong khi vẫn phải gánh nợ lãi vay ngân hàng + phí quản lý BQL Vinhomes (8–11k/m2) hàng tháng.
* **Giải pháp VinStay AI cam kết giải quyết:**
  * **AI Matchmaker theo All-in Cost:** Tự động lọc và khớp nhu cầu khách thuê trong 30 giây theo ngân sách trần All-in, giảm thời gian tìm khách từ 30 ngày xuống dưới 7 ngày.
  * **Thuật toán Dynamic Deal & Badge "Căn hời phân khu":** Tự động nhận diện căn có giá tốt (tiết kiệm $\ge 10\%$ so với layout cùng phân khu), ưu tiên hiển thị Top đầu, tăng gấp 3 lần lượt xem mà chủ nhà không bị môi giới ép dìm giá.
  * **Khóa căn giữ chỗ qua VietQR động (2.000.000 VNĐ), thời hạn do Admin cài đặt:** Khách ưng ý chuyển cọc $\rightarrow$ Căn hộ khóa trạng thái `holding` trong thời hạn Admin cài đặt trên Admin Portal (mặc định 48h, cho phép 12–72h, chỉnh riêng từng căn), tạo áp lực chốt sớm, triệt tiêu tình trạng khách do dự so đo nhiều nơi.
  * **Giữ nhiệt rổ hàng bằng Nhãn FOMO & Hàng chờ Waitlist F2 (Grace-Period 30 phút / Auto-Expire 75 phút):** Căn hộ đang có ca xem thực địa vẫn hiển thị công khai kèm nhãn FOMO cam: *"Đang có 1 khách xem lúc [Giờ]. Nhanh tay đặt lịch dự phòng"* để thu thập tệp khách dự phòng F2 (Zero CAC). Sau 45 phút ca xem + 30 phút ân hạn (tổng 75 phút), nếu không có cọc, căn hộ tự động mở lại trạng thái `available` và AI tự động bắn Zalo ZNS mời khách trong Waitlist xem phòng.
  * **Nguyên tắc tối thượng "First-to-Pay Wins" & Công nghệ AI Conflict Resolver:** Khóa căn độc quyền dựa trên tiền cọc thực tế gạch nợ qua VietQR động 2.000.000 VNĐ, không giữ chỗ bằng lời hứa xem phòng; trường hợp căn hộ được khách khác cọc trực tuyến trong lúc đang có ca xem thực địa, hệ thống lập tức khóa căn cho người thanh toán trước, đồng thời AI Conflict Resolver kích hoạt thông báo đẩy cho Field Host tại phòng và tự động gợi ý 2 căn tương đương cùng phân khu ($\ge 90\%$ độ mới/giá All-in) để Host dẫn khách sang chốt cọc ngay lập tức, biến nguy cơ hụt căn thành đòn bẩy chốt sale kép.

### 2. Cực Hình Đi Xa 20-30km Mở Cửa & Môi Giới Làm Phiền (Distance & Broker Chaos)
* **Khó khăn thực tế:** Chủ nhà đa số ở nội thành Hà Nội (Cầu Giấy, Đống Đa, Ba Đình...) phải đi 20–30km sang Ocean Park để mở cửa nhưng thường xuyên bị khách "bỏ bom" (no-show); bị môi giới tự do spam cuộc gọi dồn dập, ăn cắp ảnh đăng "tin mồi" dìm giá thị trường.
* **Giải pháp VinStay AI cam kết giải quyết:**
  * **Mạng lưới Field Host nội khu & Cấp mã mở cửa tức thì (Chủ nhà ở nhà 100%):** Chủ nhà lưu mã khóa điện tử trên hệ thống (hoặc nhân sự phân khu giữ chìa khóa cơ); Field Host nội khu (đã có thẻ cư dân thang máy) nhận ticket, đón khách tại sảnh và dẫn lên xem phòng. Khi tới cửa, Host bấm xác nhận xem phòng trên app $\rightarrow$ Mã cửa được gửi ngay về điện thoại để mở cửa (tuyệt đối không dùng Lockbox treo cửa vi phạm quy chế BQL). Chủ nhà theo dõi trạng thái từ xa, không tốn 1 giọt xăng hay 1 phút di chuyển.
  * **Xác thực SĐT qua Zalo OTP & Nhắc hẹn kép T-10m:** Khách bắt buộc xác thực OTP trước khi đặt lịch; hệ thống kích hoạt thông báo nhắc hẹn kép trước 10 phút (báo Host xuống sảnh chuẩn bị, gửi Zalo kèm nút 1-chạm "Tôi đã có mặt tại sảnh" cho khách, không dán QR sảnh), loại trừ triệt để khách ảo và no-show.
  * **Listing Verified 100% & Bảo mật thông tin Chủ nhà:** Định danh chuẩn [Tòa - Tầng - Căn] kèm ảnh thực tế có timestamp; mã hóa SĐT cá nhân chủ nhà trên hệ thống; đóng watermark số chống môi giới ngoài ăn cắp ảnh đăng tin mồi dìm giá.

### 3. Tranh Chấp Hư Hao Nội Thất & Rủi Ro Tiền Cọc Bàn Giao (Deposit & Asset Disputes)
* **Khó khăn thực tế:** Lúc trả phòng xảy ra tranh chấp nảy lửa về hỏng hóc sofa da, xước sàn gỗ, ố tường, hỏng thiết bị điện tử... Do không có bằng chứng hình ảnh/video ban đầu để đối soát, hợp đồng sơ sài tải trên mạng khiến tiền cọc không đủ bù chi phí sửa chữa.
* **Giải pháp VinStay AI cam kết giải quyết:**
  * **Hộ chiếu bàn giao số (Digital Handover Passport):** Chụp ảnh kiểm định hiện trạng 10 hạng mục nội thất trọng yếu (tường, sàn, sofa, điều hòa, tủ lạnh, bếp...) lúc giao nhà nhúng Timestamp + Geofence bảo mật; phân định rõ ranh giới hao mòn tự nhiên (chủ nhà chịu) và hư hỏng bất cẩn (khách đền bù).
  * **Chuẩn hóa Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit):** Số tiền cọc được căn cứ dựa trên giá của hợp đồng thuê cụ thể: không được nhỏ hơn 50% giá thuê mỗi tháng ($0.5\times$) và không được lớn hơn 4 lần số tiền thuê mỗi tháng ($4.0\times$); có thể cài đặt và quản lý trong trang Admin. Khoản cọc 2 triệu ban đầu khi ký Hợp đồng chính thức sẽ chuyển đổi 100% thành một phần của Tiền Cọc Bảo Đảm Tài Sản và giữ nguyên suốt kỳ hạn thuê; tuyệt đối KHÔNG khấu trừ vào tiền thuê tháng đầu tiên; bảo vệ trọn vẹn tài sản và dự phòng nợ cước cho chủ nhà.
  * **Ký số Thỏa thuận cọc & AI OCR CCCD:** Tự động bóc tách CCCD gắn chip 2 mặt, sinh hợp đồng cọc số ký OTP bảo mật AES-256 theo Nghị định 13/2023/NĐ-CP, ràng buộc pháp lý bồi thường tài sản trước khi giao nhà.

### 4. Khủng Hoảng Bảo Trì Vặt & Rủi Ro Bị BQL Phạt / Bùng Tiền Dịch Vụ (Operations & Rules)
* **Khó khăn thực tế:** Máy lạnh rỉ nước, chập điện, vòi nước hỏng lúc nửa đêm khách gọi đòi chủ nhà xử lý ngay; thợ ngoài chặt chém giá cao; khách vi phạm nội quy ồn ào/thú cưng bị BQL phạt tiền trực tiếp chủ hộ; khách chuyển đi đột ngột để lại hóa đơn nợ tiền điện nước EVN và phí xe tồn đọng.
* **Giải pháp VinStay AI cam kết giải quyết:**
  * **Danh bạ Kỹ thuật Ngoài & Vận hành Tinh gọn (Asset-Light Handyman Referral):** VinStay AI và Field Host TUYỆT ĐỐI KHÔNG làm tổng thầu sửa chữa, không ôm bộ máy bảo trì cồng kềnh. Khi có sự cố, Field Host chỉ giới thiệu danh bạ thợ kỹ thuật ngoài uy tín tại Ocean Park; khách thuê và thợ tự thỏa thuận chi phí và chịu trách nhiệm trực tiếp. Giải phóng chủ nhà khỏi cảnh bị réo gọi lúc nửa đêm, VinStay AI giữ mô hình asset-light không rủi ro pháp lý.
  * **Số hóa Nội quy BQL Vinhomes & Tự động trừ cọc vi phạm:** Số hóa nội quy BQL (tiếng ồn sau 22h, nuôi thú cưng, PCCC...); hợp đồng ràng buộc mọi khoản phạt của BQL do lỗi của khách sẽ tự động khấu trừ trực tiếp vào Tiền Cọc Bảo Đảm Tài Sản (Security Deposit) của khách.
  * **Chốt công tơ điện nước EVN & Đối soát All-in Cost:** Chụp ảnh công tơ điện nước có timestamp lúc nhận và trả phòng; đối soát dứt điểm hóa đơn tiền điện EVN, nước, phí gửi xe trước khi hoàn cọc, đảm bảo 0% nợ đọng cho chủ nhà.

---

## 5 NỖI ĐAU CỐT LÕI CỦA KHÁCH THUÊ (TENANT PAIN POINTS) — BẮT BUỘC BÁM SÁT 100%:

### 1. "Ma Trận" Tin Ảo & Tráo Căn (Bait-and-Switch)
* **Khó khăn thực tế:** 60% tin đăng mạng xã hội là tin mồi, ảnh 3D lung linh khác xa thực tế cũ bẩn; mất 7–14 ngày nhắn tin nhiều môi giới mà không tìm được căn thật.
* **Giải pháp VinStay AI:** Listing Verified 100% định danh chuẩn [Tòa-Tầng-Căn] kèm ảnh thực tế có timestamp; AI Matchmaker gợi ý 3 căn chuẩn trong 30 giây.

### 2. "Sốc Chi Phí Ẩn" Khi Vào Ở (Hidden Costs & Budget Shock)
* **Khó khăn thực tế:** Giá chào thuê thấp nhưng vào ở bị cộng dồn phí quản lý Vinhomes (8–11k/m2), phí gửi xe, tiền điện nước bậc thang đẩy chi phí vượt 20–30% ngân sách.
* **Giải pháp VinStay AI:** Bảng tính All-in Cost thời gian thực công khai trọn gói mọi chi phí; bộ lọc loại trừ 100% căn vượt ngân sách trần.

### 3. Cực Hình Đi Xem Phòng & Bị Chèo Kéo (Viewing Friction)
* **Khó khăn thực tế:** Lạc đường ở Ocean Park, đứng chờ môi giới vạ vật tại sảnh; môi giới không có thẻ thang máy phải "đi ké"; bị áp lực tâm lý chốt cọc gấp.
* **Giải pháp VinStay AI:** Field Host nội khu có sẵn thẻ cư dân đón đúng giờ tại sảnh (được thông báo trước 10 phút); khách chỉ cần bấm nút 1-chạm "Tôi đã có mặt tại sảnh" trên Zalo; Host quẹt thẻ thang máy dẫn lên phòng trong 60 giây.

### 4. Rủi Ro Lừa Tiền Cọc & Hợp Đồng Bất Lợi (Deposit Scams & Legal Exposure)
* **Khó khăn thực tế:** Môi giới tự do thu cọc rồi chặn số; hợp đồng tải mạng gài bẫy thiệt thòi; rủi ro lộ lọt ảnh CCCD cá nhân cho bên thứ ba.
* **Giải pháp VinStay AI:** Cọc giữ chỗ 24h (2.000.000 VNĐ) qua mã VietQR động gạch nợ tự động vào tài khoản định danh nền tảng; khi ký Hợp đồng thuê chính thức, số tiền này được chuyển đổi 100% thành một phần của **Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)** (căn cứ theo giá thuê tháng: không nhỏ hơn 50% và không lớn hơn 4 lần giá thuê, cài đặt và quản lý trên Admin Portal) giữ nguyên suốt kỳ thuê để bảo vệ tài sản chủ nhà và hoàn lại khi hết hạn; AI OCR CCCD và ký số OTP bảo mật AES-256 theo Nghị định 13/2023/NĐ-CP.

### 5. "Bị Bỏ Rơi" Khi Ở & Tranh Chấp Trả Phòng (Post-Move Abandonment)
* **Khó khăn thực tế:** Môi giới nhận hoa hồng xong là biến mất; sự cố hỏng hóc vặt chủ nhà ở xa không ngó ngàng; lúc trả phòng bị chủ nhà trừ cọc oan do không có ảnh đối soát ban đầu.
* **Giải pháp VinStay AI:** **Hộ chiếu bàn giao số (Digital Handover Passport)** lưu trữ ảnh kiểm định có timestamp của 10 hạng mục nội thất làm bằng chứng đối soát pháp lý khi thanh lý (loại trừ trừ cọc hao mòn tự nhiên); **Danh bạ Thợ kỹ thuật ngoài uy tín** do Field Host giới thiệu để khách và thợ tự thỏa thuận, xử lý nhanh chóng mà không phát sinh tranh chấp.

---

## 5 ĐIỂM NGHẼN VẬN HÀNH CỦA ĐƠN VỊ QUẢN LÝ & FIELD HOST (OPERATIONS BOTTLENECK) — BẮT BUỘC BÁM SÁT 100%:

### 1. Rổ Hàng Bị "Thiu" & Chi Phí Kiểm Định Đắt Đỏ (Inventory Desync & Verification Cost)
* **Khó khăn thực tế:** Căn hộ đã cho thuê ngoài nhưng web không cập nhật kịp thời gây mất uy tín; chi phí cử người đi chụp ảnh, thẩm định ảnh thủ công quá cao.
* **Giải pháp VinStay AI:** Áp dụng **Hợp đồng Ký gửi Quản lý Độc quyền (Exclusive Mandate)** — Chủ nhà ủy quyền cho VinStay AI toàn quyền điều phối giỏ hàng, thẩm định 1 lần duy nhất lúc tiếp nhận (chi phí kiểm định = 0). Điều khoản thoát linh hoạt: Chủ nhà có quyền hủy ủy quyền khi ngưng cho thuê hoặc tự cho thuê với điều kiện **báo trước 15 ngày kèm theo trạng thái nhà trống**. Khi có cọc 2 triệu chuyển `holding` tự động khóa toàn mạng lưới.

### 2. Nguy Cơ Bị "Cắt Cầu" Giao Dịch Ngoài Nền Tảng (Platform Leakage / Disintermediation)
* **Khó khăn thực tế:** Sau khi dẫn xem phòng, khách và chủ nhà tự xin số thỏa thuận ngầm ký riêng để trốn phí nền tảng, khiến nền tảng thất thoát doanh thu.
* **Giải pháp VinStay AI:** Ràng buộc pháp lý từ Hợp đồng Quản lý Độc quyền; cọc giữ chỗ 24h qua VietQR động gạch nợ trực tiếp vào tài khoản định danh nền tảng; quyền lợi Hộ chiếu bàn giao số 10 hạng mục nội thất chỉ có hiệu lực khi giao dịch trên nền tảng, triệt tiêu 100% động cơ cắt cầu.

### 3. Nỗi Ám Ảnh Khách "Bỏ Bom" (No-Show Fatigue) & Lãng Phí Thời Gian
* **Khó khăn thực tế:** Field Host di chuyển giữa các phân khu đứng đợi ở sảnh 20–30 phút nhưng khách không đến hoặc hủy hẹn sát giờ, gây kiệt sức và mất thời gian chết.
* **Giải pháp VinStay AI:** Bắt buộc xác thực SĐT qua OTP trước khi đặt lịch; quy trình nhắc hẹn kép T-10m thông báo cho Host và gửi Zalo 1-chạm cho khách.

### 4. Bẫy Chi Phí Cố Định OpEx vs Quản Lý Chất Lượng CTV (Fixed OpEx Trap)
* **Khó khăn thực tế:** Trả lương cứng full-time thì âm dòng tiền vào mùa thấp điểm; dùng CTV tự do thì khó chuẩn hóa quy chuẩn tiếp đón và kiểm soát chất lượng.
* **Giải pháp VinStay AI:** Mô hình biến phí linh hoạt (Dynamic Commission & Incentive Engine) được cấu hình trực tiếp trên Trang Quản Trị (Admin Portal). Quản trị viên chủ động điều chỉnh mức thù lao lượt dẫn, hoa hồng chốt cọc và các gói thưởng nóng kích cầu theo từng giai đoạn thị trường/mùa vụ; chuẩn hóa quy trình tiếp đón qua Mobile Dashboard 1-chạm.

### 5. Tranh Giành Lead & Chậm Trễ Điều Phối Tiếp Đón (Lead Cannibalization & Dispatch SLA)
* **Khó khăn thực tế:** Phân bổ thủ công dễ gây tranh chấp khách giữa các Sale, hoặc khách phải chờ lâu ở sảnh do không có cơ chế chuyển giao tự động có SLA.
* **Giải pháp VinStay AI:** Thuật toán Auto-Dispatch 3 tầng: Field Host gần nhất $\rightarrow$ Open Pool 500m sau 3 phút $\rightarrow$ Area Lead; đảm bảo tiếp nhận ticket trong 3 phút.

---

## NGUYÊN TẮC THỰC THI BẮT BUỘC (FOR AI ASSISTANT & DEV TEAM):
1. **Tiêu chuẩn tính năng (Feature Guardrail):** Mọi tính năng, luồng màn hình UI, bảng CSDL hoặc prompt AI khi đề xuất phải đối chiếu trực tiếp xem có giải quyết 1 trong 4 nỗi đau trên không. Nếu không $\rightarrow$ loại bỏ để tránh phình to phạm vi MVP.
2. **Phân định rõ AI vs Con người:** Tác vụ tính toán, sàng lọc dữ liệu, bóc tách CCCD, phân cấp sự cố $\rightarrow$ AI thực thi; tác vụ thực địa sảnh, thang máy $\rightarrow$ Field Host nội khu thực thi.
3. **Mô hình thực tế, không phụ thuộc API bên thứ ba:** Giữ vững giải pháp thẻ cư dân RFID của Field Host; cơ chế cấp mã khóa điện tử qua app khi xác nhận xem phòng / quản lý chìa cơ tại phân khu (không dùng hộp Lockbox treo cửa, không tích hợp IoT ổ khóa phức tạp để đảm bảo đúng tiến độ MVP).
