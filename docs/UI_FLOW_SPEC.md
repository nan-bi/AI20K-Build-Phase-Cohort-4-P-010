# VINSTAY AI — BẢN ĐẶC TẢ LUỒNG GIAO DIỆN & NGHIỆP VỤ TỔNG THỂ (MASTER UI FLOW SPEC)

> **MỤC ĐÍCH TÀI LIỆU:**  
> Bản đặc tả này đóng vai trò "bản đồ hành trình trực quan" cho toàn bộ đội ngũ phát triển kỹ thuật (Frontend, Backend, AI Engineer) và vận hành thực địa. Tài liệu vạch rõ 4 luồng người dùng độc lập nhưng đan cài mật thiết vào nhau: **(1) Khách thuê**, **(2) Nguồn căn Chủ nhà**, **(3) Field Host nội khu** (phân định rõ vai **Sale** và **Thẩm định viên - Inspector**), và **(4) Quản trị viên Nền tảng**, bám sát 100% các nguyên tắc cốt lõi: **Minh bạch All-in Cost**, **Hình ảnh thật có timestamp**, **Khớp căn 30 giây**, **Chủ nhà vận hành 0 công sức** và **Mô hình Asset-Light**.

---

## 1. SƠ ĐỒ TỔNG THỂ TƯƠNG TÁC ĐA VAI TRÒ (CROSS-ROLE E2E INTERACTION)

```mermaid
sequenceDiagram
    autonumber
    actor Landlord as 🏠 Chủ Nhà
    actor Tenant as 👤 Khách Thuê
    actor HostSale as 🚶 Field Host (Sale)
    actor HostInsp as 🔍 Field Host (Inspector)
    participant Web as 💻 VinStay Web/App
    participant AI as 🧠 AI Engine
    participant DB as 🗄️ Store/DB
    actor Admin as ⚙️ Admin Portal

    %% GIAI ĐOẠN 1: NGUỒN CĂN & THẨM ĐỊNH
    Note over Landlord, Admin: GIAI ĐOẠN 1: KÝ GỬI 3 BƯỚC & THẨM ĐỊNH 32 HẠNG MỤC
    Landlord->>Web: Form ký gửi 3 bước: [Tòa-Căn] → [Giá & Cam kết 15 ngày] → [Lịch thẩm định]
    Web->>DB: Tạo hồ sơ ký gửi (Trạng thái: Chờ thẩm định)
    Admin->>HostInsp: Phân công Inspector tiếp nhận ticket thẩm định
    HostInsp->>Web: Thẩm định thực địa 32 hạng mục (5 nhóm Điều 5) + Ký biên bản số
    Admin->>Web: Phê duyệt kết quả thẩm định → Căn chuyển sang 'available' (Verified 100%)

    %% GIAI ĐOẠN 2: KHÁCH TÌM PHÒNG & ĐẶT LỊCH
    Note over Tenant, AI: GIAI ĐOẠN 2: TÌM CĂN & ĐẶT LỊCH 1 MÀN HÌNH
    Tenant->>Web: Nhập Ngân sách trần + Số người ở (All-in Cost)
    Web->>AI: Khớp nhu cầu Top 3 căn tối ưu + Badge "Căn hời phân khu" (30 giây)
    Tenant->>Web: Đặt lịch xem phòng (Chọn ngày, ca trực, Họ tên khách đặt, SĐT, OTP)
    Web->>Tenant: Xác nhận lịch hẹn kèm 3 lưu ý (Đến đúng giờ, Giấy tờ tùy thân, Hủy trước 2h)

    %% GIAI ĐOẠN 3: ĐIỀU PHỐI HOST & TIẾP ĐÓN SẢNH
    Note over HostSale, Web: GIAI ĐOẠN 3: ĐIỀU PHỐI THỰC ĐỊA & NHẮC HẸN T-10M
    Web->>HostSale: Gán ticket xem phòng (Auto-Dispatch SLA <= 3 phút)
    HostSale-->>Web: Nhận ca trực xem phòng
    Note over Tenant, HostSale: Mốc T-10 phút trước giờ hẹn
    Web->>HostSale: Nhắc di chuyển xuống sảnh tòa nhà
    Tenant->>Web: Bấm nút 1-chạm [Tôi đã có mặt tại sảnh] trên trang tra cứu
    HostSale->>Web: Bấm [Bắt đầu dẫn khách] trên RAIL tiến trình
    HostSale->>Tenant: Đón tại sảnh, quẹt thẻ cư dân thang máy đưa lên tầng (60 giây)

    %% GIAI ĐOẠN 4: MỞ CỬA & KHẢO SÁT HIỆN TRƯỜNG
    Note over HostSale, Landlord: GIAI ĐOẠN 4: CẤP MÃ CỬA TỨC THÌ (CHỦ NHÀ Ở NHÀ 100%)
    HostSale->>Web: Đến cửa phòng, bấm lấy mã mở khóa điện tử (hoặc xem hướng dẫn chìa cơ)
    Web->>HostSale: Cấp mã số cửa (tự ẩn sau khi mở), đồng bộ ghi nhận nhật ký xem
    Web->>Landlord: Báo tin: "Căn hộ của bạn đang có Host dẫn khách xem thực tế"
    HostSale->>Tenant: Hướng dẫn khảo sát chi tiết không gian nội thất

    %% GIAI ĐOẠN 5: CHỐT CĂN & CỌC GIỮ CHỖ 7 NGÀY
    Note over HostSale, Tenant: GIAI ĐOẠN 5: CỌC GIỮ CĂN 7 NGÀY (TRÊN THIẾT BỊ KHÁCH)
    Tenant->>HostSale: Đồng ý thuê căn hộ
    HostSale->>Web: Bấm [Khách cọc căn này] → Chuyển sang màn Chờ cọc (TUYỆT ĐỐI KHÔNG HIỆN VIETQR TRÊN MÁY HOST)
    Web->>Tenant: Trang tra cứu của khách nảy bảng điều khoản cọc + VietQR động 2.000.000 VNĐ
    Tenant->>Web: Quét VietQR thanh toán 2.000.000 VNĐ
    Web->>DB: Gạch nợ tự động → Khóa căn 'holding' (Giữ chỗ 7 ngày), kích hoạt Countdown 7 ngày
    Web->>Landlord: Báo tin nhận cọc 2.000.000 VNĐ giữ chỗ 7 ngày

    %% GIAI ĐOẠN 6: KÝ THỎA THUẬN CỌC & HOÀN TẤT HỢP ĐỒNG THUÊ
    Note over Tenant, HostSale: GIAI ĐOẠN 6: KÝ CỌC OTP, eKYC CCCD & KÝ HĐ THUÊ
    Tenant->>Web: Điền thông tin, vẽ chữ ký tay, ký Thỏa thuận cọc số qua OTP Zalo
    Web->>Tenant: Xuất Thỏa thuận cọc đã ký kèm nút in PDF / tải về
    HostSale->>Web: Màn hình Host đồng bộ trạng thái "Đã ký cọc", chuyển sang theo dõi HĐ
    Tenant->>Web: Thực hiện eKYC (chụp CCCD 2 mặt) & ký Hợp đồng thuê chính thức
    Web->>DB: Căn chuyển sang 'rented'; cọc 2 triệu chuyển 100% thành Tiền Cọc Bảo Đảm Tài Sản
    Admin->>HostSale: Tự động ghi nhận thù lao dẫn + hoa hồng chốt cọc vào ví Host
```

