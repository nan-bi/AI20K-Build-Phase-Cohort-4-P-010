# QUY TRÌNH NHẮC HẸN KÉP T-10M, XỬ LÝ TRỄ GIỜ LINH HOẠT & BÙ THÙ LAO KHÁCH VẮNG MẶT (NO-SHOW)
### (DOUBLE REMINDER, FLEXIBLE BUFFER & AUTOMATED NO-SHOW COMPENSATION PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-FH-04*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015 (Điều 513-521 - Hợp đồng dịch vụ), Hợp đồng Đối tác Tiếp đón Thực địa (Field Host Agreement) và Quy chế Vận hành Hệ thống VinStay AI tại Vinhomes Ocean Park.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ VẬN HÀNH TINH GỌN
Văn bản này quy định quy trình tự động hóa thông báo nhắc hẹn xem phòng, cơ chế xử lý trễ giờ do giao thông và chính sách bảo vệ thu nhập cho **Đối tác Tiếp đón Thực địa (Field Host)** khi phát sinh tình huống khách thuê không đến hẹn (No-Show) tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Nền tảng kiên quyết bảo vệ thời gian và công sức của Field Host:
1. **Triệt tiêu khách ảo và nạn bỏ bom:** 100% khách đặt lịch phải được xác thực số điện thoại và kết nối qua **Zalo OA tích vàng "VinStay AI"**.
2. **Xử lý trễ giờ văn minh, không áp lực đồng hồ cát:** Cho phép khách dời giờ kẹt xe 15–30 phút và hỗ trợ Host chuyển giao ticket cho đồng đội 1-chạm nếu bận lịch tiếp theo.
3. **Bù thù lao tự động — Không đòi hỏi giải trình:** Tự động đối soát qua nhật ký cuộc gọi và kích hoạt thanh toán **50% Thù lao Lượt Dẫn (Wait-time Allowance)** vào ví Host ngay lập tức khi khách vắng mặt, tuyệt đối không bắt Host phải chụp ảnh sảnh làm bằng chứng.

---

## ĐIỀU 1. QUY TRÌNH NHẮC HẸN KÉP T-10M QUA ZALO ZNS TÍCH VÀNG
Mọi lịch hẹn xem phòng đều được hệ thống kích hoạt chuỗi thông báo tự động 2 chiều qua **Zalo Notification Service (ZNS)** chính thức của VinStay AI:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                 LUỒNG NHẮC HẸN TỰ ĐỘNG 2 CHIỀU QUA ZALO OA TÍCH VÀNG                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [T-2H: NHẮC HẸN CHUẨN BỊ]                                                                     │
│   • Khách nhận tin Zalo: Thông tin căn hộ, link ghim Google Maps vị trí sảnh & ảnh mặt tiền.     │
│   • Field Host nhận lịch trên Host App để chủ động lộ trình di chuyển nội khu.                   │
│                                                                                                  │
│   [T-10M: KÍCH HOẠT NHẮC HẸN KÉP TỨC THÌ]                                                        │
│   ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────┐ │
│   │               BÊN PHÍA KHÁCH THUÊ            │  │            BÊN PHÍA FIELD HOST           │ │
│   │ Tin Zalo ZNS hiện 3 nút bấm 1-chạm:          │  │ Host App rung chuông thông báo:          │ │
│   │ [1] "Tôi đã có mặt tại sảnh tòa..."          │  │ "Lịch hẹn lúc [HH:mm] tại sảnh tòa [S... │ │
│   │ [2] "Tôi bị trễ 15–30 phút (Kẹt xe/VinBus)"  │  │  Host vui lòng di chuyển xuống sảnh".    │ │
│   │ [3] "Hủy lịch hẹn xem phòng"                 │  │                                          │ │
│   └──────────────────────────────────────────────┘  └──────────────────────────────────────────┘ │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Thông báo chuẩn bị T-2h:**
   - Hệ thống tự động gửi tin nhắn Zalo kèm: Mã căn hộ, Tên tòa nhà, Link Google Maps chỉ đường chính xác tới sảnh đón và 01 bức ảnh chụp thực tế lối vào sảnh tầng 1 để khách không bị nhầm lẫn giữa các tòa trong đại đô thị.
