# QUY CHUẨN TIẾP ĐÓN THỰC ĐỊA TẠI SẢNH, VẬN HÀNH THẺ CƯ DÂN RFID & KÊNH LIÊN LẠC BẢO MẬT QUA ZALO OA (ZCC)
### (LEAN LOBBY RECEPTION, RFID CARD PROTOCOL & ZALO OA / ZCC SECURE COMMUNICATION)
*Mã văn bản: VINSTAY-LEGAL-FH-03*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015 (Điều 513-521 - Hợp đồng dịch vụ), Luật Nhà ở 2023, Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân, Quy chế Quản lý & Sử dụng Cụm Nhà chung cư của Ban Quản lý (BQL) Vinhomes Ocean Park, Hợp đồng Ký gửi Quản lý Độc quyền (Exclusive Mandate) và Bộ Tiêu chuẩn Văn hóa Cư dân Vinhomes.*

---

## LỜI MỞ ĐẦU & NGUYÊN TẮC TINH GỌN (LEAN OPERATIONS)
Văn bản này quy định chuẩn mực tiếp đón khách thực tế tại sảnh, quy chế sử dụng thẻ cư dân thang máy RFID, cơ chế mở cửa tức thời và kênh truyền thông chính thống được chuẩn hóa qua **Zalo Official Account Doanh Nghiệp (kết hợp Zalo Cloud Connect - ZCC)** dành cho **Đối tác Tiếp đón Thực địa (Field Host)** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Nền tảng kiên định triết lý **Vận hành Tinh gọn (Lean Operations)**:
1. **Xóa bỏ thủ tục hành chính hình thức:** Không áp đặt cơ chế đếm ngược thời gian cứng nhắc, không bắt buộc chụp ảnh kiểm chứng tràn lan gây nghẽn tác nghiệp.
2. **Bảo mật dữ liệu cá nhân & Chống cắt cầu triệt để:** Chuẩn hóa toàn bộ việc đàm thoại và tương tác qua **Zalo OA tích vàng mang thương hiệu "VinStay AI"**, ẩn số điện thoại thật 2 chiều 100% bằng mã định danh Zalo UID.
3. **Đo lường bằng kết quả kinh doanh:** Quản trị hiệu quả Host dựa trên **Tỷ lệ Chốt Căn (Close Rate KPI)** và **Đánh giá Hài lòng 5 Sao của Khách hàng**, kết hợp **Lá chắn Hợp đồng Ký gửi Quản lý Độc quyền (Exclusive Mandate)** từ Chủ Nhà.

---

## ĐIỀU 1. CHUẨN HÓA KÊNH GIAO TIẾP QUA ZALO OA & ZALO CLOUD CONNECT (ZCC)
Nhằm bảo vệ uy tín thương hiệu, nâng cao tỷ lệ bắt máy của khách thuê và bảo mật tuyệt đối thông tin liên lạc cá nhân theo Nghị định 13/2023/NĐ-CP:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│              KIẾN TRÚC GIAO TIẾP BẢO MẬT QUA ZALO OA & ZALO CLOUD CONNECT (ZCC)                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [FIELD HOST NỘI KHU]             [HỆ THỐNG VINSTAY AI]                [KHÁCH THUÊ CĂN HỘ]      │
│   (Host Web App / PWA)              (ZCC SIP Engine / ZNS)               (Ứng Dụng Zalo)         │
│            │                                  │                                  │               │
│   Bấm: [Gọi Zalo OA]                          │                                  │               │
│   (Chỉ thấy Tên & Mã Căn)                     │                                  │               │
│            │                                  │                                  │               │
│            ├─── Gửi lệnh API (Zalo UID) ─────►│                                  │               │
│            │                                  ├── Kích hoạt gọi thoại ZCC ──────►│               │
│            │                                  │   (Chuông Zalo: "VinStay AI"     │               │
│            │                                  │    Tích vàng Doanh nghiệp)       │               │
│            │                                  │                                  │               │
│            │◄════════ Kết nối đàm thoại thoại 2 chiều qua Zalo HD Audio ════════►│               │
│            │    (Host & Khách nói chuyện trực tiếp - BẢO MẬT SĐT 100% CẢ 2 CHIỀU)                │
│            │                                  │                                  │               │
│            ├─── Bấm: [Gửi Định Vị Sảnh] ─────►├─── Đẩy Google Maps + Ảnh Sảnh ──►│               │
│            ├─── Bấm: [Gửi All-in Cost] ──────►├─── Đẩy Bảng Tính Trọn Gói ──────►│               │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Thương hiệu đại diện duy nhất — Tích vàng Xác thực:**
   - 100% cuộc gọi và tin nhắn gửi tới khách thuê đều hiển thị tên thương hiệu chính thức: **"VinStay AI"** (có dấu tích vàng xác thực của Zalo). Khách hoàn toàn tin tưởng, không e ngại số lạ hay cuộc gọi rác (Spam/Telesale), nâng tỷ lệ bắt máy lên trên **95%**.