---

## 2. CHI TIẾT LUỒNG 1: KHÁCH THUÊ (TENANT UI JOURNEY)

Khách thuê đi qua chuỗi **6 màn hình chuẩn**, bảo đảm trải nghiệm **Minh bạch All-in Cost**, **0 tin ảo**, **tự chủ hoàn toàn trên thiết bị cá nhân**:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LUỒNG GIAO DIỆN KHÁCH THUÊ                                  │
│                                                                                               │
│ [MÀN 1: Web Catalog] ──► [MÀN 2: AI Matchmaker] ──► [MÀN 3: Chi Tiết & Đặt Lịch 1 Màn Hình]   │
│       ▲                                                                   │                   │
│       │                                                                   ▼                   │
│ [MÀN 6: eKYC & Ký HĐ Thuê] ◄── [MÀN 5: Cọc 7 Ngày & Ký Cọc] ◄── [MÀN 4: Check-in Sảnh T-10m] │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Màn 1: Web Catalog & Bộ Lọc All-in Cost Thời Gian Thực (`/`)
* **Mục tiêu:** Giúp khách nhìn thấy ngay tổng chi phí thực tế hàng tháng trọn gói, loại trừ 100% nguy cơ sốc chi phí ẩn khi dọn vào ở.
* **Thành phần giao diện:**
  * **Header:** Logo VinStay AI, hotline khẩn cấp nội khu, nút chọn phân khu (*The Sapphire 1 & 2*).
  * **Thanh tìm kiếm All-in Cost:**
    * Dropdown Loại căn: `Studio`, `1PN+`, `2PN_1WC`, `2PN_2WC`, `3PN`.
    * Slider Ngân sách trần: từ 5.000.000 đ $\rightarrow$ 25.000.000 đ/tháng.
    * Bộ chọn thông số phụ: Số xe máy (150k/xe), Ô tô (1.250k/xe), Số nhân khẩu (dự toán điện nước 300k/người).
  * **Thẻ căn hộ (Unit Card):**
    * Ảnh thực tế góc rộng có dấu **Watermark số & Timestamp** kiểm định.
    * Mã định danh chuẩn mực: `[Tòa] - [Tầng] - [Mã căn]` (vd: `S1.02 - Tầng 12 - Căn 08`).
    * **Hộp bóc tách All-in Cost:** Giá thuê cơ bản + Phí quản lý Vinhomes (9.5k/m2) + Phí xe + Dự toán điện nước.
    * **Badge động:** Nhãn `[🔥 Căn Hời Phân Khu - Rẻ hơn 12%]` (nếu giá $\le 90\%$ giá TB tòa) hoặc `[🔥 HOT - Đang có khách quan tâm]`.
  * **Nút bấm hành động (CTA):** `[Xem Chi Tiết]` hoặc `[Chat AI Matchmaker]`.

