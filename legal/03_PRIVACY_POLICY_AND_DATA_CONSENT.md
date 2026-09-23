# VINSTAY AI — CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN & ĐỒNG THUẬN BÓC TÁCH OCR CCCD
*(Ban hành theo Nghị định số 13/2023/NĐ-CP ngày 17/04/2023 của Chính phủ về Bảo vệ Dữ liệu Cá nhân)*

---

## 1. MỤC ĐÍCH & PHẠM VI ÁP DỤNG
Chính sách này quy định cách thức nền tảng **VinStay AI** thu thập, xử lý, lưu trữ và bảo vệ dữ liệu cá nhân của Khách thuê (Tenants), Chủ nhà (Landlords) và Field Hosts. VinStay AI cam kết tuân thủ 100% các nguyên tắc bảo vệ quyền riêng tư và an toàn thông tin theo quy định của pháp luật Việt Nam.

---

## 2. CÁC LOẠI DỮ LIỆU CÁ NHÂN ĐƯỢC THU THẬP & XỬ LÝ
1. **Dữ liệu cá nhân cơ bản:**
   * Họ và tên, số điện thoại liên lạc, địa chỉ email, địa chỉ thường trú.
   * Thông tin định danh trên Căn cước công dân (CCCD) gắn chip: Số định danh cá nhân (12 chữ số), ngày sinh, giới tính, quê quán.
2. **Dữ liệu hình ảnh kiểm định & nhận diện:**
   * Ảnh chụp 2 mặt thẻ CCCD gắn chip của Khách thuê phục vụ xác thực giao dịch cọc và đăng ký tạm trú với Công an xã/phường.
   * Ảnh thực tế căn hộ và ảnh hiện trạng 10 hạng mục nội thất (Hộ chiếu bàn giao số).
3. **Dữ liệu viễn thông & thiết bị:**
   * Địa chỉ IP, dấu vết thời gian truy cập (Timestamp), nhật ký xác thực OTP Zalo/SMS.
   * Vị trí địa lý tương đối (Geofence) tại khu đô thị Vinhomes Ocean Park nhằm điều phối Field Host đón sảnh và cấp mã mở cửa.

---

## 3. MỤC ĐÍCH XỬ LÝ DỮ LIỆU (PURPOSE LIMITATION)
VinStay AI cam kết chỉ sử dụng dữ liệu cá nhân thu thập được cho các mục đích hợp pháp sau:
1. **Xác thực danh tính chủ thể giao dịch:** Ngăn chặn tình trạng môi giới ảo, tin mồi lừa đảo hoặc khách "bỏ bom" (no-show).
2. **Thực hiện Hợp đồng cọc & Hợp đồng thuê:** Tự động điền dữ liệu bóc tách từ AI OCR vào biểu mẫu Thỏa thuận cọc và Hợp đồng thuê căn hộ số hóa.
3. **Thực hiện thủ tục đăng ký tạm trú:** Hỗ trợ Chủ nhà và Khách thuê khai báo tạm trú trực tuyến với cơ quan Công an có thẩm quyền theo quy định của Luật Cư trú.
4. **Bảo mật mã mở khóa cửa:** Mã khóa cửa chỉ được cấp cho Field Host và gửi thông báo xác nhận mở cửa cho Chủ nhà qua số điện thoại chính chủ.

> [!IMPORTANT]
> **CAM KẾT TUYỆT ĐỐI KHÔNG CHUYỂN GIAO CHO BÊN THỨ BA:**  
> VinStay AI **tuyệt đối không bán, không cho thuê, không chia sẻ** số điện thoại và ảnh CCCD của Khách thuê/Chủ nhà cho bất kỳ môi giới tự do, công ty quảng cáo hoặc bên thứ ba nào khi chưa có sự đồng ý rõ ràng của chủ thể dữ liệu.

---

## 4. QUY TRÌNH XỬ LÝ AI VISION OCR CCCD & MÃ HÓA AN NINH
1. **Cơ chế bóc tách AI OCR:** Khi Khách thuê tải ảnh CCCD 2 mặt, mô-đun AI Vision OCR tiến hành trích xuất trường dữ liệu trong vòng $\le 5$ giây trong môi trường điện toán đám mây bảo mật.
2. **Tiêu chuẩn mã hóa AES-256:**
   * Toàn bộ ảnh CCCD gốc và các trường thông tin nhạy cảm (Số định danh, Mật mã khóa cửa điện tử) được mã hóa theo tiêu chuẩn **AES-256** tại cơ sở dữ liệu PostgreSQL/Supabase.
   * Dữ liệu truyền tải qua mạng Internet bắt buộc đi qua giao thức bảo mật an toàn **HTTPS/TLS 1.3**.
3. **Mặt nạ bảo mật (Data Masking):** Trên giao diện Web và ứng dụng của Field Host, số điện thoại của Chủ nhà và Khách thuê được ẩn 4 số giữa (vd: `0912***678`) nhằm triệt tiêu nguy cơ rò rỉ thông tin cá nhân.

---

## 5. QUYỀN VÀ NGHĨA VỤ CỦA CHỦ THỂ DỮ LIỆU
Căn cứ Điều 9 Nghị định 13/2023/NĐ-CP, Chủ thể dữ liệu tại VinStay AI có các quyền:
1. **Quyền được biết:** Được thông báo rõ ràng về mục đích, phạm vi xử lý dữ liệu trước khi cung cấp.
2. **Quyền đồng ý hoặc rút lại sự đồng ý:** Khách thuê chủ động bấm chọn đồng ý trước khi tải ảnh CCCD.
3. **Quyền yêu cầu chỉnh sửa hoặc xóa dữ liệu (Right to Erasure):** Khi Hợp đồng thuê nhà kết thúc và hoàn tất thủ tục quyết toán công nợ, Khách thuê có quyền yêu cầu xóa vĩnh viễn hình ảnh CCCD trên hệ thống của VinStay AI.

---

## 6. ĐỒNG THUẬN CỦA NGƯỜI DÙNG (USER CONSENT STATEMENT)
*Bằng việc tích chọn vào ô: **"Tôi đã đọc, hiểu rõ và đồng ý với Chính sách Bảo vệ Dữ liệu Cá nhân của VinStay AI"** và nhập mã xác thực OTP gửi về số điện thoại cá nhân, Người dùng xác nhận đã trao quyền hợp pháp và tự nguyện cho VinStay AI xử lý dữ liệu cá nhân theo đúng các điều khoản quy định tại văn bản này.*
