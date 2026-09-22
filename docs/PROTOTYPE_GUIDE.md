# VINSTAY AI — HƯỚNG DẪN TRẢI NGHIỆM BỘ PROTOTYPE TƯƠNG TÁC (PROTOTYPE GUIDE)

> **MỤC ĐÍCH TÀI LIỆU:**  
> Tài liệu này cung cấp kịch bản chạy thử nghiệm, đối soát tính năng và thuyết trình trực tiếp bộ Prototype tương tác đa vai trò (Interactive Multi-Role Prototype) của đề án **VinStay AI** tại **Vinhomes Ocean Park**.

---

## 1. TỔNG QUAN BỘ PROTOTYPE & CÁCH KHỞI CHẠY

- **Vị trí tệp tin:** `P-010/presentation/prototype.html` (hoặc mở trực tiếp file HTML trên bất kỳ trình duyệt Chrome/Safari/Edge nào).
- **Công nghệ cốt lõi:** Single-Page Application (HTML5, Tailwind CSS via Google gstatic CDN, Vanilla JavaScript thuần, 0 dependency cài đặt phức tạp, responsive toàn diện Desktop & Mobile).
- **Thanh điều hướng toàn cục (Global Role Switcher):** Cho phép ban giám khảo hoặc người dùng nhảy nhanh giữa 4 vai trò bất cứ lúc nào:
  1. `[👤 Khách Thuê]` (6 màn hình chuẩn)
  2. `[🏠 Chủ Nhà (0 Công sức)]` (4 màn hình ở nhà 100%)
  3. `[🚶 Field Host (PWA)]` (4 màn hình thao tác 1-chạm di động)
  4. `[⚙️ Quản Trị Viên]` (4 module điều hành BI & Biến phí)

---

## 2. KỊCH BẢN DEMO CHI TIẾT THEO TỪNG NHÓM NGƯỜI DÙNG

### 👤 NHÓM 1: KHÁCH THUÊ (TENANT JOURNEY — 6 MÀN HÌNH)

* **Màn 1: Bộ tính toán All-in Cost thời gian thực (`/`)**
  * **Thao tác tương tác:** Kéo thanh trượt Ngân sách trần (vd: chọn 10 triệu), thay đổi số lượng xe máy / ô tô và số người ở.
  * **Hành vi hệ thống:** Bóc tách ngay lập tức 4 khoản phí (Tiền thuê gốc + Phí BQL 9.5k/m2 + Phí gửi xe + Dự toán điện nước EVN 300k/người). Tự động lọc ẩn các căn vượt trần All-in.
  * **Điểm nhấn giám khảo:** Huy hiệu `🔥 CĂN HỜI PHÂN KHU (-12%)` và nhãn `VERIFIED 100% kèm timestamp`.
* **Màn 2: AI Matchmaker 30 Giây (`/matchmaker`)**
  * **Thao tác tương tác:** Xem trước 4 tiêu chí định hình nhanh $\rightarrow$ Bấm nút `[🚀 Bắt Đầu Quét & Khớp Nhu Cầu]`.
  * **Hành vi hệ thống:** Thanh progress bar chạy giả lập thuật toán quét 45 căn khả dụng, loại bỏ 42 căn không đạt chuẩn và trả về **Top 3 căn hời nhất** sau 2.4 giây, giải thích rõ nguyên nhân tiết kiệm 800.000 đ/tháng.
* **Màn 3: Chi tiết Căn hộ & Đặt lịch OTP (`/units/[id]`)**
  * **Thao tác tương tác:** Khảo sát bộ ảnh kiểm định 10 hạng mục $\rightarrow$ Chọn slot ca trực 15:30 $\rightarrow$ Nhập SĐT $\rightarrow$ Bấm `[📱 Gửi mã Zalo OTP]` $\rightarrow$ Bấm `Tự điền OTP mẫu (4829)` $\rightarrow$ Bấm `[Xác Nhận Lịch Hẹn]`.
  * **Điểm nhấn giám khảo:** Khách bắt buộc xác thực OTP để diệt trừ 100% môi giới ảo và no-show.
* **Màn 4: Trải nghiệm Zalo Bot T-10m & Đón sảnh 1-chạm**
  * **Thao tác tương tác:** Màn hình mô phỏng giao diện điện thoại Zalo Chat với VinStay OA. Đúng mốc T-10m, bot nhắc hẹn kèm vị trí Google Maps và thông tin Host.
  * **Thao tác mấu chốt:** Bấm nút 1-chạm: **`[📍 TÔI ĐÃ CÓ MẶT TẠI SẢNH S1.02]`**.
  * **Điểm nhấn giám khảo:** Tuyệt đối **không dán QR sảnh** vi phạm quy chế BQL; Host nhận thông báo ngay và bước ra sảnh quẹt thẻ cư dân thang máy đón khách trong 60 giây.
