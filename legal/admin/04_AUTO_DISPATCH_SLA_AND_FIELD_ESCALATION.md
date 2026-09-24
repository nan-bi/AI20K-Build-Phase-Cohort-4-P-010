# QUY CHUẨN GIÁM SÁT ĐIỀU PHỐI SLA FIELD HOST & XỬ LÝ KHỦNG HOẢNG VẬN HÀNH THỰC ĐỊA
### (AUTO-DISPATCH SLA GOVERNANCE, REAL-TIME FLEET TELEMETRY & FIELD INCIDENT ESCALATION PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-ADM-04*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015, Luật Viễn thông 2009, Hợp đồng Đối tác Tiếp đón Thực địa, Quy chế Cam kết Chất lượng Dịch vụ (SLA) và Tiêu chuẩn Vận hành Nền tảng VinStay AI tại Vinhomes Ocean Park.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ VẬN HÀNH THẦN TỐC
Văn bản này quy định quy chế vận hành thuật toán tự động điều phối ticket 3 tầng, hệ thống bản đồ giám sát đội ngũ thực địa thời gian thực (Fleet Telemetry) và quy trình xử lý khủng hoảng tiếp đón tại sảnh trên **Trang Quản Trị Hệ Thống (Admin Portal)** của nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Tôn chỉ điều phối thực địa:
1. **Tuyệt đối không để khách chờ tại sảnh (Zero Lobby Waiting):** Đảm bảo 100% yêu cầu xem phòng được Field Host tiếp nhận trong vòng **3 phút** và quẹt thẻ thang máy dẫn lên phòng trong vòng **60 giây** kể từ khi khách có mặt tại sảnh.
2. **Công bằng bằng thuật toán (Algorithmic Fairness):** Loại bỏ hoàn toàn sự can thiệp phân bổ thủ công; triệt tiêu tình trạng tranh giành khách (Lead Cannibalization), ưu ái cá nhân hay xung đột nội bộ giữa các đối tác tiếp đón.
3. **Phản ứng khẩn cấp đa tầng (Fail-safe Escalation):** Khi có dấu hiệu trễ SLA, hệ thống tự động kích hoạt cơ chế mở rộng bán kính và đẩy báo động đỏ cho Trưởng phân khu (Area Operations Lead) can thiệp ngay lập tức.

---

## ĐIỀU 1. THUẬT TOÁN ĐIỀU PHỐI TỰ ĐỘNG 3 TẦNG CÓ RÀNG BUỘC SLA (3-TIER AUTO-DISPATCH)
Toàn bộ yêu cầu xem phòng sau khi khách xác thực OTP trên Web/Zalo được bộ não AI Dispatcher xử lý tự động theo quy trình 3 tầng nghiêm ngặt:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   THUẬT TOÁN ĐIỀU PHỐI FIELD HOST TỰ ĐỘNG 3 TẦNG (AUTO-DISPATCH)                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [KHÁCH ĐẶT LỊCH THÀNH CÔNG] ──► Hệ thống bóc tách Tòa nhà & Phân khu (ví dụ: S1.08, Sapphire 1)│
│                                                                                                  │
│   [TẦNG 1: CHỈ ĐỊNH ĐỘC QUYỀN - 0 ĐẾN 180 GIÂY (3 PHÚT)]                                         │
│   Hệ thống chọn lọc 01 Field Host tối ưu nhất thỏa mãn 3 điều kiện:                              │
│   1. Có thẻ cư dân phân khu Sapphire 1 (`rfid_clusters = ["Sapphire 1"]`).                       │
│   2. Đang Online và không bị trùng ca dẫn trong khung giờ hẹn.                                   │
│   3. Có khoảng cách GPS gần tòa S1.08 nhất & Điểm hiệu lực SPS cao nhất.                         │
│   • Phát ticket độc quyền tới Host tối ưu. Màn hình đếm ngược 180s.                              │
│   • Nếu Host bấm [TIẾP NHẬN] ──► KHÓA CA DẪN (Session Binding), hoàn tất điều phối.              │
│                                                                                                  │
│   [TẦNG 2: PHÁT THANH NỘI KHU - PHÚT THỨ 3 ĐẾN PHÚT THỨ 5 (OPEN POOL 500M)]                      │
│   Nếu sau 180s Host Tầng 1 không nhận hoặc bấm từ chối:                                          │
│   • Thu hồi ticket; tự động hạ 02 điểm độ tin cậy của Host Tầng 1.                               │
│   • Bắn thông báo đồng loạt (Broadcast) tới toàn bộ các Host đang Online trong bán kính 500m.     │
│   • Cơ chế "Ai nhanh hơn được quyền phục vụ" (First-come, First-served).                         │
│                                                                                                  │
│   [TẦNG 3: BÁO ĐỘNG ĐỎ TRƯỞNG PHÂN KHU - SAU 5 PHÚT (RED ALERT ESCALATION)]                      │
│   Nếu sau 5 phút vẫn chưa có Host nào nhận ticket:                                               │
│   • Hệ thống kích hoạt Còi Báo Động Đỏ trên Admin Portal của Trưởng Phân Khu (Area Lead).        │
│   • Area Lead có nghĩa vụ: Trực tiếp chỉ định cưỡng chế Host tại chỗ hoặc đích thân xuống sảnh   │
│     đón khách; bảo đảm khách không bao giờ bị bỏ quên tại sảnh.                                  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 2. BẢN ĐỒ GIÁM SÁT ĐỘI NGŨ THỰC ĐỊA THỜI GIAN THỰC (FLEET TELEMETRY)
Module Telemetry trên Admin Portal hiển thị bản đồ số GIS trực quan của toàn bộ khu đô thị Vinhomes Ocean Park:

1. **Hệ thống ký hiệu trạng thái trực quan:**
   * 🟢 **Đốm Xanh (Idle / Ready):** Field Host đang Online, sẵn sàng nhận ticket ngay lập tức.
   * 🟣 **Đốm Tím (Busy / Viewing):** Host đang trong phiên dẫn khách xem căn hộ (thời gian mở cửa JIT đang đếm ngược).
   * 🟡 **Đốm Vàng (Pending Ticket):** Ticket mới phát đang trong giai đoạn đếm ngược 180 giây của Tầng 1.
   * 🔴 **Đốm Đỏ Nhấp Nháy (Critical Alert):** Ticket quá 3 phút chưa có người nhận hoặc phát sinh sự cố khẩn cấp tại sảnh.
2. **Giám sát tải trọng công việc (Workload Balancing):**
   * Thuật toán tự động hạn chế phân phối quá 02 ca dẫn liên tiếp trong vòng 60 phút cho cùng một Host để bảo đảm thể lực và chất lượng tư vấn chuyên sâu cho từng khách thuê.

---

## ĐIỀU 3. QUY TRÌNH XỬ LÝ KHỦNG HOẢNG THỰC ĐỊA TẠI SẢNH (EMERGENCY SOP)
Admin Portal thiết lập quy trình phản ứng nhanh trong các trường hợp phát sinh sự cố ngoài dự kiến:

| Tình Huống Khẩn Cấp | Cơ Chế Phản Ứng Tự Động Của Hệ Thống | Trách Nhiệm Của Nhân Sự Vận Hành |
| :--- | :--- | :--- |
| **Khách đến sớm $> 30$ phút** | Khách bấm nút Zalo tại sảnh $\rightarrow$ Hệ thống kiểm tra: Nếu Host được phân công chưa có mặt, tự động gợi ý Host gần sảnh nhất đón hộ. | Host gần nhất bấm nhận, quẹt thẻ đưa khách lên xem; thù lao lượt dẫn chuyển sang cho Host đón thực tế. |
| **Host bị sự cố đột xuất (hỏng xe, ốm)** | Host bấm nút `[Báo Sự Cố Khẩn Cấp]` trên app $\rightarrow$ Hệ thống tự động thu hồi ticket không tính phạt. | Ticket chuyển ngay sang Tầng 2 (Open Pool 500m) để Host khác tiếp quản trong 60 giây. |
| **Thẻ cư dân RFID bị lỗi / Mất thẻ** | Host bấm nút `[Yêu Cầu Hỗ Trợ Thẻ]` $\rightarrow$ Gửi thông báo tới Văn phòng Phân khu. | Area Lead tại quầy phân khu xuất Thẻ Master dự phòng bàn giao cho Host trong vòng **05 phút**. |
| **Khách không hài lòng về thái độ Host** | Khách chấm 1–2★ trên tin nhắn Zalo kèm phản hồi tiêu cực. | CSKH tuyến 1 tự động nhận ticket khiếu nại, gọi điện xin lỗi khách trong **15 phút** và cử Area Lead trực tiếp chăm sóc. |