### Màn 2: Hộp Thoại AI Matchmaker Khớp Nhu Cầu 30 Giây (`/matchmaker`)
* **Mục tiêu:** Thay thế 7–14 ngày lướt tin rác mạng xã hội bằng 30 giây khớp đúng Top 3 căn hộ tối ưu nhất theo All-in Cost.
* **Thành phần giao diện:**
  * Khung chat tương tác thông minh với 4 câu hỏi định hình nhanh (Quick Prompts):
    1. Ngân sách All-in tối đa bạn muốn chi trả mỗi tháng là bao nhiêu?
    2. Bạn muốn ở bao nhiêu người và cần loại căn nào?
    3. Bạn dự kiến ngày nào dọn vào ở?
    4. Bạn có gửi ô tô hay yêu cầu đặc biệt về tầng/hướng không?
  * **Khu vực kết quả (Sau $\le 30$ giây):**
    * Thông báo phân tích: *"VinStay AI đã quét các căn hộ khả dụng tại Sapphire 1 & 2 và lọc ra 3 căn hoàn toàn nằm dưới ngân sách trần của bạn:"*
    * **Top 3 Thẻ căn hộ đề xuất:** Xếp hạng theo độ khớp và mức độ tiết kiệm chi phí; hiển thị rõ lý do AI đề xuất (vd: *"Căn này giúp bạn tiết kiệm 800k/tháng so với mặt bằng phân khu"*).
  * **Nút bấm hành động (CTA):** `[Đặt Lịch Xem Ngay]`.

### Màn 3: Chi Tiết Căn Hộ & Sheet Đặt Lịch Xem Phòng 1 Màn Hình (`/units/[id]`)
* **Mục tiêu:** Đặt lịch xem phòng nhanh gọn trong 1 màn hình duy nhất, khớp ca trực thực địa của Host và xác thực SĐT thật.
* **Thành phần giao diện:**
  * Slide ảnh kiểm định thực tế (phòng khách, sofa, bếp, điều hòa, WC, view ban công).
  * Bảng thông số kỹ thuật: Diện tích thông thủy, nội thất bàn giao, tầng cao, hướng mát.
  * **BookingSheet (Form đặt lịch 1 màn hình):**
    * Tiêu đề: **"Chọn ngày bạn muốn xem"** — Calendar Date Picker cho phép chọn từ hôm nay đến hết tháng sau; dot chỉ báo ngày còn giờ trống; chip 'Sớm nhất' chọn khung giờ khả dụng gần nhất.
    * Khung chọn slot giờ: Sáng (08:30, 09:30, 10:30) | Chiều (14:30, 15:30, 16:30, 17:30).
    * Nhóm thông tin: **"Thông tin người đặt lịch"** với nhãn **"Họ tên khách đặt"** và Số điện thoại.
    * Ô nhập mã OTP 4 số gửi về Zalo/SMS.
    * Khi đặt lịch thành công: Hiển thị ngay **3 lưu ý quan trọng**:
      1. *Đến đúng giờ:* Host sẽ đón bạn tại sảnh tòa nhà đúng khung giờ đã chọn.
      2. *Mang theo giấy tờ tùy thân:* Cần CCCD để xác thực và làm thủ tục thang máy/xem phòng.
      3. *Hủy lịch trước tối thiểu 2 giờ:* Nếu có thay đổi, vui lòng hủy sớm để nhường ca cho khách khác.
  * **Nút bấm hành động (CTA):** `[Xác Nhận Đặt Lịch]`.

