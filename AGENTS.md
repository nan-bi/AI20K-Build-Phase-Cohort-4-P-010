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
  * **Chuẩn hóa Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit):** Khoản cọc 2 triệu ban đầu khi ký Hợp đồng chính thức sẽ chuyển đổi 100% thành một phần của Tiền Cọc Bảo Đảm Tài Sản (tương đương 1–2 tháng tiền thuê) và giữ nguyên suốt kỳ hạn thuê; tuyệt đối KHÔNG khấu trừ vào tiền thuê tháng đầu tiên; bảo vệ trọn vẹn tài sản và dự phòng nợ cước cho chủ nhà.
  * **Chấp thuận điều khoản cọc & AI OCR CCCD khi ký Hợp đồng thuê:** Khách tick đồng ý điều khoản cọc (Điều 328 BLDS 2015) ngay trước khi quét VietQR — không ký thỏa thuận cọc riêng. Khi làm Hợp đồng thuê chính thức, AI tự động bóc tách CCCD gắn chip 2 mặt và khách ký điện tử bằng chữ ký tay trên SĐT đã xác thực OTP Zalo một lần, dữ liệu mã hóa AES-256 theo Nghị định 13/2023/NĐ-CP, ràng buộc pháp lý bồi thường tài sản trước khi giao nhà.

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
* **Giải pháp VinStay AI:** Cọc giữ chỗ (2.000.000 VNĐ, khóa căn mặc định 48h do Admin cài đặt) qua mã VietQR động gạch nợ tự động vào tài khoản định danh nền tảng; khi ký Hợp đồng thuê chính thức, số tiền này được chuyển đổi 100% thành một phần của **Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)** giữ nguyên suốt kỳ thuê để bảo vệ tài sản chủ nhà và hoàn lại khi hết hạn; khách chấp thuận điều khoản cọc bằng ô tick trước khi quét VietQR (không ký thỏa thuận cọc riêng); AI OCR CCCD và ký điện tử Hợp đồng thuê trên SĐT đã xác thực OTP một lần, mã hóa AES-256 theo Nghị định 13/2023/NĐ-CP.

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
* **Giải pháp VinStay AI:** Ràng buộc pháp lý từ Hợp đồng Quản lý Độc quyền; cọc giữ chỗ (mặc định 48h, Admin cài đặt) qua VietQR động gạch nợ trực tiếp vào tài khoản định danh nền tảng; quyền lợi Hộ chiếu bàn giao số 10 hạng mục nội thất chỉ có hiệu lực khi giao dịch trên nền tảng, triệt tiêu 100% động cơ cắt cầu.

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

---

## 🔒 Luật khung do engine quản lý (tự sinh)

<!-- brain:rule:boot -->
1. **Bước 0 (Bắt buộc tiên quyết — Đồng Bộ & Boot Não Bộ):** Từ root repo, chạy `node ../brain4agent.release/.agents/skills/.xay-dung-nao-bo/scripts/init_brain.js --check` (engine não bộ chạy TẠI CHỖ từ hub quản trị tập trung — KHÔNG có bản sao global; skill `.xay-dung-nao-bo`, CHỈ ĐỌC) để kiểm tra não bộ đã đạt chuẩn mới nhất trước khi xử lý bất kỳ yêu cầu nào. Chỉ khi kết quả là `CẦN NÂNG CẤP` mới chạy lại **không cờ** (chế độ GHI) và nêu tường minh trong phiên; mã thoát `2` = cần người xử — KHÔNG tự sửa tay vùng luật do engine quản lý. Mẫu bàn giao, cẩm nang và luật khung mới nhất nằm trong thư mục hub chứa engine đó (`docs/`).
<!-- /brain:rule:boot -->

<!-- brain:rule:cold-memory -->
**Ký ức lạnh (Cold Memory) — `memory/archive/`:** phân khu chứa các mục nhật ký đã xoay vòng khỏi `memory/hot/today.md`, mỗi file tên `YYYY-MM-DD.md`. CHỈ script xoay ký ức được ghi (append); CẤM sửa tay; CẤM coi là nguồn chân lý hiện trạng (kernel `memory-distill.txt` và `index.md` mới là). Engine chỉ tạo thư mục, KHÔNG sinh `.gitkeep`, KHÔNG quản lý script xoay; file không đúng mẫu tên bị `brain-doctor` báo `BRN-017`.
<!-- /brain:rule:cold-memory -->