2. **Gọi thoại ẩn danh 2 chiều qua Zalo Cloud Connect (ZCC):**
   - Field Host thực hiện cuộc gọi trực tiếp từ nút bấm `[Gọi Zalo OA]` trên Host App thông qua mã định danh **Zalo UID**.
   - **Bảo mật tuyệt đối 100%:** Field Host không nhìn thấy số điện thoại thật của khách và khách thuê cũng không nhìn thấy số cá nhân của Host. Mọi phát sinh trao đổi được ghi âm và lưu log kiểm toán trên hệ thống để bảo vệ an toàn cho cả hai bên.
3. **Năng lực gọi song song đa kênh (Multi-channel SIP Trunk Concurrency):**
   - Hạ tầng ZCC hỗ trợ hàng chục máy nhánh ảo (Virtual Extensions). Cùng một khung giờ cao điểm, các Host tại phân khu Sapphire 1, Sapphire 2, Pavilion, The Zenpark, Ocean Park 2 & 3 có thể gọi điện đồng thời cho các khách khác nhau mà không bao giờ bị nghẽn mạch hay báo bận.
4. **Hội tụ đa kênh tương tác trong 1 luồng duy nhất (All-in-One Channel):**
   - Khách thuê không cần tải thêm ứng dụng. Toàn bộ hành trình từ: Nhận thông báo xác nhận lịch hẹn $\rightarrow$ Nhận chỉ đường Google Maps tới sảnh $\rightarrow$ Nhận cuộc gọi đón tiếp $\rightarrow$ Nhận bảng tính chi phí All-in Cost $\rightarrow$ Nhận mã VietQR giữ chỗ 24h... đều hiển thị đồng bộ trong duy nhất một cửa sổ chat Zalo OA của VinStay AI.

---

## ĐIỀU 2. CƠ CHẾ SỬ DỤNG THẺ CƯ DÂN RFID & TIẾP ĐÓN LINH HOẠT TẠI SẢNH
Thẻ cư dân thang máy RFID là công cụ pháp lý và chuyên môn then chốt để Field Host thực hiện nghiệp vụ:

1. **Định danh thẻ cư dân trên hệ thống (`field_hosts.rfid_card_number`):**
   - Mỗi Field Host bắt buộc phải đăng ký số thẻ cư dân hợp lệ đã được phân quyền thang máy tại phân khu hoạt động.
   - Khi tiếp cận khách tại sảnh tầng 1, Host chủ động quẹt thẻ thang máy dẫn khách lên đúng tầng căn hộ trong vòng **60 giây**.
2. **ĐIỀU CẤM KỶ LUẬT: TUYỆT ĐỐI KHÔNG ĐƯỢC "ĐI KÉ" THANG MÁY:**
   - Nghiêm cấm Field Host đứng chờ tại sảnh để đi nhờ thang máy của cư dân khác. Hành vi này vi phạm quy chế an ninh của BQL, gây phiền hà cho cư dân và làm tổn hại nghiêm trọng đến hình ảnh chuyên nghiệp của nền tảng.
