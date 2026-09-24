# QUY CHUẨN QUẢN TRỊ RỔ HÀNG ĐỘC QUYỀN, KHÓA CĂN GIỮ CHỖ 24H & GIÁM SÁT RÚT KÝ GỬI 15 NGÀY
### (EXCLUSIVE INVENTORY GOVERNANCE, 24H HOLDING LOCK & 15-DAY EXIT MONITORING PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-ADM-02*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015, Luật Nhà ở 2023, Luật Thương mại 2005, Hợp đồng Ký gửi Quản lý Độc quyền (Exclusive Mandate Agreement) và Quy chế Vận hành Nền tảng VinStay AI tại Vinhomes Ocean Park.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ VẬN HÀNH TINH GỌN (LEAN INVENTORY)
Văn bản này quy định quy chuẩn quản trị giỏ hàng căn hộ độc quyền, cơ chế khóa căn tức thì 24 giờ qua VietQR động và quy trình giám sát thoát ủy quyền minh bạch trong 15 ngày trên **Trang Quản Trị Hệ Thống (Admin Portal)** của nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Tôn chỉ quản trị rổ hàng:
1. **Triệt tiêu 100% rổ hàng "thiu" (Real-time Inventory Sync):** Mọi căn hộ trên hệ thống đều có mã định danh chuẩn `[Tòa - Tầng - Căn]` và được Chủ nhà ủy quyền độc quyền; chấm dứt tình trạng tin ảo, tin trùng và tráo căn trên thị trường.
2. **Chi phí kiểm định bằng 0 VNĐ (Zero Verification CapEx):** Thẩm định tiêu chuẩn nội thất 1 lần duy nhất lúc tiếp nhận ký gửi; tận dụng Hộ chiếu bàn giao số để duy trì dữ liệu hiện trạng xuyên suốt.
3. **Thoát ủy quyền linh hoạt 15 ngày (Fair & Flexible Exit):** Tôn trọng quyền tài sản của Chủ nhà; cho phép rút ký gửi nhanh chóng chỉ với điều kiện **báo trước 15 ngày kèm trạng thái nhà trống**.
4. **Khóa căn tự động chống tranh chấp:** Khoản cọc giữ chỗ 2 triệu qua VietQR động lập tức khóa căn hộ sang trạng thái `holding` trên toàn mạng lưới, loại trừ hoàn toàn việc bán trùng căn (Double-Booking).

---

## ĐIỀU 1. VÒNG ĐỜI 6 TRẠNG THÁI CĂN HỘ TRÊN CƠ SỞ DỮ LIỆU (`units.status`)
Toàn bộ rổ hàng căn hộ trên Admin Portal được quản trị qua máy trạng thái hữu hạn (Finite State Machine) nghiêm ngặt:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   VÒNG ĐỜI 6 TRẠNG THÁI CĂN HỘ ĐỘC QUYỀN (INVENTORY LIFECYCLE)                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [1. AVAILABLE] ───────► Đang trống, hiển thị công khai trên Web & AI Matchmaker.               │
│         │                                                                                        │
│         ├─── Quét VietQR 2.000.000 VNĐ ──► [2. HOLDING] (Khóa giữ chỗ 24h, ẩn khỏi tìm kiếm)     │
│         │                                        │                                               │
│         │                                        ├── Ký Hợp đồng thuê & Cọc ──► [3. RENTED]      │
│         │                                        └── Hết 24h không ký ────────► (Về Available)  │
│         │                                                                             │          │
│         │                                                                Mốc T-30 ngày│          │
│         │                                                                             ▼          │
│         │                                                             [4. PRE-LEASING]           │
│         │                                                             (Mở nhận khách nối tiếp)   │
│         │                                                                                        │
│         └─── Chủ nhà gửi yêu cầu rút ────► [5. EXIT PENDING] (Đếm ngược 15 ngày khi nhà trống)   │
│                                                  │                                               │
│                                                  └── Hết 15 ngày đếm ngược ──► [6. OFFBOARDED]   │
│                                                                                (Hoàn tất rút sàn)│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **`Available` (Sẵn Sàng Cho Thuê):** Căn hộ đã được xác thực 100% ảnh thật, có mã mở cửa JIT hoặc chìa cơ tại phân khu; sẵn sàng cho khách đặt lịch OTP.
2. **`Holding` (Đang Giữ Chỗ 24h):** Khách đã quét VietQR 2.000.000 VNĐ; căn hộ tạm thời ẩn khỏi kết quả tìm kiếm và khóa toàn bộ lịch đặt xem mới.
3. **`Rented` (Đang Cho Thuê):** Đã ký Hợp đồng số, chuyển 2 triệu thành Tiền Cọc Bảo Đảm Tài Sản và kích hoạt Hộ chiếu bàn giao 10 hạng mục.
4. **`Pre-Leasing` (Chuẩn Bị Trống Phòng):** Còn 30 ngày hết hạn thuê và khách hiện tại không gia hạn; mở tính năng đặt lịch xem trước cho khách mới.
5. **`Exit_Pending` (Đang Xử Lý Rút Ký Gửi):** Chủ nhà bấm rút ủy quyền; hệ thống kích hoạt đồng hồ đếm ngược 15 ngày.
6. **`Offboarded` (Đã Rút Khỏi Sàn):** Hết 15 ngày đếm ngược và không có công nợ; căn hộ bị đóng băng tài khoản và hoàn trả quyền tự quyết cho chủ nhà.

