# QUY CHẾ QUẢN TRỊ HỆ THỐNG, GIÁM SÁT PHỄU CHUYỂN ĐỔI BI & BẢN ĐỒ NHIỆT LẤP ĐẦY
### (SYSTEM ADMINISTRATION, BI CONVERSION FUNNEL & OCCUPANCY HEATMAP PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-ADM-01*  
*Căn cứ áp dụng: Luật Công nghệ Thông tin 2006, Luật An ninh Mạng 2018, Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân, Quy chế Quản trị Nền tảng VinStay AI và Chiến lược Tối ưu Hóa Vận hành tại Vinhomes Ocean Park.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ ĐIỀU HÀNH DỮ LIỆU (DATA-DRIVEN GOVERNANCE)
Văn bản này quy định phân quyền tài khoản quản trị, quy chế vận hành trung tâm điều hành dữ liệu thông minh (Business Intelligence - BI), phễu chuyển đổi thời gian thực và công cụ giám sát Bản Đồ Nhiệt Tỷ Lệ Lấp Đầy (Occupancy Heatmap) thuộc **Trang Quản Trị Hệ Thống (Admin Portal)** của nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Tôn chỉ điều hành dữ liệu:
1. **Minh bạch hóa & Phân quyền chặt chẽ (RBAC):** Tuân thủ nguyên tắc đặc quyền tối thiểu (Principle of Least Privilege); cô lập dữ liệu theo vai trò và phân khu địa bàn.
2. **Triệt tiêu thời gian trống phòng kép (Pre-Leasing Vacancy):** Dùng dữ liệu thời gian thực để nhận diện sớm căn hộ sắp hết hạn thuê trước 30–45 ngày; tự động kích hoạt thuật toán **Căn hời phân khu (Dynamic Deal)** để rút ngắn chu kỳ tìm khách từ 30 ngày xuống dưới 7 ngày.
3. **Giám sát sức khỏe vận hành bằng chỉ số thực tế:** Kiểm soát chặt chẽ tỷ lệ khách bỏ bom (No-Show $\le 5\%$), tỷ lệ tiếp nhận ticket của Field Host trong 3 phút và bảo đảm 0% thất thoát dòng tiền ký quỹ.

---

## ĐIỀU 1. CƠ CẤU PHÂN QUYỀN TRUY CẬP QUẢN TRỊ VIÊN (ADMIN RBAC FRAMEWORK)
Nhằm bảo vệ an toàn thông tin theo Nghị định 13/2023/NĐ-CP, hệ thống phân chia 4 cấp độ quản trị viên với thẩm quyền riêng biệt:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   HỆ THỐNG PHÂN QUYỀN QUẢN TRỊ VIÊN 4 CẤP ĐỘ (RBAC)                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [CẤP 1: SUPER ADMIN] ──► Hội Đồng Sáng Lập / Giám Đốc Công Nghệ (CTO)                         │
│   • Toàn quyền quản trị cơ sở dữ liệu, phân quyền tài khoản, quản lý khóa bảo mật API.          │
│   • Nắm giữ Công tắc Khẩn cấp (Kill Switch) và phê duyệt thay đổi công thức tài chính lõi.      │
│                                                                                                  │
│   [CẤP 2: AREA OPERATIONS LEAD] ──► Giám Đốc Vận Hành Phân Khu (Sapphire / Ruby / Ocean Park 2)│
│   • Giám sát bản đồ điều phối Host, giải quyết sự cố tiếp nhận ticket quá 3 phút (Escalation).  │
│   • Quản lý Kho chìa khóa cơ 2 lớp két tại Văn phòng Phân khu; kiểm tra chất lượng bàn giao.     │
│                                                                                                  │
│   [CẤP 3: FINANCE & ESCROW AUDITOR] ──► Kế Toán Trưởng & Chuyên Viên Đối Soát Ký Quỹ            │
│   • Giám sát tài khoản định danh VietQR; đối soát gạch nợ tiền cọc giữ chỗ 2.000.000 VNĐ.       │
│   • Đối soát chỉ số điện nước EVN, phê duyệt giải tỏa cọc bảo đảm (Security Deposit) Check-out. │
│   • Điều chỉnh bảng tham số thù lao (`fee_configs`) theo phê duyệt của Ban Điều Hành.           │
│                                                                                                  │
│   [CẤP 4: CUSTOMER SUPPORT & DISPATCH AGENT] ──► Chuyên Viên CSKH & Điều Phối Tuyến 1            │
│   • Hỗ trợ khách thuê qua Zalo OA; tiếp nhận báo cáo sự cố hư hỏng để đẩy danh bạ thợ ngoài.    │
│   • BỊ GIỚI HẠN: Không xem được số điện thoại gốc chưa mã hóa, không sửa đổi dữ liệu tài chính.  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Xác thực đa yếu tố bắt buộc (2FA):** 100% tài khoản quản trị bắt buộc phải kích hoạt bảo mật 2 lớp qua Google Authenticator hoặc FIDO2 Hardware Key; tự động đăng xuất sau 15 phút không hoạt động.
2. **Nhật ký truy vết bất biến (Audit Logging):** Mọi thao tác truy cập, xuất file báo cáo, sửa đổi tham số hoa hồng hoặc kích hoạt giải tỏa tiền cọc đều được ghi nhận vào bảng `admin_audit_logs` với IP, Timestamp và mã băm SHA-256 không thể chỉnh sửa hay xóa bỏ.

