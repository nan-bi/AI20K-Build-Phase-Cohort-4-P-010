# VINSTAY AI — PROJECT BRIEF (1-PAGE)

---

## 1. Thông Tin Tổng Quan Dự Án
* **Tên dự án:** VinStay AI – Hệ điều hành Cho thuê & Vận hành Căn hộ Vinhomes
* **Mã nhóm thực hiện:** Team T-010 (Khóa C401 — AI20K Build Phase)
* **Giai đoạn:** MVP Gate 1 – Gate 3 (Thời gian triển khai: 3 tuần)
* **Định vị sản phẩm:** Nền tảng PropTech ứng dụng AI giải quyết bài toán cốt lõi: **Minh bạch thông tin**, **Bảng tính All-in Cost trọn gói**, **Khớp căn tự động (Matchmaker)** và **Điều phối nhân sự thực địa (Field Host)** nhằm loại trừ 100% tin ảo, tối ưu chi phí vận hành và rút ngắn chu kỳ tìm nhà.

---

## 2. Bối Cảnh & Bài Toán Thị Trường (Market Pain Points)
Tại các đại đô thị quy mô lớn như Vinhomes Ocean Park (Gia Lâm, Hà Nội), chuỗi giá trị cho thuê căn hộ đang đứt gãy nghiêm trọng ở 4 đối tượng:

1. **Đối với Khách thuê (Tenants / End Users):**
   * **Nạn tin ảo, tin mồi & tráo căn:** Hơn 60% tin đăng mạng xã hội là tin mồi; ảnh 3D sai khác hiện trạng thực tế; tốn 7–14 ngày kiệt sức nhắn tin với nhiều môi giới mà không tìm được căn thật.
   * **Bẫy chi phí ẩn & Sốc ngân sách All-in:** Giá chào thuê thấp nhưng khi vào ở bị cộng dồn phí quản lý Vinhomes (8–11k/m2), phí gửi xe, chênh lệch điện nước đẩy tổng chi phí vượt 20–30% ngân sách trần.
   * **Cực hình đi xem phòng & Bị chèo kéo:** Lạc đường trong đại đô thị 420ha, chờ đợi vạ vật tại sảnh; môi giới không có thẻ thang máy phải "đi ké"; bị áp lực tâm lý chốt cọc gấp gáp.
   * **Rủi ro lừa cọc & Mập mờ hợp đồng:** Nguy cơ mất cọc khi chuyển tiền cho môi giới tự do; hợp đồng tải mạng thiếu cân bằng quyền lợi; rủi ro lộ lọt ảnh CCCD cho bên thứ ba.
   * **Bị bỏ rơi khi ở & Tranh chấp trừ cọc:** Môi giới nhận hoa hồng xong bỏ mặc sự cố hỏng hóc vặt; khi trả phòng bị chủ nhà bắt bẻ trừ cọc oan do thiếu bằng chứng đối soát hiện trạng lúc nhận nhà.
2. **Đối với Chủ nhà (Landlords):**
   * **Trống phòng kéo dài & Thiệt hại tài chính kép:** Tốn 15–30 ngày tìm khách mới; mất 6–12 triệu VNĐ/tháng tiền thuê trong khi vẫn phải trả lãi vay ngân hàng + phí quản lý BQL Vinhomes.
   * **Cực hình đi lại 20–30km & Môi giới làm phiền:** Chủ nhà ở nội thành phải chạy xe xa sang Ocean Park mở cửa nhưng hay bị khách "bỏ bom"; bị môi giới spam cuộc gọi, ăn cắp ảnh đăng tin mồi dìm giá.
   * **Tranh chấp hỏng hóc nội thất & Rủi ro cọc:** Không có bằng chứng ảnh/video hiện trạng lúc nhận nhà để đối soát khi trả phòng, hợp đồng lỏng lẻo khiến cọc không đủ bù hư hại.
   * **Khủng hoảng bảo trì vặt & Rủi ro BQL phạt:** Máy lạnh, điện nước hỏng lúc nửa đêm khách đòi sửa ngay; thợ ngoài chặt chém; khách vi phạm nội quy bị BQL phạt trực tiếp chủ hộ; khách dọn đi bùng tiền dịch vụ.