* **Màn 5: Khảo sát Hiện trường & Quét VietQR Cọc Giữ Chỗ 2M**
  * **Thao tác tương tác:** Host dẫn lên phòng. Khách ưng ý $\rightarrow$ Màn hình hiện mã VietQR động 2.000.000 VNĐ kèm đồng hồ khóa 24h $\rightarrow$ Bấm `[💳 Giả Lập Khách Quét QR]`.
  * **Hành vi hệ thống:** Webhook giả lập gạch nợ sau 1.5s $\rightarrow$ Căn hộ chuyển ngay sang trạng thái `HOLDING` (khóa toàn mạng lưới).
  * **Điểm nhấn giám khảo:** Ràng buộc pháp lý: 2 triệu này sẽ chuyển 100% thành một phần của **Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)**, tuyệt đối không trừ vào tiền thuê tháng đầu.
* **Màn 6: AI OCR CCCD & Ký Thỏa thuận Cọc Điện Tử**
  * **Thao tác tương tác:** Tải ảnh CCCD mẫu $\rightarrow$ Bấm `[🧠 AI Vision OCR Bóc Tách (3s)]` $\rightarrow$ Form tự động điền đủ Tên, Số CCCD, Ngày sinh, Địa chỉ $\rightarrow$ Bấm `[✍️ Ký Số Thỏa Thuận OTP]`.
  * **Điểm nhấn giám khảo:** Hoàn tất hợp đồng số và trao ngay **Danh bạ Thợ kỹ thuật ngoài uy tín** (điều hòa, điện nước, khóa) — VinStay AI giữ mô hình asset-light, không ôm đội bảo trì cồng kềnh.

---

### 🏠 NHÓM 2: CHỦ NHÀ (LANDLORD JOURNEY — Ở NHÀ 100%, 0 CÔNG SỨC)

* **Màn 1: Đăng ký Ký gửi Quản lý Độc quyền (Exclusive Mandate)**
  * Nhập thông tin [Tòa-Tầng-Căn], giá kỳ vọng và tích chọn `[Nhờ Host chụp ảnh thẩm định miễn phí]`. Chi phí kiểm định = 0 VNĐ.
* **Màn 2: Cung cấp Mã khóa cửa điện tử & Điều khoản thoát 15 ngày**
  * Nhập mã khóa `482910#` (được che bảo mật AES-256).
  * Đọc rõ điều khoản thoát linh hoạt: Chủ nhà được dừng ủy quyền bất kỳ lúc nào nếu ngưng cho thuê hoặc tự cho thuê, điều kiện: **Báo trước 15 ngày kèm trạng thái nhà trống**.
* **Màn 3: Bảng điều khiển "Ở Nhà 100%" & Giám sát từ xa**
  * Xem thẻ căn hộ đang ở trạng thái `HOLDING (24H)` kèm cọc 2.000.000 VNĐ đã gạch nợ.
  * Xem **Nhật ký mở cửa (Audit Trail)**: Giờ mở, Host phụ trách, kết quả chốt deal.
  * Xem luồng **Thông báo Zalo tức thì**: Báo khi có người mở cửa và khi có cọc 2M.
  * **Số liệu thực tế:** Quãng đường đi lại = 0 km; Thời gian mở cửa = 0 phút.
* **Màn 4: Kích hoạt Thoát ủy quyền linh hoạt 15 ngày**
  * Bấm `[⏱️ Kích Hoạt Yêu Cầu Dừng Ký Gửi]` $\rightarrow$ Widget đồng hồ đếm ngược 15 ngày xuất hiện. Hết 15 ngày, mã cửa tự động bị xóa sạch khỏi mạng lưới.

---

### 🚶 NHÓM 3: FIELD HOST / SALE NỘI KHU (MOBILE PWA 1-CHẠM)

* **Màn 1: Nhận Ticket Ca trực SLA 3 phút**
  * Chuông báo rung, đồng hồ SLA đếm ngược 3 phút $\rightarrow$ Host bấm nút 1-chạm `[⚡ NHẬN CA TRỰC NGAY]`. (Quá 3 phút tự động chuyển Open Pool 500m).
* **Màn 2: Mốc T-10m & Đón sảnh bằng Thẻ Cư Dân Thang Máy**
  * Host túc trực tại sảnh A. Khi khách bấm nút trên Zalo, màn hình Host chuyển sang: `🟢 Khách đã có mặt tại sảnh!`.
  * Host bấm `[💳 Quẹt Thẻ Cư Dân Thang Máy]` đưa khách lên phòng trong 60 giây.