### Màn 4: Trải Nghiệm Tiếp Đón Sảnh & Check-in 1-Chạm (`/booking/[ref]`)
* **Mục tiêu:** Chấm dứt cảnh lạc đường và đứng chờ đợi vạ vật tại sảnh đại đô thị Ocean Park.
* **Thành phần giao diện:**
  * **Timeline tiến trình 8 mốc chuẩn:** `Đã gửi yêu cầu` → `Host nhận lịch` → `Có mặt tại sảnh` → `Xem phòng` → `Chờ cọc` → `Ký cọc` → `eKYC` → `Hợp đồng thuê`.
  * Thông tin lịch hẹn: Mã đặt lịch, căn hộ xem, thời gian hẹn, thông tin Field Host phụ trách (Họ tên, SĐT).
  * **Nút bấm 1-chạm "Tôi đã có mặt tại sảnh" (`tenantCheckIn`):**
    * Khi trạng thái `confirmed`: Nút hiển thị nổi bật màu xanh lá để khách bấm ngay khi đến sảnh tòa nhà.
    * Khi đã bấm: Badge `[Đã có mặt tại sảnh]` hiển thị, thông báo Host chuẩn bị đón lên phòng.
  * Quy tắc hủy/đổi lịch: Khóa đổi/hủy lịch khi thời gian còn dưới 2 giờ trước giờ hẹn.

### Màn 5: Cọc Giữ Căn 7 Ngày Qua VietQR & Ký Thỏa Thuận Cọc Số
* **Mục tiêu:** Đặt cọc minh bạch, khóa căn tức thì 7 ngày chống tranh căn; khách tự thực hiện trên máy cá nhân an toàn 100%.
* **Thành phần giao diện (khi Host bấm "Khách cọc căn này"):**
  * **Bảng điều khoản cọc (`DepositTermsBox`):**
    * 4 gạch đầu dòng cam kết: Cọc 2.000.000 VNĐ giữ căn độc quyền 7 ngày; Số tiền chuyển 100% thành cọc bảo đảm tài sản khi ký HĐ chính thức; Tuyệt đối không trừ vào tiền thuê tháng 1; Mất cọc nếu quá 7 ngày không ký HĐ do lỗi khách thuê.
    * Trích dẫn pháp lý: Điều 328 Bộ luật Dân sự 2015 & Nghị định 13/2023/NĐ-CP bảo vệ dữ liệu cá nhân.
  * **Mã VietQR động cọc 2.000.000 VNĐ:**
    * Nội dung chuyển khoản tự động gắn mã căn và SĐT khách; tài khoản định danh nền tảng.
    * Nút demo: "Giả lập chuyển khoản thành công (Test)".
  * **Khi đã thanh toán thành công:**
    * Căn hộ chuyển sang trạng thái `holding` (khóa toàn mạng lưới trong 7 ngày).
    * **Countdown Banner:** Đếm ngược thời hạn 7 ngày cam kết ký HĐ thuê (kèm nút tua hạn demo).
    * **Ký Thỏa thuận cọc số (`AgreementFormSection`):**
      * Form 4 trường: Họ tên khách, Số CCCD, Ngày cấp, Nơi thường trú.
      * Khung xem trước văn bản Thỏa thuận cọc điện tử (có watermark NHÁP).
      * Bảng vẽ chữ ký tay điện tử (`SignaturePad`) với nút ký lại.
      * Nút ký số: Gửi mã OTP xác nhận qua Zalo và hoàn tất ký thỏa thuận.
    * **Xem & In Thỏa thuận cọc đã ký:**
      * Hiển thị toàn văn biên bản Thỏa thuận cọc có chữ ký và dấu mộc điện tử.
      * Nút in PDF (`PrintDocButton`) để khách lưu trữ hoặc in bản cứng.

### Màn 6: eKYC CCCD 2 Mặt & Ký Hợp Đồng Thuê Chính Thức
* **Mục tiêu:** Hoàn tất thủ tục pháp lý thuê nhà chính thức 100% online, ràng buộc trách nhiệm và kích hoạt bàn giao.
* **Thành phần giao diện:**
  * **eKYC CCCD (`KycCapture`):** Chụp ảnh mặt trước và mặt sau CCCD gắn chip với khung hướng dẫn rõ nét; AI tự động trích xuất và đối soát khớp với thông tin đã ký cọc.
  * **Ký Hợp đồng thuê (`LeaseForm`):**
    * Hiển thị Hợp đồng thuê căn hộ chính thức với đầy đủ điều khoản All-in Cost, thời hạn thuê, điều khoản cọc bảo đảm tài sản.
    * Khách ký xác nhận qua mã OTP bảo mật AES-256.
  * **Chốt giao dịch:** Căn hộ chuyển trạng thái `rented`; tiền cọc 2 triệu chuyển thành cọc bảo đảm; mở quyền truy cập Hộ chiếu bàn giao và danh bạ thợ kỹ thuật ngoài.
  * *Xử lý quá hạn:* Nếu quá 7 ngày không ký HĐ thuê, banner cảnh báo cọc hết hạn (`forfeited`) hiển thị theo đúng thỏa thuận.