3. **Đối với Đơn vị Quản lý Nền tảng & Nhân sự Thực địa (Platform & Field Ops):**
   * **Rổ hàng bị "thiu" & Chi phí kiểm định tốn kém:** Căn hộ đã cho thuê ngoài nhưng web không cập nhật kịp thời gây mất uy tín; chi phí nhân sự thẩm định ảnh thủ công quá cao.
   * **Nguy cơ bị "cắt cầu" giao dịch ngoài nền tảng:** Sau khi dẫn xem phòng, khách và chủ nhà xin số bắt tay ngầm ký riêng để trốn phí nền tảng, khiến nền tảng thất thoát doanh thu.
   * **Khách "bỏ bom" (No-show) làm lãng phí thời gian:** Field Host chạy giữa các phân khu đứng đợi sảnh nhưng khách không đến hoặc hủy sát giờ, gây kiệt sức và mất thời gian chết.
   * **Bẫy chi phí cố định OpEx vs Quản lý CTV:** Trả lương cứng full-time thì âm dòng tiền mùa thấp điểm; dùng CTV tự do thì khó chuẩn hóa dịch vụ và kỷ luật đón tiếp.
   * **Tranh giành lead & Chậm trễ điều phối tiếp đón:** Phân bổ thủ công dễ gây tranh chấp khách giữa các Sale, hoặc khách phải chờ lâu ở sảnh do không có cơ chế chuyển giao tự động có SLA.
4. **Đối với Hệ sinh thái Vinhomes (Chủ đầu tư & Cư dân):**
   * **Mất trật tự & An ninh sảnh:** Môi giới tự do chèo kéo, dẫn khách vào sảnh gây ảnh hưởng chuẩn sống cư dân cao cấp.
   * **Mô hình Stay truyền thống chi phí cao:** Chi phí duy trì bộ máy nhân sự cố định (lễ tân, buồng phòng, kỹ thuật) đè nặng lên giá thành vận hành.

---

## 3. Giải Pháp VinStay AI (Core Solutions)

VinStay AI đóng vai trò "lớp đệm công nghệ tinh gọn" kết nối trực tiếp Khách thuê – Căn hộ thực – Field Host nội khu:

* **Minh bạch Dữ liệu Lõi (Transparency Core):**
  * Chuẩn hóa rổ hàng theo mã căn thực tế: `[Tòa] - [Tầng] - [Số căn]` gắn với layout bàn giao chuẩn.
  * **Bảng tính All-in Cost thời gian thực:** Công khai tổng chi phí hàng tháng: $\text{Giá thuê} + \text{Phí quản lý niêm yết} + \text{Phí gửi xe} + \text{Dự toán điện nước}$.
  * Ảnh thực tế 100% (Verified Listing) có dấu thời gian kiểm định, loại bỏ ảnh 3D minh họa.
* **Khớp căn thông minh (AI Matchmaker):**
  * Khách nhập 4 tiêu chí: Ngân sách trần, Loại căn (Studio/1PN+/2PN/3PN), Ngày dọn vào, Số nhân khẩu.
  * AI đối soát giỏ hàng khả dụng và đề xuất đúng **3 căn hộ tối ưu nhất trong vòng 30 giây**, gắn nhãn *"Căn hời phân khu"* nếu rẻ hơn $\ge 10\%$ mặt bằng tòa.
* **Điều phối Thực địa 1-chạm (Field Host Dispatcher):**
  * Khách đặt lịch xem và xác thực qua OTP Zalo/SMS.
  * Hệ thống kích hoạt quy trình nhắc hẹn kép T-10m: Báo trước 10 phút cho Field Host di chuyển xuống sảnh, và gửi tin nhắn Zalo kèm nút 1-chạm "Tôi đã có mặt tại sảnh" cho khách (không dán QR sảnh).
  * Host đón khách tại sảnh đúng giờ, quẹt thẻ cư dân thang máy đưa lên phòng; khi tới cửa, Host bấm xác nhận xem phòng trên app để nhận mã số mở khóa điện tử (hoặc dùng chìa cơ do nhân sự phân khu giữ; không dùng Lockbox treo cửa vi phạm BQL).