<!-- brain:rule:spec-package -->
2. **BẮT BUỘC DẠNG SPEC PACKAGE — CẤM PLAN PHẲNG/MỎNG (luật chốt 2026-09-01):**
   Một kế hoạch KHÔNG được là một file `plan.md` dồn hết mọi thứ. Bắt buộc tách thành **bộ SPEC nhiều file**, mỗi file là MỘT hợp đồng độc lập:
   ```text
   planning/[STT]_[YYYY-MM-DD]_[Ten-Ngan]/
   ├── plan.md                          # HỒ SƠ kế hoạch (KHÔNG chứa thiết kế — xem mục 2.3)
   └── specs/                           # Bản thiết kế chi tiết (Spec-First)
       ├── 00-ARCHITECTURE.md           # Mục tiêu, Non-goals, Bất biến kiến trúc, Router thứ tự đọc
       ├── 01-CONTRACTS.md              # Contracts, Types, Schema/DDL bất biến
       ├── SPEC-Pxx-[Name].md           # Đặc tả từng mảng/bước thực thi cụ thể
       ├── OPERATIONS.md                # Deploy, runbook, thứ tự bắt buộc, rollback
       └── TESTING-ACCEPTANCE.md        # Ma trận test + bằng chứng nghiệm thu + Exit Gates
   ```
   - **2.1. Bộ SPEC tối thiểu:** phải phủ đủ 4 mảng — (a) kiến trúc & bất biến, (b) contract dữ liệu/API/module, (c) vận hành-deploy-rollback, (d) kiểm thử-nghiệm thu. Dự án lớn tách thêm SPEC theo từng tính năng.
   - **2.2. Mỗi file SPEC BẮT BUỘC có:** contract chính xác (chữ ký hàm/endpoint/schema, không mô tả chung chung); luật **BẮT BUỘC / CẤM** tường minh, kể cả **"vùng cấm"** (điều đã cân nhắc và quyết định KHÔNG làm, kèm lý do — chống việc agent sau "sửa lại cho tốt hơn"); bảng phân loại lỗi + hành vi bắt buộc của caller cho từng loại; số đo/bằng chứng nghiệm thu thật (không chỉ "test xanh").
   - **2.3. `plan.md` CHỈ được chứa:** Metadata Header (mục 3); **Nhật ký quyết định có mốc thời gian** — kèm mục **"Quyết định bị thay thế"** (không xoá lịch sử, không để hai phát biểu ngược nhau cùng sống); phân công Work Packages + Model Tier; checklist thực thi; bảng trỏ sang các file SPEC. **CẤM nhét thiết kế chi tiết vào `plan.md`.**
   - **2.4. Exit Gates phải đánh dấu theo môi trường** (vd `✅ local / ⬜ server`) — kế hoạch chỉ được đóng khi mọi gate của môi trường thật chuyển ✅.
   - **2.5. NGOẠI LỆ DUY NHẤT:** hotfix/patch nhỏ (`PATCH` SemVer, ≤1 ngày công) được phép chỉ có `plan.md`, nhưng vẫn đủ Metadata + nhật ký quyết định + checklist. Mọi đợt `MINOR`/`MAJOR` bắt buộc đủ bộ SPEC.
   - **2.6. Package cũ dạng phẳng** (file `NN-*.md` nằm thẳng trong thư mục kế hoạch, không có `specs/`) được GIỮ NGUYÊN theo Path Invariant — không đổi cấu trúc để tránh gãy tham chiếu; chỉ áp cấu trúc chuẩn cho kế hoạch MỚI.
   - **2.7. Hồ sơ trọn vòng đời (hồ sơ MỚI; hồ sơ cũ giữ nguyên):** `handoffs/H<NN>_*.md` ↔ `reports/R<NN>_*.md` (mỗi H đúng một R cùng đuôi; report dòng 2–4 = `Handoff:`/`Base:`/`Head:`, dòng cuối = phán quyết ✅/🔁/⛔); `evidence/<goi>/*.txt` = output máy, CẤM sửa tay, report chỉ trỏ. Đóng hồ sơ khi mọi H có R và evidence được trỏ tồn tại. Mẫu: `docs/HANDOFF_PROTOCOL.md` §14 tại hub.