3. **Cơ chế đón sảnh theo Sự kiện (Event-driven):**
   - Thay vì đếm ngược phút giây cứng nhắc gây áp lực, việc đón tiếp vận hành theo **Sự kiện thực tế**:
     * Khách tới sảnh tòa nhà, mở Zalo bấm nút 1-chạm: **`[Tôi đã có mặt tại sảnh tòa...]`**.
     * Màn hình Host App rung chuông thông báo $\rightarrow$ Host nhanh chóng tiếp cận khách tại khu vực sảnh tiếp khách văn minh.
4. **Khoảng đệm giao thông linh hoạt (Flexible Traffic Buffer):**
   - Trường hợp khách bị chậm trễ do tắc đường trên các cầu vượt hoặc chờ xe buýt VinBus, khách bấm nút trên Zalo: **`[Tôi đến muộn 15–30 phút]`**.
   - Hệ thống tự động cập nhật trạng thái đệm giờ, Host chủ động nghỉ ngơi tại sảnh hoặc chuyển nhượng ticket cho Host khác trong cùng phân khu mà **hoàn toàn không bị tính lỗi hay phạt tiền**.

---

## ĐIỀU 3. KỊCH BẢN TIẾP ĐÓN 5 BƯỚC & TƯ VẤN THUÊ DÀI HẠN CHUẨN MỰC (SOP)
Field Host giữ vai trò là **"Chuyên Gia Thổ Địa (Local Guide)"**, đồng hành văn minh, giải quyết rào cản tâm lý của khách thuê dài hạn:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      KỊCH BẢN 5 BƯỚC TIẾP ĐÓN & TƯ VẤN CHUẨN MỰC (SOP)                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BƯỚC 1] Chào Đón & Định Danh Tại Sảnh:                                                          │
│          Chủ động liên hệ qua Zalo OA, đón khách tại ghế chờ sảnh tầng 1 với trang phục lịch sự. │
│          "Dạ chào anh/chị, em là [Tên], Field Host của VinStay AI phụ trách phân khu Sapphire ạ!"│
│                                                                                                  │
│ [BƯỚC 2] Dẫn Lên Thang Máy & Giới Thiệu Không Gian Sống:                                         │
│          Quẹt thẻ cư dân đưa khách lên tầng. Giới thiệu ngắn về hệ thống an ninh tầng, vị trí    │
│          phòng rác tự động và hệ thống PCCC tiêu chuẩn của Vinhomes.                             │
│                                                                                                  │
│ [BƯỚC 3] Mở Cửa JIT & Giữ Gìn Vệ Sinh Căn Hộ:                                                    │
│          Đứng trước cửa, Host bấm "Mở Cửa" trên App để nhận mã JIT 45 phút. Mời khách tháo giày   │
│          hoặc mang bọc giày bảo hộ để giữ sàn gỗ sạch đẹp cho chủ nhà.                           │
│                                                                                                  │
│ [BƯỚC 4] Tư Vấn Minh Bạch All-in Cost & Cross-Sell Giỏ Hàng Lân Cận:                             │
│          • Mở bảng All-in Cost bóc tách trọn gói tiền thuê + phí Vinhomes + gửi xe (0 chi phí ẩn).│
│          • Nếu khách do dự về hướng/giá: Mở Host App gợi ý ngay 01 căn tương tự cùng phân khu để │
│            dẫn xem tiếp trong 5 phút (tăng gấp đôi cơ hội tìm đúng căn phù hợp).                 │
│                                                                                                  │
│ [BƯỚC 5] Hỗ Trợ Chốt Cọc VietQR Hoặc Gửi Hồ Sơ Căn Hộ Số:                                        │
│          • Nếu khách ưng ý: Hướng dẫn quét VietQR động 2.000.000 VNĐ khóa căn 24h.               │
│          • Nếu khách cần suy nghĩ: Tiễn khách văn minh, tuyệt đối KHÔNG ÉP CỌC; hệ thống tự động  │
│            đẩy "Hồ sơ Căn hộ Số" vào Zalo khách để khách về nhà nghiên cứu thêm cùng người thân. │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 4. CƠ CHẾ MỞ CỬA JIT & KIỂM TRA AN NINH RỜI PHÒNG (KHÔNG BẮT BUỘC CHỤP ẢNH)
1. **Mã mở cửa tức thời (Just-in-Time - JIT Access Code):**
   - Khi Host dẫn khách tới trước cửa căn hộ, Host bấm nút **`[Mở cửa xem phòng]`** trên Host App.
   - Hệ thống kiểm tra tọa độ GPS Geofence ($\le 50m$) và tự động giải mã cấp mã mở cửa tức thời hiển thị trên màn hình Host với thời hạn hiệu lực **45 phút** (hoặc bàn giao chìa cơ lưu ký an toàn tại Văn phòng Phân khu).
   - Hành vi bấm mở cửa tự động sinh **Digital Event Log** trên hệ thống và gửi thông báo Zalo tức thì cho Chủ nhà, xác lập bằng chứng mở cửa minh bạch mà không cần chụp ảnh.
