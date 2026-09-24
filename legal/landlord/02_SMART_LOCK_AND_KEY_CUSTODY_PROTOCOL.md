# QUY CHẾ QUẢN LÝ MÃ KHÓA CỬA ĐIỆN TỬ, LƯU KÝ CHÌA KHÓA CƠ & TIẾP ĐÓN XEM PHÒNG TỪ XA
### (SMART LOCK ACCESS, KEY CUSTODY & REMOTE VIEWING PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-LL-02*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015 (Hợp đồng gửi giữ tài sản, ủy quyền thực hiện hành vi pháp lý), Luật Nhà ở 2023, Nghị định 13/2023/NĐ-CP và Quy chế An ninh & Trật tự của Ban Quản lý (BQL) Vinhomes Ocean Park.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ THỰC THI
Văn bản này quy định chi tiết quy trình quản lý quyền truy cập căn hộ, mã khóa cửa điện tử, quản lý chìa khóa cơ và quy chuẩn dẫn khách xem phòng tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**. 

Quy chế được thiết kế nhằm hiện thực hóa cam kết cốt lõi: **"Chủ Nhà ở nhà 100% — 0km di chuyển — Không tốn 1 giọt xăng hay 1 phút di chuyển — Tuyệt đối an toàn tài sản"**, đồng thời tuân thủ nghiêm ngặt 100% quy chế BQL Vinhomes (tuyệt đối không sử dụng hộp Lockbox treo cửa vi phạm mỹ quan và an ninh hành lang tòa nhà).

---

## ĐIỀU 1. ĐỊNH NGHĨA & CƠ CHẾ VẬN HÀNH KHÔNG LOCKBOX
1. **Chủ Nhà Ở Nhà 100% (Remote Landlord Guarantee):** Chủ nhà ở nội thành Hà Nội (Cầu Giấy, Đống Đa, Thanh Xuân, Ba Đình...) theo dõi toàn bộ tiến trình tiếp đón khách, lịch sử mở cửa và trạng thái căn hộ thông qua Ứng dụng Chủ Nhà và thông báo tự động qua Zalo ZNS. Chủ nhà không cần phải trực tiếp có mặt tại Ocean Park để mở cửa.
2. **Cơ Chế Cấp Mã Tức Thời (Just-in-Time Access Dispatch):** Mã khóa điện tử chỉ được giải mã và cấp cho Field Host nội khu ngay tại thời điểm Host đã có mặt trước cửa căn hộ cùng khách thuê thật, có giới hạn thời gian hiệu lực theo phiên xem phòng.
3. **Tuyệt Đối Nghiêm Cấm Hộp Lockbox Treo Cửa (Strict No-Lockbox Policy):** 
   - Hệ thống VinStay AI tuyệt đối không sử dụng hộp khóa mật mã (Lockbox) treo tại tay nắm cửa căn hộ.
   - *Lý do pháp lý và an ninh:* Hành vi treo Lockbox vi phạm nghiêm trọng Quy chế Quản lý Nhà chung cư của Vinhomes, bị BQL lập biên bản xử phạt, cắt quyền vào sảnh của căn hộ và tiềm ẩn rủi ro kẻ gian dò mã phá hoại tài sản.
4. **Giải Pháp Thực Địa Chuẩn Quy Chế:** Sử dụng thẻ cư dân RFID hợp lệ của Field Host để đi thang máy và mở cửa bằng mã số điện tử cấp qua App hoặc chìa khóa cơ lưu ký an toàn tại Văn phòng Phân khu.

---

## ĐIỀU 2. CƠ CHẾ LƯU TRỮ & BẢO MẬT MÃ KHÓA CỬA ĐIỆN TỬ
1. **Thiết lập mã khóa riêng biệt:**
   - Chủ nhà cài đặt một mã số mở cửa chuyên dụng trên khóa thông minh dành riêng cho hệ thống VinStay AI (hoặc cung cấp mã Master/mã tạm thời).
   - Khuyến khích chủ nhà sử dụng tính năng tạo mã theo thời gian (OTP Time-based) nếu khóa cửa hỗ trợ.
2. **Tiêu chuẩn mã hóa dữ liệu:**
   - Toàn bộ mã khóa cửa của căn hộ được mã hóa đầu cuối bằng thuật toán mã hóa đối xứng **AES-256 (Advanced Encryption Standard 256-bit)** ngay khi Chủ nhà nhập trên ứng dụng.
   - Khóa giải mã (Decryption Key) được lưu trữ tại phân vùng bảo mật riêng biệt (Hardware Security Module / KMS).