---

## ĐIỀU 4. THUẬT TOÁN CHỐNG GIAN LẬN ĐỊNH VỊ (ANTI-SPOOFING & GEOFENCE INTEGRITY)
Nhằm ngăn chặn hành vi dùng phần mềm giả mạo tọa độ GPS (Fake GPS) để nhận ticket hoặc bấm nhận thù lao khống:

1. **Xác thực Geofence 3 lớp:**
   - Hệ thống đối soát đồng thời 3 thông số kỹ thuật khi Host bấm xác nhận:
     * Tọa độ GPS của thiết bị di động ($\le 50m$ so với tâm tòa nhà).
     * BSSID / Tên mạng Wifi hành lang hoặc trạm phát sóng di động (Cell Tower ID) của tòa nhà.
     * Tốc độ di chuyển giữa 2 điểm kiểm tra (phát hiện bất thường nếu di chuyển vượt tốc độ vật lý cho phép).
2. **Khóa tài khoản gian lận tức thì (Instant Fraud Suspension):**
   - Khi phát hiện dấu hiệu can thiệp GPS hoặc giả mạo thiết bị, hệ thống tự động:
     * Hủy bỏ ticket hiện tại và chuyển quyền cho Host khác.
     * Tạm khóa tài khoản của Host trong **72 giờ** để chuyển Bộ phận Thanh tra Vận hành xử lý theo quy định kỷ luật.

---

## ĐIỀU 5. CHẾ TÀI VI PHẠM SLA ĐIỀU PHỐI ĐỐI VỚI FIELD HOST
| Hành Vi Vi Phạm | Chế Tài Áp Dụng Lần 1 | Chế Tài Tái Phạm ($\ge 2$ lần/tuần) |
| :--- | :--- | :--- |
| **Để trôi ticket Tầng 1 quá 180s (không bấm nhận)** | Trừ 02 điểm độ tin cậy SPS | Giảm 20% độ ưu tiên phân bổ ticket trong 03 ngày |
| **Bấm nhận ticket rồi tự ý hủy ca sát giờ ($< 15$p)** | Phạt **50.000 VNĐ** khấu trừ ví | Khóa quyền nhận ticket trong 24 giờ |
| **Để khách chờ tại sảnh $> 15$ phút mà không báo** | Khấu trừ **100% thù lao lượt dẫn** | Giảm 50% độ ưu tiên phân bổ trong 07 ngày |
| **Dùng ứng dụng giả mạo tọa độ GPS** | **Tịch thu toàn bộ thù lao kỳ** | Khóa vĩnh viễn tài khoản đối tác trên toàn hệ thống |

---

## ĐIỀU 6. THẨM QUYỀN ĐIỀU CHỈNH THAM SỐ ĐIỀU PHỐI TRÊN ADMIN
1. Area Operations Lead có quyền tạm thời thay đổi thời gian đếm ngược Tầng 1 (từ 180s xuống 120s trong các khung giờ cao điểm có lượng khách đông) để tăng tốc độ phân bổ.
2. Mọi can thiệp điều phối thủ công (Manual Dispatch Override) bắt buộc phải nhập lý do cụ thể và được ghi nhận vào nhật ký kiểm toán hệ thống để phục vụ công tác thanh tra định kỳ.

---

## ĐIỀU 7. HIỆU LỰC THỰC THI
1. Quy chế này có hiệu lực bắt buộc kể từ ngày công bố và áp dụng cho toàn bộ hoạt động điều phối thực địa của VinStay AI tại khu đô thị Vinhomes Ocean Park.
2. Ban Điều Hành cam kết duy trì tính công bằng, tự động hóa 100% của thuật toán điều phối, bảo vệ môi trường cạnh tranh lành mạnh và quyền lợi thu nhập minh bạch của từng đối tác.

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