<!-- /brain:rule:spec-package -->

<!-- brain:rule:structural-extension -->
2. **Mở Rộng Bắt Buộc Khi Đổi Nền Cấu Trúc (Structural Extension):** Kế hoạch nào thêm **THƯ MỤC TOP-LEVEL mới** (vd `app/`, `legacy/`, `.claude/agents/`) hoặc đưa vào **NGÔN NGỮ / KHUNG mới** (vd Rust, Tauri, React, Node ESM) thì BẮT BUỘC rà thêm **2 file ngoài Ma Trận 6 Điểm**: [`brain4agent/project-intro.md`](brain4agent/project-intro.md) (mục tiêu, bản chất repo, tech stack) và [`brain4agent/-data-architecture.md`](brain4agent/-data-architecture.md) (tầng lưu trữ, data flow). Lý do: hai file này KHÔNG thuộc 6 điểm nên dễ mô tả sai repo trong thời gian dài mà mọi kiểm tra tự động vẫn xanh; bản chất repo và tech stack chỉ con người rà được.
<!-- /brain:rule:structural-extension -->

<!-- brain:rule:root-marker -->
3. **NGOẠI LỆ TƯỜNG MINH — Marker Phiên Bản Khung Não:** Root được phép có **ĐÚNG MỘT** file `brain4agent-v<x.y.z>.md` do `init_brain.js` tự sinh và quản lý — đây là bản soi CHO NGƯỜI để nhìn thấy ngay ở root dự án đang chạy khung não phiên bản nào. **CẤM sửa tay** file này; **CẤM để tồn tại 2 file marker** trở lên (bump version thì script tự xoá bản cũ, sinh bản mới). Nguồn chân lý MÁY ĐỌC là `brain4agent/memory/hot/state.json` → field `brain_template_version`; file `.md` chỉ là bản dẫn xuất, KHÔNG được coi là nguồn chân lý. Field này khác với version DỰ ÁN (`current_version` trong `state.json`, hoặc `package.json`) — tuyệt đối không trộn/ghi đè lẫn nhau.
<!-- /brain:rule:root-marker -->

<!-- brain:rule:dual-entry -->
### J. Quy tắc Tương Thích Đa Agent — Bất Biến Hai Điểm Nạp (Dual Entry-Point Invariant)
1. Root repo BẮT BUỘC đủ 2 file: `AGENTS.md` = nguồn chân lý DUY NHẤT chứa toàn bộ luật; `CLAUDE.md` = shim mỏng ≤10 dòng, chỉ 1 dòng `@AGENTS.md` + ghi chú ngắn, TUYỆT ĐỐI không chứa luật.
2. Lý do: mỗi hãng agent đọc tên file khác nhau. Claude Code auto-load `CLAUDE.md` (bản hiện hành nạp thêm cả `AGENTS.md` — đo 2026-09-06; giữ shim để mọi bản cũ/mới đều nạp đúng); Gemini/Codex và agent theo chuẩn `agents.md` đọc `AGENTS.md`. Hai điểm nạp, MỘT nguồn chân lý.
3. CẤM: (a) chép/nhân bản luật sang `CLAUDE.md` → sinh 2 nguồn chân lý lệch nhau; (b) đổi tên `AGENTS.md` (các tài liệu trong repo + agent khác tham chiếu đúng tên này).
4. Khi khởi tạo dự án MỚI hoặc chạy skill `xay-dung-nao-bo`: PHẢI sinh ĐỦ CẢ HAI file, không sinh mỗi một cái.
5. Mở rộng: agent mới đọc tên file riêng (`GEMINI.md`, `.cursorrules`) → thêm shim mỏng trỏ về `AGENTS.md`, KHÔNG nhân bản luật.
6. Giới hạn `@import`: tối đa 4 hop lồng nhau, file ≤4 MiB mới được nạp.
7. Cách kiểm: sửa luật KHÔNG cần đụng `CLAUDE.md`; `CLAUDE.md` phình >10 dòng hoặc chứa câu luật là vi phạm. Kiểm nạp thật bằng `/context` ở phiên MỚI.
<!-- /brain:rule:dual-entry -->