2. **Quy trình an ninh 1-chạm khi rời căn hộ:**
   - Trước khi rời đi, Host kiểm tra 3 điểm an toàn:
     1. Tắt toàn bộ đèn chiếu sáng, công tắc điều hòa, quạt hút mùi.
     2. Đóng kín cửa sổ các phòng và chốt chặt cửa lùa ban công/logia.
     3. Khóa chốt cửa chính an toàn.
   - Trên Host App, Host chỉ cần gạt **01 nút xác nhận duy nhất: `[Đã kiểm tra an toàn & Khóa cửa]`** (tốn đúng 1 giây) để hoàn tất phiên dẫn.
3. **Cơ chế chụp ảnh ngoại lệ (Exception-based Reporting - Tự bảo vệ Host):**
   - Host **CHỈ CẦN chụp ảnh** khi phát hiện căn hộ có vết xước tường, hỏng rèm hoặc đồ đạc bẩn có sẵn từ trước. Ảnh được tải lên hệ thống để làm bằng chứng miễn trừ trách nhiệm, bảo vệ Host khỏi các khiếu nại vô cớ từ chủ nhà.

---

## ĐIỀU 5. BẢO VỆ DOANH THU & KHÓA QUYỀN HOA HỒNG 30 NGÀY (ATTRIBUTION LOCK)
Nền tảng triệt tiêu nguy cơ cắt cầu giao dịch ngoài sàn bằng cơ cấu pháp lý chặt chẽ và chính sách kinh tế công bằng:

1. **Lá chắn từ Hợp đồng Ký gửi Quản lý Độc quyền (Exclusive Mandate):**
   - Chủ nhà đã ký hợp đồng độc quyền với VinStay AI. Mọi khoản cọc giữ chỗ 2 triệu bắt buộc phải nộp qua mã VietQR động gạch nợ trực tiếp vào tài khoản định danh nền tảng để khóa căn trên toàn mạng lưới.
   - Chủ nhà tuyệt đối từ chối giao dịch ngầm ngoài sàn để bảo toàn quyền lợi Hộ chiếu bàn giao 10 hạng mục và tránh chế tài bồi thường vi phạm thỏa thuận độc quyền (01 tháng tiền thuê).