* **Chốt Cọc Giữ Chỗ & Bảo Đảm Nội Thất (VietQR Escrow & Digital Agreement):**
  * Căn có $\ge 3$ lịch xem/24h tự động gắn nhãn **🔥 HOT**.
  * Khách ưng ý quét mã **VietQR động** cọc giữ chỗ 2.000.000 VNĐ $\rightarrow$ Căn hộ khóa trạng thái `holding` 24h (tự động hủy lịch xem sau và Zalo Bot gợi ý 2 căn thay thế).
  * Khi ký Hợp đồng thuê chính thức, khoản cọc 2 triệu này được chuyển đổi 100% thành **Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)**, giữ nguyên suốt thời hạn thuê để bảo vệ nội thất và hoàn trả khi thanh lý.
  * AI OCR bóc tách CCCD 2 mặt để tự động điền **Thỏa thuận cọc số** ký OTP bảo mật AES-256 theo Nghị định 13/2023/NĐ-CP.
* **Hộ Chiếu Bàn Giao Số & Danh Bạ Kỹ Thuật Tinh Gọn (Digital Handover Passport & Lean Referral):**
  * Lưu trữ bộ ảnh kiểm kê hiện trạng có timestamp của 10 hạng mục nội thất lúc nhận nhà làm chứng cứ pháp lý đối soát, chống trừ cọc oan với các hao mòn tự nhiên.
  * Mô hình vận hành tinh gọn: Khi có sự cố hỏng hóc phát sinh trong quá trình ở, hệ thống và Field Host đóng vai trò giới thiệu danh bạ thợ kỹ thuật ngoài uy tín tại Ocean Park; khách thuê và phía thợ tự thỏa thuận chi phí và chịu trách nhiệm trực tiếp, VinStay AI duy trì mô hình asset-light không ôm khâu sửa chữa.

---

## 4. Giá Trị Tạo Lập Cho Hệ Sinh Thái Vinhomes (Vinhomes Alignment)
1. **Bảo vệ chuẩn mực hình ảnh:** 100% thông tin chuẩn xác, chấm dứt tình trạng môi giới tự do tụ tập gây mất an ninh sảnh.
2. **Bảo vệ tỷ suất sinh lời (Rental Yield):** Neo giữ khung giá sàn và giá tham chiếu công khai, triệt tiêu nạn phá giá thị trường.
3. **Tối ưu hóa công suất khai thác & Chuẩn hóa dữ liệu:** Giúp chủ nhà và phân khu rút ngắn thời gian phòng trống từ 30 ngày xuống dưới 7 ngày, cung cấp báo cáo dữ liệu biến động giá thuê thực tế theo thời gian thực.
4. **Đồng bộ hóa an ninh:** Khách đến xem đều được xác thực SĐT/OTP, đi kèm Field Host định danh rõ ràng, bảo đảm tuân thủ quy chế an ninh tòa nhà.

---

## 5. Phạm Vi Triển Khai MVP (Gate G1 – Gate G3)
* **Phân khu thử nghiệm:** 30–50 căn hộ thực tế tại phân khu The Sapphire 1 hoặc Sapphire 2 (Vinhomes Ocean Park).
* **4 Module chức năng hoàn thiện:**
  1. *Web Catalog:* Tìm kiếm theo ngân sách All-in Cost & Badge "Căn hời".
  2. *AI Matchmaker:* Lọc rổ hàng trong 30 giây và trả về Top 3 căn tối ưu.
  3. *Booking & Field Host Dispatch:* Đặt lịch OTP, quy trình nhắc hẹn kép T-10m và giao việc cho Field Host.
  4. *VietQR Holding Deposit & AI OCR CCCD:* Nhận cọc 2 triệu khóa phòng 24h và trích xuất CCCD tự động.