<!-- brain:rule:workflow -->
### K. Quy tắc Bàn Giao & Bước Kế Tiếp (Handoff & Next-Step Invariant)
1. **Kết thúc MỌI việc bằng khối "Tiếp theo" đúng 4 dòng:** `🖐 Cần tay người:` (lệnh/quyết định cụ thể) · `🤖 Agent làm được ngay:` (chờ lệnh) · `⭐ Nên làm trước:` (một việc + một dòng lý do) · `⏸ Chưa làm:` (bị bỏ lại gì, vì sao — bắt buộc có, kể cả "không có").
2. **Bàn giao cho worker = văn bản TỰ CHỨA, ≤80 dòng, mở bằng 3 dòng chuẩn (vai → Bước 0 → thứ tự đọc) rồi đủ 6 mục:** bối cảnh · phạm vi (file được/cấm chạm) · việc phải làm kèm "xong khi" là LỆNH + KẾT QUẢ máy đọc được · luật · TẦNG model từng gói (🔴/🟠/🟢, KHÔNG ghi tên model) · mẫu report. Handoff CHỈ TRỎ tới SPEC theo số mục, KHÔNG chép lại — phải chép nghĩa là SPEC thiếu, sửa SPEC. Hai loại: **THI CÔNG** (được ghi) và **THẨM ĐỊNH** (chỉ đọc; không nhận report/handoff của worker; nhiệm vụ là làm đỏ). Worker không có lịch sử chat — CẤM tham chiếu hội thoại. Mẫu đầy đủ: `docs/HANDOFF_PROTOCOL.md` trong thư mục hub chứa engine ở Bước 0.
3. **Worker luôn là ORCHESTRATOR:** khai vai ở dòng 1 report; xếp tầng từng gói bằng 3 câu hỏi (cần ra quyết định chưa có trong spec? → 🔴 · có spec + test tự biết đúng/sai? → 🟠 · có mẫu chép theo? → 🟢; phân vân thì XUỐNG một tầng); KHÔNG tự làm việc dưới tầng mình; thiếu model đúng tầng ⇒ LÊN một tầng; thiếu 🔴 ⇒ dừng hỏi. **Thẩm định do agent KHÁC người làm**, không thừa kế ngữ cảnh của worker, khác họ model khi có thể.
4. **Report chỉ gồm SỐ ĐO, cấm kể chuyện:** dòng 1 = `Vai · loại (thi công/thẩm định) · họ/model · Bước 0 exit · hiểu việc (phạm vi / xong khi / cấm bằng lời mình)` · lệnh + exit code nguyên văn · test tổng/pass/fail/skip · `git diff --stat` + SHA · bảng phân công thực tế (gói → tầng yêu cầu → họ/model đã dùng) · việc KHÔNG làm + lý do · câu hỏi cần người. Thiếu dòng khai vai hoặc bảng phân công ⇒ report bị trả lại.
5. **Người duyệt ĐO LẠI, không tin report — theo bảng cổng:** mọi WP: tự chạy lại lệnh + exit code, so `git diff --stat` với phạm vi handoff (file ngoài phạm vi ⇒ 🔁), số test không giảm và 0 skip · bộ đo MỚI: phải từng ĐỎ trên hệ cố tình hỏng ít nhất một lần · cổng 🔴 (đổi luật, phát hành, bảo mật, rollout hạm đội): phóng thẩm định đối kháng cô lập, tự thiết kế ≥3 cách phá · fail ×2 hoặc hai phép đo mâu thuẫn ⇒ phân xử 🔴. Phán quyết chỉ có 3 dạng: `✅ DUYỆT` · `🔁 SỬA: <đúng mục nào>` · `⛔ DỪNG: <vì sao>`.
<!-- /brain:rule:workflow -->