---

## ĐIỀU 2. GIÁM SÁT PHỄU CHUYỂN ĐỔI BI 6 GIAI ĐOẠN THỜI GIAN THỰC
Module BI Funnel trên Admin Portal theo dõi hành trình chuyển đổi của khách thuê qua 6 giai đoạn đo lường:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   PHỄU CHUYỂN ĐỔI 6 GIAI ĐOẠN TRÊN ADMIN PORTAL (BI FUNNEL)                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [GIAI ĐOẠN 1] LƯỢT TRUY CẬP & TÌM KIẾM (Search & Impressions)                                  │
│                 Theo dõi lưu lượng khách truy cập web và bộ lọc tìm kiếm căn hộ.                 │
│         │                                                                                        │
│         ▼ (Tỷ lệ chuyển đổi mục tiêu: >= 35%)                                                    │
│   [GIAI ĐOẠN 2] LỌC NHU CẦU QUA AI MATCHMAKER (All-in Cost Matched)                              │
│                 Khách sử dụng bộ lọc trần All-in Cost; AI trả về 3 căn tối ưu trong 30 giây.     │
│         │                                                                                        │
│         ▼ (Tỷ lệ chuyển đổi mục tiêu: >= 40%)                                                    │
│   [GIAI ĐOẠN 3] XÁC THỰC OTP ZALO & ĐẶT LỊCH XEM PHÒNG (OTP Verified Booking)                    │
│                 Khách nhập mã OTP Zalo/SMS để xác thực SĐT thật; tạo ticket điều phối cho Host.  │
│         │                                                                                        │
│         ▼ (Tỷ lệ chuyển đổi mục tiêu: >= 90% - Tỷ lệ No-Show <= 5%)                              │
│   [GIAI ĐOẠN 4] CHECK-IN SẢNH QUA ZALO OA & XEM PHÒNG THỰC TẾ (Lobby Handshake & Viewing)        │
│                 Khách bấm nút Zalo xác nhận tại sảnh; Field Host quẹt thẻ thang máy dẫn lên xem. │
│         │                                                                                        │
│         ▼ (Tỷ lệ chuyển đổi mục tiêu: >= 25%)                                                    │
│   [GIAI ĐOẠN 5] KHÓA CĂN GIỮ CHỖ 24H QUA VIETQR ĐỘNG (2.000.000 VNĐ Holding Escrow)              │
│                 Quét VietQR gạch nợ tức thì; căn hộ chuyển trạng thái 'holding' khóa toàn sàn.   │
│         │                                                                                        │
│         ▼ (Tỷ lệ chuyển đổi mục tiêu: >= 95%)                                                    │
│   [GIAI ĐOẠN 6] KÝ HỢP ĐỒNG THUÊ CHÍNH THỨC & LẬP HỘ CHIẾU BÀN GIAO SỐ (Lease & Handover)        │
│                 AI OCR CCCD, ký số OTP AES-256; chuyển 2M thành Security Deposit bảo vệ tài sản. │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Cơ chế Cứu Lead Tự Động (Automated Drop-off Rescue):**
  * Nếu khách dừng lại ở Giai đoạn 2 (đã lọc căn nhưng chưa đặt lịch sau 2 giờ) $\rightarrow$ Hệ thống tự động đẩy tin nhắn Zalo ZNS gợi ý: *"Căn hộ bạn vừa xem đang có 02 khách khác quan tâm, bạn có muốn Host hỗ trợ giữ lịch xem chiều nay không?"*.
  * Nếu khách đã xem phòng ở Giai đoạn 4 nhưng chưa cọc sau 24 giờ $\rightarrow$ Tự động kích hoạt cơ chế gửi **Hồ sơ Căn hộ Số** và gợi ý căn tương tự cùng phân khu.