2. **Chính sách Khóa Quyền Hoa Hồng 30 Ngày (Attribution Lock):**
   - Ngay khi Host hoàn thành phiên dẫn, hệ thống tự động gắn mã Host với khách thuê trong vòng **30 ngày**.
   - Bất kể khi nào khách hàng thực hiện cọc căn hộ đó (hoặc bất kỳ căn hộ nào khác trên sàn VinStay AI qua Web/Zalo) trong vòng 30 ngày $\rightarrow$ **100% Hoa hồng chốt cọc (Deal Commission) vẫn tự động đổ về ví của chính Host đã dẫn**.
   - Cơ chế này giải tỏa hoàn toàn áp lực ép cọc, giúp Host phục vụ tận tâm và triệt tiêu động cơ cắt cầu dại dột để bị tước quyền hoạt động trên nền tảng.

---

## ĐIỀU 6. ĐO LƯỜNG HIỆU QUẢ THEO TỶ LỆ CHỐT CĂN & CHẾ TÀI THỰC ĐỊA
Admin Portal quản lý chất lượng mạng lưới Field Host thông qua các chỉ số chuyển đổi thực tế:

| Chỉ Số Đánh Giá | Công Thức / Nguồn Dữ Liệu | Quyền Lợi & Hệ Quả Phân Bổ |
| :--- | :--- | :--- |
| **Tỷ Lệ Chốt Căn (Close Rate)** | $\text{Tỷ lệ} = \frac{\text{Số ca cọc thành công}}{\text{Tổng số ca dẫn}} \times 100\%$ | • **$\ge 25\%$ (Host Xuất Sắc / Top Performer):** Ưu tiên nhận ticket "Căn hời phân khu" Top đầu + Thưởng nóng.<br/>• **$10\% - 24\%$ (Host Tiêu Chuẩn):** Điều phối bình thường.<br/>• **$< 10\%$ (sau 10 ca):** Giảm phân bổ ticket để đào tạo lại kỹ năng tư vấn. |
| **Đánh Giá Khách Hàng (Customer Rating)** | Khách bấm chọn số sao (1–5★) trên tin nhắn Zalo tự động sau buổi xem phòng | Duy trì điểm trung bình $\ge 4.8★$ để kích hoạt hệ số nhân thù lao tối đa (`rating_multiplier_5star`). |
| **Tỷ Lệ Nhận Ticket Đúng SLA** | Bấm nhận ticket trong vòng 3 phút từ khi hệ thống phát | Đạt $\ge 90\%$ được ưu tiên nhận ticket bán kính 300m gần nhất. |

### BẢNG CHẾ TÀI XỬ LÝ VI PHẠM KỶ LUẬT THỰC ĐỊA:
| Hành Vi Vi Phạm | Chế Tài Khấu Trừ Thù Lao | Biện Pháp Kỷ Luật Bổ Sung |
| :--- | :---: | :--- |
| **"Đi ké" thang máy của cư dân khác** | Khấu trừ **100% thù lao lượt dẫn** | Ghi nhận 01 điểm vi phạm quy chuẩn văn minh. |
| **Quên tắt thiết bị điện / Không khóa cửa** | **Phạt 200.000 VNĐ** | Bồi thường chi phí điện phát sinh thực tế. |
| **Để khách chờ tại sảnh quá 15 phút (không báo trước)** | Khấu trừ **100% thù lao lượt dẫn** | Giảm độ ưu tiên nhận ticket trong 03 ngày. |
| **Cố tình xin SĐT riêng để cắt cầu ngoài sàn** | **Tịch thu 100% thù lao kỳ** | Khóa vĩnh viễn tài khoản đối tác trên toàn hệ thống. |

---

## ĐIỀU 7. HIỆU LỰC THỰC THI
1. Quy chế này có hiệu lực bắt buộc áp dụng đối với toàn bộ Field Host thuộc mạng lưới VinStay AI tại Vinhomes Ocean Park kể từ ngày công bố.
2. Ban Quản Trị nền tảng chịu trách nhiệm cấu hình hạ tầng Zalo OA / ZCC, bảo đảm đường truyền ổn định và phân bổ ticket công bằng, minh bạch trên hệ thống.

---
*Văn bản thuộc Hệ thống Pháp lý & Vận hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