---

## ĐIỀU 2. CƠ CHẾ KHÓA CĂN GIỮ CHỖ 24H TỰ ĐỘNG QUA VIETQR ĐỘNG
Nhằm tạo áp lực chốt sớm văn minh và bảo vệ khách thuê đã chuyển cọc:

1. **Tự động chuyển trạng thái trong 3 giây (Bank Webhook Sync):**
   - Khi khách quét mã VietQR động 2.000.000 VNĐ gạch nợ vào tài khoản định danh nền tảng:
     * Cổng thanh toán bắn Webhook xác nhận thành công $\rightarrow$ Hệ thống tự động chuyển trạng thái căn hộ từ `Available` sang **`Holding`** trong vòng **03 giây**.
     * Đồng hồ đếm ngược **Countdown Widget (24:00:00)** hiển thị công khai trên giao diện chi tiết căn hộ.
2. **Bảo vệ độc quyền trong 24 giờ:**
   - Trong thời gian 24 giờ giữ chỗ, không bất kỳ khách thuê hay Field Host nào khác có thể đặt cọc hoặc tạo ticket xem phòng đối với căn hộ này.
   - Hệ thống tự động đẩy thông báo Zalo chúc mừng cho Khách và thông báo cho Chủ nhà: *"Căn hộ [Mã Căn] đã được giữ chỗ thành công; đang tiến hành ký Hợp đồng thuê số"*.
3. **Xử lý khi hết hạn 24 giờ:**
   - Nếu quá 24:00:00 mà khách không ký Hợp đồng thuê và không bổ sung đủ tiền cọc bảo đảm theo quy định:
     * Căn hộ tự động giải phóng trạng thái `Holding` quay trở về **`Available`** để đón khách mới.
     * Tiền cọc giữ chỗ được xử lý minh bạch theo Quy chế Ký quỹ (Chủ nhà nhận 50%, Quỹ vận hành nền tảng nhận 50% chi phí điều phối).

---

## ĐIỀU 3. GIÁM SÁT THOÁT ỦY QUYỀN LINH HOẠT 15 NGÀY (15-DAY EXIT MONITORING)
VinStay AI cam kết mô hình hợp tác cởi mở, không trói buộc chủ nhà bằng các điều khoản độc quyền bất khả kháng:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   QUY TRÌNH 4 BƯỚC THOÁT ỦY QUYỀN ĐỘC QUYỀN 15 NGÀY (SOP)                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [BƯỚC 1: CHỦ NHÀ GỬI YÊU CẦU TRÊN APP]                                                          │
│  Chủ nhà mở Chủ Nhà App bấm nút [Yêu Cầu Rút Ký Gửi Độc Quyền].                                  │
│                                                                                                  │
│  [BƯỚC 2: HỆ THỐNG KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT]                                                │
│  • Căn hộ đang ở trạng thái Available (nhà trống, không có hợp đồng thuê còn hiệu lực).           │
│  • Không có tranh chấp hư hỏng hoặc công nợ phí dịch vụ chưa giải quyết.                         │
│                                                                                                  │
│  [BƯỚC 3: KÍCH HOẠT WIDGET ĐẾM NGƯỢC 15 NGÀY TRÊN ADMIN & APP]                                   │
│  • Căn hộ chuyển sang trạng thái 'Exit_Pending'.                                                 │
│  • Đồng hồ hiển thị chính xác: "Còn lại: [X] ngày [Y] giờ để hoàn tất rút ký gửi".              │
│  • Trong 15 ngày này, VinStay AI vẫn được quyền khai thác dẫn khách; nếu có khách chốt cọc VietQR│
│    trước khi hết hạn, quyền ưu tiên thuộc về khách cọc hợp lệ.                                   │
│                                                                                                  │
│  [BƯỚC 4: TỰ ĐỘNG OFFBOARD & BÀN GIAO QUYỀN TRUY CẬP]                                            │
│  Đúng 00:00 ngày thứ 16:                                                                        │
│  • Trạng thái chuyển sang 'Offboarded'.                                                          │
│  • Xóa mã cửa JIT trên hệ thống, bàn giao chìa khóa cơ tại Văn phòng Phân khu cho Chủ nhà.      │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Module Giám sát trên Admin Portal (Exit Monitoring Dashboard):**
  * Danh sách toàn bộ các căn đang trong giai đoạn `Exit_Pending` được hiển thị trực quan kèm số ngày còn lại.
  * Đội ngũ Area Lead theo dõi để chủ động liên hệ hỗ trợ chủ nhà, tìm hiểu lý do rút (giá chưa hợp lý hay chủ nhà cần lấy lại nhà để ở) nhằm tối ưu chất lượng dịch vụ.