* **Màn 3: Cấp mã mở cửa tức thì ngay tại cửa căn hộ**
  * Đứng trước cửa phòng 12A08 $\rightarrow$ Bấm `[🔓 XÁC NHẬN XEM PHÒNG]`.
  * Màn hình hiện mã số: **`482910#`** (tự hủy sau 10 phút), đồng thời gửi tin Zalo báo cho Chủ nhà. Tuyệt đối **không dùng Lockbox** treo cửa vi phạm BQL.
* **Màn 4: Chốt Deal VietQR 2M & Lập Hộ chiếu Bàn giao số**
  * Màn hình rung chuông báo thành công; **Ví tiền của Host nhảy số ngay: +450.000 VNĐ** (50k phí dẫn + 400k hoa hồng chốt cọc).
  * Form kiểm định 10 hạng mục nội thất (tường, sàn, sofa, điều hòa, bếp...) sẵn sàng để tích chọn và lập Hộ chiếu bàn giao số.

---

### ⚙️ NHÓM 4: QUẢN TRỊ VIÊN (ADMIN PORTAL — 4 MODULE)

* **Module 1: BI Funnel & Bản đồ nhiệt lấp đầy (Occupancy Heatmap)**
  * Phễu chuyển đổi 6 giai đoạn thời gian thực (Truy cập $\rightarrow$ Matchmaker $\rightarrow$ Đặt lịch OTP $\rightarrow$ Check-in sảnh $\rightarrow$ VietQR 2M $\rightarrow$ Ký cọc số).
  * Tỷ lệ no-show đạt chuẩn cực thấp: 3.8% (nhờ cơ chế OTP + Zalo T-10m).
  * Heatmap tỷ lệ lấp đầy trực quan Sapphire 1 & 2 (Tòa S1.01: 94%, Tòa S2.05: 72% cần kích cầu).
* **Module 2: Quản lý Rổ hàng Độc quyền & Giám sát Thoát 15 ngày**
  * Bảng theo dõi 128 căn hộ phân loại theo trạng thái (`Available`, `Holding`, `Rented`, `Exit Pending`).
  * Giám sát chính xác từng ngày còn lại của căn yêu cầu thoát ủy quyền.
* **Module 3: Giám sát Điều phối SLA Field Host**
  * Giám sát thời gian nhận ticket của Host. Đánh dấu đỏ ticket quá 3 phút để Area Lead tiếp quản.
* **Module 4: Dynamic Commission & Incentive Engine**
  * Bảng điều khiển 4 tham số biến phí: Thù lao lượt dẫn (30k-100k), Hoa hồng chốt cọc (200k-1M), Hệ số sao (x1.0-x1.5), Thưởng nóng giờ vàng (0-500k).
  * Kéo thanh trượt $\rightarrow$ Bảng kê thanh toán tuần (Weekly Payout) của Host tự động nhảy số theo thời gian thực $\rightarrow$ Nút xuất file Excel/CSV chuyển khoản ngân hàng 1-chạm.

---

## 3. TỔNG KẾT ĐỐI SOÁT CÁC NGUYÊN TẮC CỐT LÕI (GUARDRAIL VERIFICATION)

| Nguyên tắc cam kết | Trạng thái trên Prototype | Vị trí kiểm chứng |
| :--- | :---: | :--- |
| **Minh bạch 100% All-in Cost** | ✅ Đạt 100% | Màn 1 Khách thuê: Tính tự động 4 khoản phí, 0 chi phí ẩn |
| **Ảnh thật có Timestamp & Verified** | ✅ Đạt 100% | Màn 1 & Màn 3 Khách thuê: Dấu Watermark timestamp 22/09 |
| **AI Matchmaker 30 Giây** | ✅ Đạt 100% | Màn 2 Khách thuê: Animation lọc hard constraint trong 2.4s |
| **Chủ nhà ở nhà 100% (0km, 0 phút)** | ✅ Đạt 100% | Màn 3 Chủ nhà: Thống kê 0km di chuyển, Zalo alert tức thì |
| **Cấm dùng Lockbox treo cửa** | ✅ Đạt 100% | Màn 3 Field Host: Cấp mã số tức thì trên App tại cửa phòng |
| **Cấm dán QR sảnh rườm rà** | ✅ Đạt 100% | Màn 4 Khách thuê & Host: Nhắc hẹn kép Zalo nút 1-chạm [Có mặt] |
| **Cọc 2M chuyển thành Security Deposit** | ✅ Đạt 100% | Màn 5 Khách thuê: Cam kết bảo đảm tài sản, không trừ tiền thuê |
| **Thoát ủy quyền linh hoạt 15 ngày** | ✅ Đạt 100% | Màn 4 Chủ nhà & Mod 2 Admin: Countdown widget 15 ngày |
| **Danh bạ thợ ngoài Asset-Light** | ✅ Đạt 100% | Màn 6 Khách thuê: Danh bạ thợ uy tín Ocean Park tự liên hệ |