3. **Phân quyền truy cập nội bộ (Zero-Knowledge Principle):**
   - Nhân viên chăm sóc khách hàng, nhân viên tổng đài và các phòng ban gián tiếp tuyệt đối **KHÔNG** thể nhìn thấy mã cửa dưới dạng văn bản thô (Plaintext).
   - Mã cửa chỉ được giải mã tự động bởi dịch vụ backend khi thỏa mãn đồng thời các điều kiện kiểm tra an ninh tại Điều 3 Quy chế này.

---

## ĐIỀU 3. QUY TRÌNH TIẾP ĐÓN XEM PHÒNG & CẤP MÃ MỞ CỬA TỨC THỜI
Quy trình dẫn khách xem phòng được thực hiện khép kín qua 6 bước tự động:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      QUY TRÌNH TIẾP ĐÓN XEM PHÒNG & CẤP MÃ KHÓA TỨC THỜI (JIT ACCESS)                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BƯỚC 1] Khách thuê xác thực SĐT qua Zalo OTP ──> Đặt lịch xem phòng thành công trên hệ thống.                 │
│                                                                                                                 │
│ [BƯỚC 2] Thuật toán Auto-Dispatch điều phối Field Host trực thuộc phân khu tiếp nhận ticket.                    │
│                                                                                                                 │
│ [BƯỚC 3] Nhắc hẹn kép T-10m:                                                                                    │
│          • Báo Field Host chuẩn bị thẻ cư dân xuống sảnh đón khách.                                            │
│          • Gửi tin nhắn Zalo kèm nút 1-chạm "Tôi đã có mặt tại sảnh" cho khách (Không dán QR tại sảnh).       │
│                                                                                                                 │
│ [BƯỚC 4] Khách bấm nút tại sảnh ──> Host đón khách, quẹt thẻ cư dân thang máy dẫn lên đúng tầng căn hộ.        │
│                                                                                                                 │
│ [BƯỚC 5] Đứng trước cửa, Host bấm "Mở cửa xem phòng" trên App:                                                  │
│          • Hệ thống kiểm tra tọa độ Geofence & thời gian thực.                                                  │
│          • Cấp mã cửa hiển thị trên App của Host (hiệu lực phiên tối đa 45 phút).                               │
│          • Gửi thông báo tức thời qua Zalo/App cho Chủ nhà: "Căn hộ của bạn đang được mở cửa xem phòng".        │
│                                                                                                                 │
│ [BƯỚC 6] Kết thúc xem phòng: Host kiểm tra khóa cửa, bấm "Hoàn tất xem phòng" ──> Thu hồi mã tức thì.          │
│          • Gửi thông báo cho Chủ nhà: "Buổi xem phòng hoàn tất, cửa đã khóa chốt an toàn".                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 4. CƠ CHẾ LƯU KÝ & QUẢN LÝ CHÌA KHÓA CƠ (PHYSICAL KEY CUSTODY)
Đối với các căn hộ chưa trang bị khóa điện tử thông minh hoặc Chủ nhà có nhu cầu gửi chìa khóa cơ:
1. **Tiếp nhận bàn giao:**
   - Chủ nhà bàn giao tối thiểu **02 (hai) bộ chìa khóa cơ** chính thức tại Văn phòng Vận hành Phân khu của VinStay AI tại Ocean Park (gồm chìa cửa chính, chìa khóa phụ nếu có).
   - Lập **Biên bản Giao nhận Chìa Khóa Số** ghi nhận chi tiết số lượng, ký hiệu chìa kèm ảnh chụp thực tế có Timestamp, được hai bên ký số xác nhận qua OTP.
2. **Quy chuẩn lưu kho an toàn:**
   - Chìa khóa cơ được niêm phong trong bao chứa chuyên dụng có mã vạch định danh chuẩn `[TÒA-TẦNG-CĂN]` và lưu trữ trong tủ két an toàn bảo mật 2 lớp tại Văn phòng Phân khu.
   - Chỉ có **Trưởng phân khu (Area Lead)** mới có quyền truy cập tủ két để xuất chìa khóa.
