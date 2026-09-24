# QUY CHẾ QUẢN LÝ TÀI KHOẢN ĐỊNH DANH, QUYẾT TOÁN KÝ QUỸ & ĐỐI SOÁT ALL-IN COST
### (NAMED ESCROW ACCOUNT, FAST DEPOSIT SETTLEMENT & EVN RECONCILIATION PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-ADM-05*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015, Luật Các Tổ chức Tín dụng, Nghị định 52/2024/NĐ-CP về Thanh toán Không dùng Tiền mặt, Luật Nhà ở 2023, Thỏa thuận Ký quỹ 3 Bên và Quy chế Vận hành Nền tảng VinStay AI.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ AN TOÀN TÀI CHÍNH (FIDUCIARY TRUST)
Văn bản này quy định quy chế quản trị tài khoản định danh nền tảng, cơ chế ký quỹ độc lập bảo vệ tiền cọc của khách hàng, quy trình đối soát tự động hóa công tơ điện nước EVN và cơ chế giải tỏa tiền cọc thần tốc trên **Trang Quản Trị Hệ Thống (Admin Portal)** của nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Tôn chỉ an toàn tài chính:
1. **Cô lập dòng tiền tuyệt đối (Fund Isolation):** Toàn bộ tiền cọc giữ chỗ 24h và Tiền Cọc Bảo Đảm Tài Sản (Security Deposit) bắt buộc phải được lưu ký tại **Tài Khoản Ký Quỹ Định Danh Độc Lập** tại Ngân hàng Thương mại đối tác; tuyệt đối không hòa lẫn hoặc sử dụng vào dòng tiền hoạt động (OpEx) của công ty.
2. **Bảo vệ toàn vẹn tài sản Chủ nhà:** Tiền cọc 2 triệu ban đầu được chuyển đổi 100% thành Tiền Cọc Bảo Đảm Tài Sản giữ nguyên suốt kỳ hạn thuê (không khấu trừ vào tiền thuê tháng đầu), dự phòng tuyệt đối cho các hư hại nội thất và nợ tiền điện nước EVN.
3. **Giải tỏa thần tốc & Phê duyệt thụ động (Smart Release & Passive Approval):** Hoàn trả cọc trong vòng **60 giây** sau khi đối soát xong; tự động hoàn cọc sau 7 ngày nếu chủ nhà không phản hồi, chấm dứt triệt để nạn chiếm dụng tiền cọc bất hợp lý.

---

## ĐIỀU 1. KIẾN TRÚC PHÂN TÁCH DÒNG TIỀN & TÀI KHOẢN ĐỊNH DANH (VIRTUAL ACCOUNT)
Hệ thống tài chính của VinStay AI được kết nối trực tiếp với Cổng Open Banking của Ngân hàng đối tác (VietinBank / Techcombank / VPBank) theo mô hình 2 tài khoản chuyên biệt:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   KIẾN TRÚC PHÂN TÁCH DÒNG TIỀN ĐỘC LẬP (FUND ISOLATION)                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [NGƯỜI DÙNG: KHÁCH THUÊ]                                                                      │
│         │                                                                                        │
│         ▼ (Quét VietQR Động gạch nợ tự động trong 3 giây)                                        │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ TÀI KHOẢN KÝ QUỸ ĐỊNH DANH ĐỘC LẬP (NAMED ESCROW TRUST ACCOUNT)                         │   │
│   │ Tên tài khoản: VINSTAY AI - TAI KHOAN KY QUY BAO DAM                                     │   │
│   │ • Lưu ký 100% Cọc giữ chỗ 24h (2.000.000 VNĐ) & Tiền Cọc Bảo Đảm Tài Sản (1-2 tháng).   │   │
│   │ • ĐÓNG BĂNG VỐN: Công ty KHÔNG CÓ QUYỀN rút vốn để chi tiêu vận hành hay đầu tư.        │   │
│   │ • Chỉ được giải tỏa tự động theo kết quả biên bản Check-out và Smart Release.           │   │
│   └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ TÀI KHOẢN THU PHÍ DỊCH VỤ VẬN HÀNH (PLATFORM OPERATING ACCOUNT)                          │   │
│   │ Tên tài khoản: CONG TY CO PHAN CONG NGHE VINSTAY AI                                      │   │
│   │ • Thu phí hoa hồng nền tảng (Platform Commission) trích từ Chủ nhà khi chốt deal.        │   │
│   │ • Chi trả thù lao lượt dẫn (`base_viewing_fee`) và hoa hồng chốt cọc cho Field Host.    │   │
│   └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 2. CƠ CHẾ GẠCH NỢ TỨC THÌ QUA VIETQR ĐỘNG 2.000.000 VNĐ
Nhằm loại trừ sai sót chuyển nhầm nội dung và bảo đảm căn hộ được khóa ngay lập tức:

1. **Sinh mã VietQR động chuẩn NAPAS 247:**
   - Khi khách bấm `[Khóa căn giữ chỗ 24h]`, hệ thống tự động sinh mã VietQR động chứa:
     * Số tiền cố định: **`2,000,000 VNĐ`**.
     * Nội dung chuyển khoản mã hóa độc nhất: **`VINSTAY [UNIT_CODE] [BOOKING_ID]`** (ví dụ: `VINSTAY S1081205 BK9821`).
2. **Gạch nợ tức thời qua Webhook ngân hàng:**
   - Ngay khi khách hoàn tất chuyển khoản từ bất kỳ ứng dụng ngân hàng nào tại Việt Nam:
     * Ngân hàng thụ hưởng bắn tín hiệu Webhook API về máy chủ VinStay AI trong vòng **03 giây**.
     * Hệ thống tự động đối soát chính xác số tiền và mã booking $\rightarrow$ Chuyển trạng thái căn hộ sang **`Holding`**, đồng thời gửi biên lai điện tử có mã tham chiếu ngân hàng vào Zalo OA của khách.
   - **Xử lý chuyển sai lệch số tiền:** Nếu khách chuyển thiếu hoặc thừa, hệ thống tự động kích hoạt lệnh hoàn trả lại tài khoản chuyển tiền trong vòng **15 phút**.

---

## ĐIỀU 3. QUẢN TRỊ TIỀN CỌC BẢO ĐẢM TÀI SẢN & NỘI THẤT (SECURITY DEPOSIT)
Nhằm hiện thực hóa giải pháp bảo vệ quyền lợi tài sản cho Chủ nhà:

1. **Chuyển đổi cọc 2 triệu giữ chỗ (Mandatory Conversion):**
   - Khi ký Hợp đồng thuê căn hộ chính thức: Khoản tiền cọc 2.000.000 VNĐ ban đầu được **chuyển đổi 100% thành một phần của Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)**.
   - **ĐIỀU KHOẢN BẢO VỆ CỐT LÕI: TUYỆT ĐỐI KHÔNG KHẤU TRỪ VÀO TIỀN THUÊ THÁNG ĐẦU TIÊN.** Khoản tiền này được giữ nguyên suốt kỳ hạn thuê trong tài khoản ký quỹ để bảo đảm bồi thường hư hao tài sản và nợ cước dịch vụ phát sinh.
2. **Bổ sung đủ Tiền cọc bảo đảm theo hợp đồng:**
   - Khách thuê nộp bổ sung phần tiền cọc bảo đảm còn lại (tương đương 01 tháng tiền thuê) trước ngày nhận bàn giao căn hộ (Check-in).
3. **Cơ chế Bù cọc trong 03 ngày khi có khấu trừ:**
   - Nếu trong quá trình thuê phát sinh vi phạm nội quy BQL hoặc làm hỏng thiết bị và bị khấu trừ cọc $\rightarrow$ Khách thuê có nghĩa vụ nộp bù đủ mức cọc ban đầu trong vòng **03 ngày làm việc** kể từ ngày nhận thông báo.

---