---

## 3. CHI TIẾT LUỒNG 2: NGUỒN CĂN CHỦ NHÀ (LANDLORD UI JOURNEY — 0 CÔNG SỨC VẬN HÀNH)

Chủ nhà trải nghiệm quy trình **"ở nhà 100%"**, ủy quyền 1 lần duy nhất qua form 3 bước rút gọn và theo dõi mọi biến động qua Dashboard:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LUỒNG GIAO DIỆN CHỦ NHÀ                                   │
│                                                                                             │
│ [MÀN 1: Ký Gửi 3 Bước Rút Gọn] ──► [MÀN 2: Lịch Hẹn Thẩm Định Thực Địa]                     │
│                                                     │                                       │
│                                                     ▼                                       │
│ [MÀN 4: Thoát Ủy Quyền 15 Ngày] ◄── [MÀN 3: Dashboard Ở Nhà 100% & "Có Khách Xem"]         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Màn 1: Form Đăng Ký Ký Gửi 3 Bước Rút Gọn (`/landlord/consign`)
* **Thành phần:**
  * **Bước 1 — Thông tin căn hộ:** Chọn Tòa nhà, Tầng, Số căn hộ thực tế tại Ocean Park, loại căn, diện tích m², hiện trạng bàn giao (đầy đủ/cơ bản/trống).
  * **Bước 2 — Thông tin cho thuê & Cam kết:** Giá chào thuê mong muốn, hình thức khóa cửa (khóa điện tử mã số hoặc gửi chìa cơ tại sảnh); cam kết Hợp đồng Ủy quyền Quản lý Độc quyền kèm điều khoản thoát linh hoạt (báo trước 15 ngày khi nhà trống).
  * **Bước 3 — Lịch hẹn thẩm định thực địa:** Chọn ngày và khung giờ để Field Host phân khu đến thẩm định 32 hạng mục hiện trạng; nhập SĐT và ký xác nhận OTP.

### Màn 2: Danh Sách & Hồ Sơ Căn Hộ Chủ Nhà (`/landlord/units`)
* **Thành phần:**
  * Badge trạng thái kiểm định rõ ràng: `[Chờ thẩm định]` (vừa ký gửi) hoặc `[Đã thẩm định]` (đã có biên bản thẩm định 32 hạng mục).
  * Chỉ báo trạng thái khai thác: `available` (sẵn sàng đón khách), `holding` (đang có khách cọc giữ căn 7 ngày), `rented` (đang cho thuê).
  * Xem lại chi tiết hồ sơ ký gửi và biên bản thẩm định hiện trạng đã được phê duyệt.

### Màn 3: Bảng Điều Khiển Chủ Nhà "Ở Nhà 100%" (`/landlord/dashboard`)
* **Thành phần:**
  * **Chỉ báo "Có khách xem" thời gian thực:** Hiển thị nổi bật khi căn hộ đang có $\ge 1$ lịch hẹn đang mở (từ chờ xác nhận đến chờ cọc).
  * **Nhật ký mở cửa & xem phòng (Audit Trail):** Hiển thị chi tiết từng lượt dẫn: Ngày giờ, Host phụ trách, Họ tên khách, Kết quả xem phòng (đang xem, khách cọc, hoàn thành).
  * **Thông báo Zalo tức thì (Real-time Alert):**
    * Khi Host mở cửa: *"Căn hộ S1.02-12A08 đang được mở cửa đón khách bởi Host [Tên Host]."*
    * Khi có khách cọc: *"Chúc mừng! Căn hộ của bạn đã nhận cọc giữ chỗ 2.000.000 VNĐ (giữ căn 7 ngày) từ khách thuê [Tên Khách]."*
  * Xem Hộ chiếu bàn giao số và biên bản đối soát tài sản mọi lúc.

### Màn 4: Yêu Cầu Hủy Ủy Quyền Linh Hoạt 15 Ngày (`/landlord/exit-request`)
* **Thành phần:**
  * Nút bấm: `[Yêu cầu ngừng ủy quyền ký gửi]`.
  * Kiểm tra điều kiện: Nếu căn đang `holding` (có cọc 7 ngày), yêu cầu chờ giải quyết dứt điểm thời hạn cọc; nếu căn `available`, kích hoạt đồng hồ đếm ngược 15 ngày.
  * Hết 15 ngày: Trạng thái căn chuyển sang `unlisted`, gỡ mã cửa khỏi mạng lưới Host, hoàn tất thủ tục thanh lý ủy quyền.