---

## ĐIỀU 3. BẢN ĐỒ NHIỆT TỶ LỆ LẤP ĐẦY (OCCUPANCY HEATMAP) & THUẬT TOÁN DYNAMIC DEAL
Module Occupancy Heatmap trực quan hóa tỷ lệ lấp đầy của toàn bộ các tòa nhà thuộc Vinhomes Ocean Park trên bản đồ số:

1. **Phân vùng màu cảnh báo theo Tỷ lệ lấp đầy (Occupancy Thresholds):**
   * 🟢 **Vùng Xanh (Tỷ lệ lấp đầy $\ge 90\%$):** Phân khu hoạt động tối ưu (ví dụ: Tòa S1.01 đạt $94\%$). Tiếp tục duy trì giá niêm yết chuẩn.
   * 🟡 **Vùng Vàng (Tỷ lệ lấp đầy từ $80\% - 89\%$):** Cần theo dõi lượng căn sắp hết hạn.
   * 🔴 **Vùng Đỏ / Cảnh báo trống cao (Tỷ lệ lấp đầy $< 80\%$):** Cần kích cầu khẩn cấp (ví dụ: Tòa S2.05 đạt $72\%$).
2. **Tự động kích hoạt Huy hiệu "Căn Hời Phân Khu" (Dynamic Deal Badge):**
   * Đối với các căn hộ thuộc Vùng Đỏ hoặc căn hộ có giá thuê trọn gói tiết kiệm $\ge 10\%$ so với mức giá trung bình của cùng layout trong phân khu:
     * Hệ thống tự động gắn nhãn nổi bật: **`[🔥 Căn Hời Phân Khu - Tiết kiệm 12%]`**.
     * Ưu tiên hiển thị Top đầu trong kết quả tìm kiếm của AI Matchmaker.
     * Tự động tăng độ ưu tiên phân bổ cho các Field Host xuất sắc để kích cầu chốt sớm.
   * **Bảo vệ quyền lợi Chủ nhà:** Thuật toán không bao giờ tự ý giảm giá của chủ nhà, mà chỉ nhận diện các căn chủ nhà đã đồng ý mức giá hợp lý ngay từ đầu để đẩy mạnh lượt tiếp cận (tăng gấp 3 lần lượt xem).

---

## ĐIỀU 4. QUẢN LÝ CHU KỲ TRỐNG PHÒNG TRƯỚC (PRE-LEASING VACANCY DASHBOARD)
Nhằm giải quyết dứt điểm Nỗi đau số 1 của Chủ nhà (Trống phòng kéo dài mất trắng 6–12 triệu/tháng):

1. **Cảnh báo sớm T-45 ngày & T-30 ngày:**
   * Hệ thống tự động quét ngày hết hạn hợp đồng thuê của toàn bộ giỏ hàng:
     * **Mốc T-45 ngày:** Gửi thông báo Zalo tự động hỏi nhu cầu gia hạn của Khách thuê hiện tại.
     * **Mốc T-30 ngày:** Nếu khách không gia hạn, căn hộ tự động chuyển sang trạng thái **`Pre-Leasing Available`** (Sẵn sàng nhận khách mới từ ngày $[DD/MM]$).