3. **Quy chế xuất và hoàn trả chìa khóa:**
   - Chìa khóa chỉ được xuất cho Field Host khi có lịch hẹn xem phòng hợp lệ đã được xác nhận của khách trên hệ thống.
   - Field Host nhận chìa, ký nhận điện tử trên ứng dụng nội bộ trước khi dẫn khách.
   - Ngay sau khi kết thúc buổi xem phòng (tối đa 60 phút kể từ lúc xuất kho), Field Host có nghĩa vụ hoàn trả chìa khóa về két an toàn và hoàn tất thủ tục chốt sổ lưu ký.

---

## ĐIỀU 5. NHẬT KÝ TRUY CẬP THỜI GIAN THỰC & BÁO CÁO MINH BẠCH CHO CHỦ NHÀ
1. **Nhật ký điện tử bất biến (Immutable Access Log):**
   - Mọi hoạt động liên quan đến căn hộ (cấp mã điện tử, thời điểm mở cửa, xuất/nhập chìa khóa cơ, thời điểm đóng cửa) đều được hệ thống tự động ghi lại vĩnh viễn trên **Audit Trail**.
   - Mỗi bản ghi bao gồm: ID phiên hẹn, Họ tên & SĐT Field Host phụ trách, Họ tên khách xem phòng, Thời điểm chính xác (Timestamp đến từng giây) và Tọa độ GPS của thiết bị Host.
2. **Thông báo đa kênh cho Chủ Nhà (Real-Time Push & Zalo Notifications):**
   - Chủ nhà nhận được thông báo tự động tức thì vào các thời điểm then chốt:
     * *Khi có lịch hẹn mới được xác nhận.*
     * *Khi khách đã có mặt tại sảnh và Host bắt đầu dẫn lên phòng.*
     * *Thời điểm Host bấm mở cửa căn hộ.*
     * *Thời điểm Host hoàn tất buổi xem phòng và chốt khóa an toàn.*
   - Chủ nhà có thể tra cứu toàn bộ lịch sử xem phòng bất kỳ lúc nào trên màn hình Ứng dụng Chủ Nhà.

---

## ĐIỀU 6. TRÁCH NHIỆM BẢO ĐẢM AN TOÀN TÀI SẢN & CAM KẾT ĐỀN BÙ
1. **Nghĩa vụ giám sát của Field Host:**
   - Field Host có trách nhiệm trực tiếp đồng hành cùng khách thuê trong toàn bộ thời gian tham quan căn hộ; tuyệt đối không để khách ở một mình trong căn hộ hoặc tự ý mở các ngăn kéo/tủ đồ kín.
   - Nhắc nhở khách cởi giày dép ngoài cửa hoặc sử dụng bọc giày bảo hộ để giữ sạch sàn gỗ/thảm.
2. **Quy chuẩn chốt kiểm tra an ninh khi rời căn hộ:**
   - Trước khi rời khỏi căn hộ, Field Host bắt buộc thực hiện kiểm tra 4 điểm:
     1. Tắt toàn bộ đèn chiếu sáng và thiết bị điện tử đã bật phục vụ xem phòng.
     2. Đóng kín các cửa sổ, cửa ban công / logia.
     3. Khóa chốt an toàn cửa chính.
     4. Chụp 01 bức ảnh hiện trạng cửa đã khóa chốt gửi lên hệ thống làm bằng chứng hoàn thành phiên.
3. **Cam kết bồi thường rủi ro:**
   - Trường hợp xảy ra bất kỳ sự cố mất mát, hư hỏng tài sản nội thất hoặc thiết bị do lỗi bất cẩn, tắc trách của Field Host hoặc khách thuê trong buổi xem phòng, **VinStay AI cam kết chịu trách nhiệm bồi thường 100% chi phí sửa chữa hoặc thay mới** cho Chủ nhà theo đúng giá trị thị trường và hiện trạng ghi nhận trong Hộ chiếu bàn giao số.

---

## ĐIỀU 7. ĐIỀU KHOẢN THI HÀNH & KÝ DUYỆT ĐIỆN TỬ
1. Quy chế này có hiệu lực bắt buộc đối với Chủ Nhà, Đội ngũ Field Host và Đơn vị Vận hành VinStay AI kể từ ngày Hợp đồng Ký gửi Quản lý Cho thuê Độc quyền được kích hoạt.
2. Mọi sửa đổi, bổ sung quy chế phải được công bố công khai trên ứng dụng và thông báo trước tối thiểu 07 ngày làm việc cho Chủ nhà.

---
*Văn bản thuộc Hệ thống Pháp lý Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