## ĐIỀU 4. THÁC KHẤU TRỪ QUYẾT TOÁN TỰ ĐỘNG (SETTLEMENT WATERFALL)
Tại thời điểm kết thúc hợp đồng thuê và trả nhà (Check-out), Admin Portal tự động thực hiện quyết toán tiền cọc bảo đảm theo thứ tự ưu tiên pháp lý nghiêm ngặt (Waterfall):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   THÁC KHẤU TRỪ QUYẾT TOÁN CỌC TỰ ĐỘNG (WATERFALL ORDER)                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [TỔNG TIỀN CỌC BẢO ĐẢM ĐANG KÝ QUỸ] (Ví dụ: 10.000.000 VNĐ)                                    │
│         │                                                                                        │
│         ▼ [ƯU TIÊN 1: HÓA ĐƠN ĐIỆN EVN & NƯỚC SINH HOẠT TỒN ĐỌNG]                                │
│         Khấu trừ tiền điện lũy tiến EVN + tiền nước theo chỉ số công tơ chốt tại tủ kỹ thuật.    │
│         │                                                                                        │
│         ▼ [ƯU TIÊN 2: TIỀN PHẠT VI PHẠM NỘI QUY BAN QUẢN LÝ (BQL)]                               │
│         Khấu trừ các khoản phạt do BQL Vinhomes lập biên bản (tiếng ồn > 22h, nuôi thú cưng...). │
│         │                                                                                        │
│         ▼ [ƯU TIÊN 3: CHI PHÍ KHẮC PHỤC HƯ HẠO NỘI THẤT BẤT CẨN]                                 │
│         Đối soát với Hộ chiếu bàn giao số 10 hạng mục; chỉ khấu trừ hư hỏng do bất cẩn            │
│         (loại trừ tuyệt đối hao mòn tự nhiên theo thời gian).                                    │
│         │                                                                                        │
│         ▼ [ƯU TIÊN 4: GIẢI TỎA TOÀN BỘ SỐ DƯ CÒN LẠI CHO KHÁCH THUÊ]                             │
│         Số tiền cọc còn lại được hệ thống Smart Release chuyển khoản tự động về tài khoản khách. │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 5. QUY TRÌNH GIẢI TỎA CỌC THẦN TỐC TRONG 60 GIÂY & CƠ CHẾ PHÊ DUYỆT THỤ ĐỘNG 7 NGÀY
Admin Portal cam kết tốc độ giải tỏa cọc nhanh nhất thị trường nhưng vẫn bảo đảm quyền lợi của Chủ nhà:

1. **Smart Release trong 60 giây khi có sự đồng thuận:**
   - Ngay khi Field Host hoàn thành biên bản Check-out trên app và Chủ nhà bấm xác nhận trên Chủ Nhà App $\rightarrow$ Hệ thống tự động phát lệnh qua Open Banking chuyển trả số dư cọc về tài khoản ngân hàng của Khách thuê trong vòng **60 giây**.
2. **Cơ chế Phê Duyệt Thụ Động Sau 7 Ngày (Passive Approval Rule):**
   - Nhằm ngăn chặn tình trạng Chủ nhà chây ì, cố tình không bấm xác nhận để giữ tiền cọc của khách:
     * Kể từ thời điểm Field Host tải lên đầy đủ ảnh kiểm định 10 hạng mục và chốt công tơ EVN, hệ thống kích hoạt đồng hồ đếm ngược **07 ngày (168 giờ)**.
     * Hệ thống gửi thông báo nhắc nhở Chủ nhà vào Ngày thứ 1, Ngày thứ 3 và Ngày thứ 6.
     * **Đúng 00:00 ngày thứ 8:** Nếu Chủ nhà không có khiếu nại bằng văn bản và không phản hồi trên app $\rightarrow$ Hệ thống coi như Chủ nhà đã chấp thuận hoàn toàn kết quả bàn giao; **tự động phát lệnh Smart Release hoàn trả 100% số dư cọc cho Khách thuê**.

---

## ĐIỀU 6. ĐỐI SOÁT & KIỂM TOÁN TÀI CHÍNH KÝ QUỸ ĐỊNH KỲ
1. **Đối soát số dư độc lập hàng ngày (Daily Bank Reconciliation):**
   - Đúng 23:59:59 hàng ngày, module tài chính của Admin Portal tự động đối soát chéo số dư thực tế tại Ngân hàng Ký Quỹ với tổng số dư cọc của toàn bộ các hợp đồng đang hiệu lực trong CSDL (`units.security_deposit_balance`).
   - Mức sai lệch cho phép: **0 VNĐ (Zero Discrepancy)**. Nếu phát hiện chênh lệch dù chỉ 1 đồng, hệ thống tự động phát cảnh báo đỏ tới Kế toán trưởng và CTO.
2. **Báo cáo tài chính ký quỹ minh bạch:**
   - Cung cấp sao kê ký quỹ minh bạch cho Chủ nhà và Khách thuê trên ứng dụng di động; bảo đảm sự tin cậy tuyệt đối vào năng lực vận hành chuyên nghiệp của nền tảng.

---

## ĐIỀU 7. HIỆU LỰC THI HÀNH
1. Quy chế này có hiệu lực bắt buộc áp dụng đối với toàn bộ các giao dịch ký gửi, đặt cọc giữ chỗ và quản lý tiền cọc bảo đảm tài sản của VinStay AI tại khu đô thị Vinhomes Ocean Park.
2. Mọi hành vi tự ý rút vốn hoặc can thiệp trái phép vào Tài khoản Ký Quỹ Độc Lập sẽ bị xử lý kỷ luật nghiêm khắc và truy cứu trách nhiệm hình sự theo pháp luật hiện hành.

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