2. **Khớp khách nối tiếp (Back-to-Back Leasing):**
   * AI Matchmaker bắt đầu chào khách mới cho ngày chuyển vào trùng khớp với ngày khách cũ trả phòng.
   * Giảm thời gian trống phòng giữa 2 chu kỳ thuê từ 30–45 ngày thực tế xuống mức **dưới 03 ngày**.

---

## ĐIỀU 5. BẢNG CHỈ SỐ SỨC KHỎE VẬN HÀNH TOÀN DIỆN (OPERATION HEALTH KPIS)
Admin Portal thiết lập bộ chỉ số KPI chuẩn mực để Ban Giám Đốc giám sát chất lượng hệ thống theo thời gian thực:

| Nhóm Chỉ Số | Tên Chỉ Số KPI | Công Thức / Mục Tiêu Đạt Chuẩn | Trạng Thái Bình Thường | Cảnh Báo Nguy Hiểm |
| :--- | :--- | :--- | :---: | :---: |
| **Hiệu Quả Khách Thuê** | **Tỷ lệ Khách Bỏ Bom (No-Show Rate)** | $\frac{\text{Số ca No-Show}}{\text{Tổng ca đặt lịch}} \times 100\%$ | $\le 5.0\%$ | $> 8.0\%$ |
| **Tốc Độ Vận Hành** | **Thời gian Trống phòng (Time-to-Lease)** | Số ngày tìm được khách mới từ khi nhà trống | $\le 7 \text{ ngày}$ | $> 15 \text{ ngày}$ |
| **Chất Lượng Host** | **Thời gian Nhận Ticket Điều phối (SLA)** | Thời gian Host bấm nhận từ khi phát ticket | $\le 180 \text{ giây}$ (3 phút) | $> 300 \text{ giây}$ (5 phút) |
| **Độ Hài Lòng Dịch Vụ** | **Điểm Đánh Giá Host (Customer Rating)** | Điểm trung bình sao khách chấm trên Zalo | $\ge 4.8 / 5.0★$ | $< 4.5★$ |
| **Ký Quỹ & Tài Chính** | **Thời gian Giải tỏa Cọc (Fast Escrow SLA)** | Thời gian hoàn tiền sau khi ký đối soát EVN | $\le 60 \text{ giây}$ | $> 15 \text{ phút}$ |

---

## ĐIỀU 6. QUY TRÌNH KÍCH HOẠT CÔNG TẮC KHẨN CẤP (SYSTEM KILL SWITCH)
1. Trong trường hợp phát hiện sự cố an ninh mạng nghiêm trọng (tấn công DDoS, lỗi rò rỉ cơ sở dữ liệu hoặc nghi vấn gian lận tài chính trên diện rộng), **Super Admin (CTO)** có quyền kích hoạt **System Kill Switch**:
   * Tạm dừng toàn bộ các giao dịch sinh mã VietQR và giải tỏa tiền cọc.
   * Khóa tính năng cấp mã mở cửa tức thời JIT trên Host App; chuyển toàn bộ việc mở cửa sang chế độ chìa khóa cơ dự phòng tại Văn phòng Phân khu.
   * Gửi thông báo khẩn cấp đồng loạt tới toàn bộ Field Host và Chủ nhà qua tin nhắn Zalo Brandname.
2. Việc phục hồi hệ thống sau sự cố bắt buộc phải có biên bản nghiệm thu an toàn thông tin có chữ ký số của Super Admin và Area Operations Lead.

---

## ĐIỀU 7. HIỆU LỰC ÁP DỤNG
1. Quy chế này có hiệu lực kể từ ngày ban hành và áp dụng cho toàn bộ nhân sự quản trị, đội ngũ vận hành và bộ phận công nghệ của VinStay AI.
2. Mọi sửa đổi, bổ sung đối với phân quyền hoặc công thức đo lường KPI trên Admin Portal phải được Hội đồng Quản trị phê chuẩn và ghi nhận đầy đủ vào nhật ký kiểm toán hệ thống.

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