---

## 4. CHI TIẾT LUỒNG 3: FIELD HOST NỘI KHU (PHÂN VAI SALE & INSPECTOR)

Field Host thao tác trên giao diện chuyên dụng, được phân tách quyền nghiêm ngặt theo vai trò được Admin chỉ định:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LUỒNG GIAO DIỆN FIELD HOST                                │
│                                                                                             │
│       VAI SALE (DẪN KHÁCH):                                                                 │
│       [Ticket SLA 3m] ──► [Đón Sảnh T-10m] ──► [Mở Cửa Xem Phòng] ──► [Chờ Cọc/Ký Cọc/HĐ]   │
│                                                                                             │
│       VAI INSPECTOR (THẨM ĐỊNH):                                                            │
│       [Nhận Lịch Thẩm Định] ──► [Khảo Sát 32 Hạng Mục Điều 5] ──► [Chấm Điểm & Ký Biên Bản]  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Luồng Field Host Vai Sale — Quy Trình Dẫn Khách 5 Bước Chuẩn (`/host/viewing/[id]`)

Thanh tiến trình RAIL cố định 5 bước rõ ràng: `["Đón khách", "Xem phòng", "Chờ cọc", "Ký cọc", "Hợp đồng"]`:

1. **Bước 1 — Đón khách (GreetStep):**
   * Theo dõi mốc T-10m: Xuống sảnh đón khách khi khách check-in "Tôi đã có mặt tại sảnh".
   * Bấm nút **`[Bắt đầu dẫn khách]`** $\rightarrow$ Quẹt thẻ thang máy đưa khách lên tầng.
2. **Bước 2 — Xem phòng (ViewStep):**
   * Tới trước cửa phòng: Bấm lấy mã mở khóa điện tử (mã số lớn, tự động ẩn sau khi thao tác) hoặc xem hướng dẫn nhận chìa cơ.
   * Gửi đồng thời tin báo Zalo tới chủ nhà: "Căn hộ đang được mở cửa dẫn khách".
   * Dẫn khách khảo sát hiện trạng. Nếu khách ưng ý, Host bấm **`[Khách cọc căn này]`**.
3. **Bước 3 — Chờ cọc (AwaitDepositStep):**
   * Màn hình Host chuyển sang trạng thái chờ đồng bộ thời gian thực: *"Khách đang thực hiện chuyển khoản cọc 2.000.000 VNĐ giữ căn 7 ngày trên điện thoại cá nhân"*.
   * **TUYỆT ĐỐI KHÔNG CÓ MÃ VIETQR TRÊN MÁY HOST** (bảo đảm an toàn pháp lý, tiền chuyển thẳng tài khoản nền tảng).
4. **Bước 4 — Ký cọc (AwaitAgreementStep):**
   * Khi khách đã cọc xong, màn hình Host hiển thị: *"Căn hộ đã khóa giữ chỗ 7 ngày. Khách đang đọc và ký Thỏa thuận cọc số qua OTP Zalo"*.
5. **Bước 5 — Hợp đồng & Hoàn tất (AwaitLeaseStep & DoneStep):**
   * Màn hình theo dõi khách hoàn tất eKYC và HĐ thuê chính thức.
   * Host có thể xem toàn văn Thỏa thuận cọc đã ký và in PDF (`PrintDocButton`).
   * Ghi nhận thù lao dẫn và hoa hồng chốt cọc vào ví Host.

### B. Luồng Field Host Vai Inspector — Thẩm Định Hiện Trạng 32 Hạng Mục (`/host/inspections`)

Inspector tiếp nhận hồ sơ ký gửi mới và thực hiện khảo sát chi tiết theo **32 hạng mục thuộc 5 nhóm chuẩn** (Điều 5 Hợp đồng Ủy quyền):

1. **Nhóm I: Kết cấu xây dựng & Hoàn thiện cố định** (Trần thạch cao, tường sơn, sàn gỗ/gạch, hệ thống cửa đi/cửa sổ, ban công/lô gia, kính an toàn...).
2. **Nhóm II: Hệ thống Điện & Chiếu sáng** (Tủ điện tổng, atomat, công tắc ổ cắm, đèn chiếu sáng, đầu chờ điều hòa...).
3. **Nhóm III: Hệ thống Cấp thoát nước & Thiết bị vệ sinh** (Lavabo, bồn cầu, vòi sen, bình nóng lạnh, thoát sàn, áp lực nước...).
4. **Nhóm IV: Nội thất rời & Đồ gỗ** (Sofa phòng khách, bàn ghế ăn, giường ngủ, nệm, tủ quần áo, rèm cửa...).
5. **Nhóm V: Thiết bị điện gia dụng & Tiện ích** (Điều hòa nhiệt độ, tủ lạnh, máy giặt, bếp từ, máy hút mùi, khóa cửa điện tử...).