---

## ĐIỀU 4. THẨM ĐỊNH 1 LẦN DUY NHẤT & BẢO VỆ BẢN QUYỀN HÌNH ẢNH
1. **Kiểm định 0 đồng (Zero CapEx Verification):**
   - Khi tiếp nhận căn hộ mới, Field Host phân khu phối hợp cùng Chủ nhà kiểm tra thực tế 1 lần duy nhất: Chụp bộ ảnh 10 hạng mục nội thất có Timestamp + Geofence.
   - VinStay AI không thu bất kỳ khoản phí chụp ảnh hay phí thẩm định nào từ Chủ nhà (Chi phí = 0 VNĐ).
2. **Đóng Watermark số độc quyền chống "Tin Mồi":**
   - 100% hình ảnh căn hộ tải lên hệ thống được tự động đóng dấu Watermark số chìm: **`[VinStay AI Verified - Căn S1.08.1205 - Timestamp DD/MM/YYYY]`**.
   - **Bảo vệ Chủ nhà:** Triệt tiêu hoàn toàn tình trạng môi giới tự do ăn cắp ảnh căn hộ đăng lên mạng xã hội dìm giá thị trường hoặc đăng tin mồi câu khách.
3. **Mã hóa địa chỉ & Bảo mật thông tin Chủ nhà:**
   - Trên giao diện tìm kiếm công khai, hệ thống chỉ hiển thị: *Phân khu [Sapphire 1] - Loại căn [1PN+1] - Tầng [Khoảng tầng Trung]*; tuyệt đối không hiển thị số phòng chính xác và số điện thoại chủ nhà để tránh bị làm phiền.

---

## ĐIỀU 5. XỬ LÝ VI PHẠM KÝ GỬI ĐỘC QUYỀN & TRANH CHẤP TRẠNG THÁI
1. **Hành vi vi phạm ký gửi độc quyền:**
   - Trong thời gian hợp đồng ủy quyền độc quyền còn hiệu lực (và chưa hết thời hạn 15 ngày đếm ngược), nếu Chủ nhà tự ý cho khách ngoài thuê hoặc giao dịch ngầm qua môi giới khác:
     * Chủ nhà phải bồi thường cho nền tảng khoản chi phí điều phối tương đương **01 tháng tiền thuê căn hộ** theo đúng thỏa thuận tại Hợp đồng Ký gửi Độc quyền.
2. **Khóa tranh chấp (Dispute Lock):**
   - Trường hợp phát sinh khiếu nại giữa Khách cọc giữ chỗ và Chủ nhà muốn rút căn đột xuất, Admin Portal có quyền kích hoạt trạng thái **`Dispute_Locked`** để đóng băng căn hộ trong tối đa **72 giờ** nhằm đối soát dữ liệu và phân xử theo đúng quy định pháp luật.

---

## ĐIỀU 6. HIỆU LỰC THI HÀNH
1. Quy chế này có hiệu lực bắt buộc đối với toàn bộ căn hộ trong giỏ hàng ủy quyền của VinStay AI tại Vinhomes Ocean Park kể từ ngày công bố.
2. Mọi thao tác can thiệp thủ công vào trạng thái căn hộ trên Admin Portal (bỏ qua máy trạng thái tự động) bắt buộc phải do Super Admin phê duyệt và lưu vết kiểm toán đầy đủ.

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