2. **Thông báo kích hoạt T-10m:**
   - Khách nhận thông báo nhắc hẹn kèm 3 nút bấm tương tác nhanh, không cần gõ chữ.
   - Field Host nhận tín hiệu để di chuyển xuống khu vực ghế chờ sảnh tầng 1 sẵn sàng đón tiếp.

---

## ĐIỀU 2. CƠ CHẾ XỬ LÝ TRỄ GIỜ LINH HOẠT (FLEXIBLE TRAFFIC BUFFER)
Thấu hiểu thực tế khách di chuyển từ các quận nội thành Hà Nội sang Ocean Park thường gặp ùn tắc tại cầu Vĩnh Tuy, cầu Chương Dương, cầu Thanh Trì hoặc nút giao Cổ Linh:

1. **Kích hoạt khoảng đệm trễ giờ (Grace Period 30 phút):**
   - Khi khách bấm nút **`[Tôi bị trễ 15–30 phút]`** trên Zalo $\rightarrow$ Trạng thái ticket trên Host App chuyển sang màu vàng: *"Khách trễ do giao thông (Dự kiến đến: +20 phút)"*.
   - Hệ thống tự động gia hạn thời gian chờ mà **hoàn toàn không tính lỗi trễ hẹn cho Host hay Khách**.
2. **Cơ chế Chuyển giao Đồng đội 1-chạm (Handover to Peer):**
   - Trường hợp Field Host đã có lịch dẫn khách ca tiếp theo và không thể tiếp tục chờ đợi:
     * Host chỉ cần bấm nút: **`[Nhờ Đồng Đội Đón Hộ]`** trên Host App.
     * Hệ thống lập tức bắn ticket tới các Host khác đang rảnh trong cùng phân khu (Sapphire 1).
     * Host tiếp nhận mới sẽ nhận đầy đủ thông tin để đón khách; Host cũ được giải phóng lịch trình để đi dẫn ca tiếp theo mà **không bị trừ điểm uy tín (SPS) hay bị phạt thù lao**.

---

## ĐIỀU 3. QUY TRÌNH XÁC NHẬN KHÁCH VẮNG MẶT (NO-SHOW) TỰ ĐỘNG
Để chấm dứt cảnh Field Host phải đứng chờ vạ vật vô định tại sảnh:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   QUY TRÌNH 3 BƯỚC XÁC NHẬN NO-SHOW TỰ ĐỘNG 1-CHẠM                               │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [BƯỚC 1: QUÁ GIỜ HẸN 20 PHÚT]                                                                  │
│  Đã quá 20 phút so với giờ hẹn (hoặc giờ gia hạn) mà khách KHÔNG bấm nút Zalo xác nhận sảnh.     │
│                                                                                                  │
│  [BƯỚC 2: HOST GỌI THOẠI QUA ZALO OA / ZCC]                                                      │
│  Host bấm nút [Gọi Zalo OA] trên Host App gọi cho khách 02 cuộc (cách nhau 5 phút).              │
│  Hệ thống ZCC tự động ghi nhận nhật ký: "Cuộc gọi không có tín hiệu phản hồi / Khách dập máy".   │
│                                                                                                  │
│  [BƯỚC 3: BẤM BÁO VẮNG MẶT 1-CHẠM (KHÔNG CẦN CHỤP ẢNH)]                                         │
│  Host bấm nút: [Báo Khách Vắng Mặt] trên màn hình.                                               │
│  • Hệ thống AI tự động đối soát: (Thời gian chờ > 20p) + (Call Log ZCC = Không nghe máy).        │
│  • Ticket TỰ ĐỘNG ĐÓNG NGAY LẬP TỨC.                                                             │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Xóa bỏ yêu cầu chụp ảnh làm bằng chứng:** Nền tảng tuyệt đối không bắt Host phải chụp ảnh đứng ở sảnh hay chụp màn hình tin nhắn để chứng minh. Nhật ký số (Call Log ZCC & Zalo ZNS status) trên máy chủ là bằng chứng pháp lý đầy đủ và chuẩn xác nhất.

---

## ĐIỀU 4. CHÍNH SÁCH BÙ THÙ LAO CHỜ ĐỢI (WAIT-TIME ALLOWANCE)
Quyền lợi thu nhập của Field Host được nền tảng bảo vệ tuyệt đối khi lỗi xuất phát từ phía khách thuê:

1. **Mức bù thù lao tự động:**
   - Ngay khi ticket được đóng với lý do Khách Vắng Mặt (No-Show) hợp lệ, hệ thống **tự động cộng 50% Thù lao Lượt Dẫn tiêu chuẩn** (`base_viewing_fee * 50%`) vào Ví Thu Nhập của Host.
   - *Ví dụ:* Thù lao lượt dẫn tiêu chuẩn là **50.000 VNĐ** $\rightarrow$ Host được nhận ngay **25.000 VNĐ** hỗ trợ chi phí xăng xe và công sức di chuyển.
2. **Trường hợp Khách bấm Hủy hẹn sát giờ:**
   - Nếu khách bấm hủy hẹn khi thời gian tới giờ hẹn còn **dưới 30 phút** (thời điểm Host đã bắt đầu di chuyển tới sảnh tòa nhà) $\rightarrow$ Hệ thống vẫn tự động duyệt chi **50% Thù lao Lượt Dẫn** cho Host.
3. **Tự động thanh toán — 0 giây phê duyệt thủ công:**
   - Khoản tiền bù được chuyển trực tiếp vào số dư ví của Host trên Host App trong vòng **60 giây** kể từ khi bấm báo vắng, không cần thông qua kế toán duyệt tay.

---

## ĐIỀU 5. QUẢN LÝ ĐỘ TIN CẬY KHÁCH HÀNG & CHẾ TÀI NO-SHOW
Nhằm ngăn chặn tình trạng khách đặt lịch ảo hoặc môi giới ngoài giả mạo khách thuê để thăm dò căn hộ:

| Mức Độ Vi Phạm Của Khách | Biện Pháp Hệ Thống Tự Động Áp Dụng |
| :--- | :--- |
| **Vi Phạm Lần 1 (No-Show 01 lần)** | • Gửi tin nhắn cảnh báo văn minh qua Zalo OA về việc lãng phí thời gian của người khác.<br/>• Ghi nhận 01 điểm phạt tín nhiệm (`no_show_strike = 1`) vào hồ sơ số điện thoại/Zalo UID. |
| **Vi Phạm Lần 2 (No-Show 02 lần liên tiếp)** | • Tạm khóa quyền tự do đặt lịch xem phòng trực tuyến trong **14 ngày**.<br/>• Nếu muốn đặt lịch, bắt buộc phải liên hệ trực tiếp Tổng đài Admin để xác minh nhu cầu thực tế. |
| **Khách Hàng Tái Phạm Nghiêm Trọng ($\ge 3$ lần)** | • Đưa số điện thoại/Zalo UID vào **Danh Sách Hạn Chế (Blacklist)** trên toàn hệ thống VinStay AI.<br/>• Bắt buộc thanh toán khoản Phí Cam Kết Hẹn Gặp (**50.000 VNĐ** qua VietQR, sẽ hoàn trả 100% khi tới sảnh) nếu muốn tiếp tục sử dụng dịch vụ. |

---

## ĐIỀU 6. TRÁCH NHIỆM TRUNG THỰC & CHẾ TÀI GIAN LẬN
1. Field Host có nghĩa vụ thực hiện đúng 02 cuộc gọi thoại qua Zalo OA trước khi bấm báo khách vắng mặt.
2. Mọi hành vi thông đồng với khách để tạo lịch hẹn ảo rồi bấm báo vắng nhằm chiếm đoạt 50% thù lao chờ sẽ bị hệ thống phát hiện qua thuật toán đối soát tần suất (Fraud Detection Engine).
3. **Chế tài gian lận:** Khóa vĩnh viễn tài khoản Field Host, truy thu toàn bộ thù lao đã chi trả trong kỳ và chuyển thông tin cho cơ quan chức năng nếu có dấu hiệu lừa đảo có tổ chức.

---

## ĐIỀU 7. HIỆU LỰC THI HÀNH
1. Quy chế này có hiệu lực áp dụng tức thì đối với toàn bộ các ca điều phối dẫn khách của VinStay AI tại khu đô thị Vinhomes Ocean Park.
2. Các thông số cấu hình về tỷ lệ bù thù lao (`base_viewing_fee`, tỷ lệ bù 50%) và thời gian chờ tối đa (20 phút) có thể được Quản trị viên điều chỉnh linh hoạt trên Admin Portal theo từng giai đoạn thị trường.

---
*Văn bản thuộc Hệ thống Pháp lý & Vận hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