* **Thao tác thẩm định:**
  * Mỗi hạng mục đánh giá tình trạng: `Đạt` / `Không đạt` / `Cần sửa chữa`, ghi chú hư hại cụ thể (nếu có).
  * Chụp ảnh thực tế đính kèm timestamp kiểm định.
  * Hệ thống tự động tính điểm chất lượng căn hộ.
  * Inspector vẽ chữ ký tay và ký số nộp biên bản thẩm định lên Admin.

---

## 5. CHI TIẾT LUỒNG 4: QUẢN TRỊ VIÊN NỀN TẢNG (ADMIN PORTAL UI JOURNEY)

Bảng điều khiển trung tâm giúp Quản trị viên nắm bắt toàn diện dữ liệu, quản trị phân vai Host và xử lý ngoại lệ:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                LUỒNG GIAO DIỆN ADMIN PORTAL                                 │
│                                                                                             │
│ [MÀN 1: BI Dashboard & Phễu] ──► [MÀN 2: Quản Lý Rổ Hàng & Nhật Ký Xem]                    │
│                 │                                      │                                    │
│                 ▼                                      ▼                                    │
│ [MÀN 4: Phân Vai Host & RoleGate] ◄── [MÀN 3: Sổ Quản Lý Hợp Đồng & Mẫu Pháp Lý]            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Màn 1: Bảng Điều Khiển BI & Phễu Chuyển Đổi Thời Gian Thực (`/admin/dashboard`)
* **Thành phần:**
  * **Phễu chuyển đổi 6 giai đoạn:** Truy cập Web $\rightarrow$ Chat AI Matchmaker $\rightarrow$ Đặt lịch OTP $\rightarrow$ Check-in sảnh $\rightarrow$ Quét VietQR cọc 2M (giữ 7 ngày) $\rightarrow$ Ký Thỏa thuận cọc số & HĐ thuê.
  * **Bản đồ nhiệt lấp đầy (Occupancy Heatmap):** Tỷ lệ phòng trống theo từng tòa tại Sapphire 1 & 2.
  * Tỷ lệ no-show và tỷ lệ chuyển đổi deal thành công của mạng lưới Host.

### Màn 2: Quản Lý Rổ Hàng & Nhật Ký Xem Phòng (`/admin/inventory` & `/admin/inventory/[id]`)
* **Thành phần:**
  * Bảng danh sách căn hộ kèm bộ lọc trạng thái (`available`, `holding`, `rented`, `unlisted`).
  * Phê duyệt biên bản thẩm định 32 hạng mục do Inspector nộp.
  * **Nhật ký xem phòng chi tiết:** Hiển thị toàn bộ lịch sử các ca dẫn khách của căn hộ (Thời gian, Host dẫn, Khách xem, Trạng thái, Kết quả).
  * Giám sát đếm ngược thoát ủy quyền 15 ngày (`mandate_termination_countdown`).

### Màn 3: Sổ Quản Lý Hợp Đồng, Mẫu Văn Bản & Bên Ký (`/admin/contracts`)
* **Thành phần:**
  * Sổ quản lý 4 nhóm hợp đồng: Ủy quyền độc quyền, Thỏa thuận cọc giữ căn 7 ngày, Hợp đồng thuê chính thức, Thỏa thuận đối tác Host.
  * Danh mục 32 mẫu văn bản pháp lý chuẩn hóa đồng bộ kho `legal/`.
  * Quản lý hồ sơ các bên ký với cơ chế mã hóa PII theo Nghị định 13/2023/NĐ-CP.

### Màn 4: Quản Lý Nhân Sự Host & Phân Quyền Vai Trò (`/admin/hosts` & `/admin/hosts/[id]`)
* **Thành phần:**
  * **Phân vai linh hoạt:** Quản trị viên chỉ định vai trò cho từng Host:
    * `Sale`: Phụ trách ca trực tiếp đón, dẫn khách xem phòng, xúc tiến chốt cọc.
    * `Inspector`: Phụ trách khảo sát, thẩm định thực địa 32 hạng mục cho căn hộ mới ký gửi.
    * Hoặc cả hai vai (`Sale & Inspector`).
  * **Kiểm soát truy cập (RoleGate):**
    * Host vai Sale chỉ thấy menu Điều phối ca trực (`/host/dispatch`), Lịch xem phòng (`/host/viewing`).
    * Host vai Inspector chỉ thấy menu Thẩm định căn hộ (`/host/inspections`).
    * Khi Host cố truy cập tính năng ngoài vai trò: Hệ thống hiển thị thông báo chặn quyền RoleGate rõ ràng.
  * Quản lý hồ sơ Host, đánh giá KPI, lịch sử dẫn khách và ví hoa hồng.