<!-- brain:rule:skill-vault -->
### F. Quy tắc Kho Kỹ Năng Di Động & Tự Kích Hoạt (Portable Skill Vault Invariant)
1. **Một kho, đi cùng repo:** TOÀN BỘ skill vận hành dự án nằm trong `.agents/skills/<name>/SKILL.md` (git giữ, clone là có). `name` chỉ gồm `a-z`, `0-9`, `-`, trùng tên thư mục, KHÔNG bắt đầu bằng dấu chấm — Codex CLI và Gemini CLI bỏ qua thư mục `.x` (đo 2026-09-07). **CẤM** tạo `skills/`, `.skills/` ở root.
2. **Hai điểm nạp, MỘT nguồn chân lý (như Luật J):** Codex/Gemini đọc thẳng `.agents/skills/`; Claude Code CHỈ đọc `.claude/skills/` ⇒ mỗi skill có shim `.claude/skills/<name>/SKILL.md` ≤10 dòng do engine sinh (frontmatter chép `name`/`description`, thân chỉ trỏ về nguồn, có mốc `brain:skill-shim`). **CẤM** sửa tay shim, **CẤM** chép thân skill sang `.claude/skills/`, **CẤM** symlink.
3. **Bộ skill não** (`nao-dong-bo`, `nao-commit`, `nao-dong-phien`, `nao-ten-phien`, `vai-dieu-phoi`, `vai-thi-cong`; frontmatter `metadata.brain4agent: managed`) do engine ở Bước 0 kéo từ hub về repo. **CẤM** sửa tại repo — sửa ở hub rồi chạy engine; trùng tên mà không có dấu quản lý ⇒ engine dừng, người xử (`BRN-022`).
4. **TỰ KÍCH HOẠT, không chờ `/`:** `description` mỗi skill BẮT BUỘC một dòng, có câu `Dùng khi người dùng nói …` (không dấu hai chấm sau "nói" — YAML). Agent gặp từ khoá khớp ⇒ tự nạp `SKILL.md` đó và làm theo ngay, nêu rõ "đang dùng skill `<name>`"; gõ `/<name>` vẫn hợp lệ. Vai (`vai-*`) kích hoạt bằng câu chuẩn `Em là super orchestrator của repo này.` / `Bạn là worker của repo này.` và trả lời bằng 3 dòng `Vai · Tầng · Được quyết/CẤM`. Thiếu câu kích hoạt ⇒ `BRN-023`.
<!-- /brain:rule:skill-vault -->

<!-- brain:rule:conduct -->
### L. Quy tắc Ứng Xử Chung Cho Mọi Vỏ Agent (Agent Conduct Invariant)
1. **Ngôn ngữ:** trả lời người dùng bằng tiếng Việt, ngắn gọn, đi thẳng vào vấn đề; commit message, tên mã, tên file bằng tiếng Anh. Luật này áp cho MỌI vỏ (Claude Code, Codex CLI, Gemini CLI, …) — vỏ không giữ luật, repo giữ.
2. **Tự quyết, KHÔNG hỏi bằng thẻ lựa chọn:** quyết định kỹ thuật (thư viện, cấu trúc, cách triển khai) tự chọn phương án đơn giản, an toàn, dễ bảo trì nhất rồi làm luôn; ghi rõ đã chọn gì, vì sao, chỗ người dùng có thể đổi. CẤM công cụ hỏi dạng thẻ (`AskUserQuestion`, `ask_question`); đề xuất commit cũng bằng lời tiếng Việt. Luật này THAY THẾ mọi câu "bắt buộc dùng `ask_question`" cũ hơn trong file này.
3. **Ngoại lệ BẮT BUỘC dừng hỏi bằng lời:** xoá dữ liệu/nhiều file, drop DB, đổi contract/API đã duyệt theo hướng lệch, bỏ requirement đã nêu, thao tác chạm production/remote (`git push`, deploy). Nêu rủi ro một câu rồi chờ.
4. **Xong = đã đo:** đọc code liên quan trước khi sửa, theo quy ước sẵn có, code module hoá; chạy build/test trước khi báo hoàn thành — không chạy được thì nói rõ vì sao; kiểm mã thoát trực tiếp, không qua `grep`.
5. **Cập nhật tài liệu ngay khi xong việc** (Ma Trận 6 Điểm ở §5.B), không chờ nhắc; kết thúc bằng khối "Tiếp theo" (Luật K).
6. **Link bấm được:** nhắc file/thư mục trong câu trả lời ⇒ link Markdown TƯƠNG ĐỐI từ root workspace (dòng: `#L<n>`), phân giải được từ chỗ người đọc đứng; CẤM scheme `file:` và đường tuyệt đối ổ đĩa.
<!-- /brain:rule:conduct -->