---

## 6. MA TRẬN ĐỒNG BỘ DỮ LIỆU GIỮA CÁC LUỒNG (DATA SYNC MATRIX)

| Sự kiện nghiệp vụ phát sinh | Cập nhật Luồng Khách Thuê | Cập nhật Luồng Chủ Nhà | Cập nhật Luồng Field Host | Cập nhật Luồng Admin Portal |
| :-- | :-- | :-- | :-- | :-- |
| **Chủ nhà hoàn tất ký gửi 3 bước** | Chưa hiển thị | Badge: `Chờ thẩm định` | Inspector nhận ticket thẩm định | Thông báo có hồ sơ ký gửi mới |
| **Inspector nộp biên bản 32 mục** | Chưa hiển thị | Xem trước biên bản thẩm định | Chuyển chế độ chỉ đọc | Chuông báo: Có biên bản cần duyệt |
| **Admin duyệt biên bản thẩm định** | Hiển thị căn hộ lên Web Catalog | Badge: `Đã thẩm định` (Sẵn sàng đón khách) | Hoàn tất ca thẩm định | Cập nhật rổ hàng verified 100% |
| **Khách đặt lịch xem phòng** | Nhận mã hẹn & 3 lưu ý quan trọng | Nhãn: `Có khách xem` | Sale nhận ticket ca trực (SLA 3m) | Tăng chỉ số phễu đặt lịch |
| **Khách bấm [Tôi đã có mặt tại sảnh]** | Badge: `Đã có mặt tại sảnh` | Nhận báo động khách đã tới | Rung chuông: Khách đã ở sảnh | Giám sát SLA tiếp đón đúng giờ |
| **Host mở cửa & dẫn xem phòng** | Khảo sát hiện trạng căn hộ | **Zalo báo: Phòng đang mở cửa xem** | Cấp mã mở cửa số (tự ẩn) | Ghi nhật ký mở cửa căn hộ |
| **Host bấm [Khách cọc căn này]** | Mở bảng điều khoản cọc & VietQR 2M | Nhận tin: Khách đang làm thủ tục cọc | Màn hình Host: Chờ khách cọc | Phễu chuyển sang giai đoạn cọc |
| **Khách quét VietQR cọc 2 triệu** | Căn khóa `holding` 7 ngày; mở form ký cọc | **Zalo báo: Đã nhận cọc 2 triệu giữ căn 7 ngày** | Màn hình Host: Đã cọc, chờ khách ký cọc | Khóa căn toàn hệ thống; hủy lịch xem sau |
| **Khách ký Thỏa thuận cọc OTP** | Xem & in PDF Thỏa thuận cọc; mở eKYC | Nhận bản sao Thỏa thuận cọc số | Màn hình Host: Đã ký cọc, chờ ký HĐ | Lưu trữ chứng cứ ký số AES-256 |
| **Khách eKYC & ký Hợp đồng thuê** | Hoàn tất thuê, nhận danh bạ thợ | Nhận Hợp đồng thuê; cọc 2M chuyển cọc tài sản | Hoàn thành ca; ví hoa hồng nhảy số | Chuyển căn sang `rented`, cập nhật doanh thu |
| **Chủ nhà bấm [Yêu cầu thoát 15 ngày]** | Vẫn hiển thị nếu căn còn trống | Đếm ngược 15 ngày thoát ủy quyền | Dẫn nốt trong thời hạn 15 ngày | Theo dõi danh sách sắp offboard |
| **Admin bấm [Hoàn tất thoát ủy quyền]** | Gỡ căn khỏi Web Catalog (`unlisted`) | Zalo báo: Căn hộ đã offboard thành công | Gỡ mã cửa khỏi mạng lưới Host | Chuyển trạng thái mandate `ended` |

---

> **KẾT LUẬN & ĐỊNH HƯỚNG BẢO TRÌ:**  
> Bản đặc tả Master UI Flow Spec này phản ánh chuẩn xác 100% kiến trúc nghiệp vụ phiên bản 0.7.0. Mọi cập nhật tính năng tiếp theo phải bám sát cấu trúc phân vai, quy trình cọc giữ căn 7 ngày và tính độc lập của thiết bị khách thuê đã được định hình tại tài liệu này.
