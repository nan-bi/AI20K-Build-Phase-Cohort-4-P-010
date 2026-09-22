# VINSTAY AI — PRODUCT REQUIREMENT DOCUMENT (PRD)

---

## 1. Tổng Quan Sản Phẩm (Product Overview)

### 1.1. Mục Tiêu Cốt Lõi
Số hóa và minh bạch hóa toàn bộ chặng đầu của vòng đời thuê BĐS tại các đại đô thị Vinhomes, trọng tâm thử nghiệm tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)** (**Tìm kiếm $\rightarrow$ Khớp căn All-in Cost $\rightarrow$ Đặt lịch xem phòng $\rightarrow$ Đón tiếp tại sảnh $\rightarrow$ Cọc giữ chỗ 24h & Ký thỏa thuận điện tử**). Hệ thống ứng dụng AI để tự động hóa 70% các tác vụ lặp lại, loại trừ 100% tin ảo, tối ưu chi phí vận hành nhân sự và đảm bảo an ninh nội khu.

### 1.2. Đối Tượng Người Dùng Chính (Target Personas)
1. **Khách thuê (Tenant / End Users):** Sinh viên VinUni, nhân sự văn phòng TechnoPark, chuyên gia và gia đình trẻ đối mặt với 5 rào cản lớn:
   * *Nạn tin mồi & tráo căn:* Mệt mỏi vì 60% bài đăng mạng xã hội là tin mồi, ảnh 3D sai thực tế, mất 7–14 ngày lướt tin rác.
   * *Bẫy chi phí ẩn:* Bị sốc khi tổng chi phí hàng tháng (All-in Cost) đội thêm 20–30% do các khoản phí quản lý, gửi xe, điện nước không báo trước.
   * *Trở ngại đi xem phòng:* Lạc đường ở Ocean Park, đứng chờ môi giới vạ vật tại sảnh, môi giới không có thẻ thang máy phải đi ké, bị ép cọc gấp gáp.
   * *Rủi ro lừa cọc & hợp đồng lỏng lẻo:* Mất tiền cọc khi giao dịch qua tài khoản cá nhân của môi giới trôi nổi; hợp đồng bất lợi; lộ lọt thông tin CCCD.
   * *Bị bỏ rơi & Tranh chấp trả cọc:* Môi giới phủi trách nhiệm sau khi nhận hoa hồng, chủ nhà ở xa không hỗ trợ sửa chữa hỏng hóc, bị trừ cọc oan uổng lúc trả phòng do không có ảnh đối soát ban đầu.
2. **Field Host (Sale/Cộng tác viên hiện trường nội khu):** Môi giới hoặc nhân sự đối tác túc trực tại phân khu (đã có thẻ cư dân thang máy), đối mặt với 2 rào cản vận hành lớn:
   * *Nỗi ám ảnh bị "bỏ bom" (No-show Fatigue):* Phải di chuyển giữa các phân khu đứng đợi sảnh nhưng khách không đến hoặc hủy hẹn sát giờ, gây kiệt sức và lãng phí thời gian chết.
   * *Tranh giành lead & Xung đột phân bổ:* Dễ xảy ra tranh chấp khách giữa các Sale hoặc bị quá tải khi nhận lead mới mà không có cơ chế chuyển giao tự động có SLA.
3. **Chủ nhà (Landlord):** Nhà đầu tư cá nhân sở hữu căn hộ cho thuê đối mặt với 4 bài toán sinh tử:
   * *Trống phòng kéo dài:* Mất 15–30 ngày tìm khách mới; thiệt hại 6–12 triệu/tháng trong khi vẫn gánh nợ lãi vay & phí quản lý (8–11k/m2).
   * *Cực hình đi lại mở cửa & tin ảo:* Ở xa nội thành phải chạy xe 20–30km sang mở cửa, dễ bị khách bỏ bom; bị môi giới quấy rầy, dìm giá.
   * *Tranh chấp hư hao & cọc:* Không có dữ liệu kiểm kê hiện trạng đối soát khi khách trả phòng, dễ chịu thiệt hại nội thất.
   * *Khủng hoảng bảo trì & BQL phạt:* Đau đầu vì sự cố hỏng hóc vặt lúc nửa đêm, nguy cơ BQL phạt do lỗi khách thuê, rủi ro khách bùng tiền cước.
4. **Quản trị viên (Platform Admin / Operations Lead):** Đơn vị quản lý vận hành nền tảng đối mặt với 3 điểm nghẽn kinh doanh cốt lõi:
   * *Rổ hàng bị "thiu" (Inventory Desync):* Căn đã cho thuê ngoài nhưng web không cập nhật kịp làm mất uy tín; chi phí cử người đi chụp ảnh, thẩm định thủ công quá đắt đỏ.
   * *Nguy cơ bị "cắt cầu" (Platform Leakage):* Khách và chủ nhà bắt tay ngầm ký hợp đồng riêng để trốn phí sau khi xem phòng, gây thất thoát nguồn thu của nền tảng.
   * *Bẫy chi phí cố định (Fixed OpEx Trap):* Trả lương cứng full-time thì âm dòng tiền vào mùa thấp điểm; dùng CTV tự do thì khó chuẩn hóa quy chuẩn tiếp đón và kiểm soát chất lượng.

### 1.3. Ma Trận Giải Quyết Dứt Điểm 5 Nỗi Đau Của Khách Thuê (Tenant Solutions Matrix)
1. **"Ma trận" tin ảo & Tráo căn (Bait-and-Switch):**
   * *Listing Verified 100%:* Định danh chuẩn [Tòa - Tầng - Căn] kèm ảnh thực tế có timestamp.
   * *Giỏ hàng Ký gửi Độc quyền:* VinStay AI toàn quyền quản lý, không qua môi giới trung gian, đảm bảo 100% căn thật, giá thật, còn phòng thật.
   * *AI Matchmaker lọc căn trong 30s:* Trả đúng Top 3 căn tối ưu theo 4 tiêu chí trần, tiết kiệm 7–14 ngày lướt tin rác.
2. **"Sốc chi phí ẩn" khi vào ở (Hidden Costs & Budget Shock):**
   * *Bảng tính All-in Cost thời gian thực:* Công khai trọn gói mọi chi phí hàng tháng (tiền thuê, phí quản lý 8–11k/m2, phí gửi xe máy/ô tô, dự toán điện nước EVN).
   * *Bộ lọc ngân sách trần (Hard Filter):* Loại trừ 100% căn hộ có tổng All-in Cost vượt ngân sách tối đa của khách.
   * *Badge "Căn hời phân khu":* Nhận diện căn có giá tốt (tiết kiệm $\ge 10\%$ so với cùng layout phân khu Sapphire) giúp khách săn căn giá tốt nhất.
3. **Cực hình đi xem phòng & Bị chèo kéo (Viewing Friction):**
   * *Nhắc hẹn kép T-10m & Nút bấm Zalo 1-chạm:* Khách nhận thông báo trước 10 phút, tới sảnh chỉ bấm nút `[Tôi đã có mặt tại sảnh]` trên Zalo; không dán QR sảnh vi phạm BQL.
   * *Field Host đón sảnh chuyên nghiệp:* Có sẵn thẻ cư dân thang máy, đưa khách lên phòng trong 60 giây.
   * *Cấp mã mở cửa qua app tại cửa phòng:* Host bấm mở phòng tức thì, không dùng hộp sắt lockbox cồng kềnh; khách thoải mái trải nghiệm không gian không bị ép cọc gấp.
4. **Rủi ro lừa tiền cọc & Hợp đồng bất lợi (Deposit Scams & Legal Exposure):**
   * *Cọc giữ chỗ 24h qua VietQR động (2.000.000 VNĐ):* Gạch nợ tự động vào tài khoản định danh nền tảng, khóa căn `holding` 24h chống tranh căn.
   * *Chuẩn hóa Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit):* Cọc 2 triệu chuyển 100% thành một phần của cọc bảo đảm khi ký hợp đồng chính thức, giữ nguyên suốt kỳ thuê để bảo vệ quyền lợi hai bên, TUYỆT ĐỐI KHÔNG khấu trừ vào tiền thuê tháng đầu tiên.
   * *AI OCR CCCD & Ký số OTP bảo mật AES-256:* Bóc tách CCCD gắn chip tự động điền Thỏa thuận cọc số tuân thủ Nghị định 13/2023/NĐ-CP, không để lộ lọt ảnh CCCD cho môi giới.
5. **"Bị bỏ rơi" khi ở & Tranh chấp trả cọc (Post-Move Abandonment & Unfair Deductions):**
   * *Hộ chiếu bàn giao số (Digital Handover Passport):* Lưu trữ ảnh kiểm định có Timestamp + Geofence của 10 hạng mục nội thất lúc nhận nhà làm chứng cứ đối soát pháp lý khi thanh lý (loại trừ cấn trừ hao mòn tự nhiên, bảo vệ 100% tiền cọc chính đáng của khách).
   * *Danh bạ Thợ kỹ thuật ngoài uy tín:* Field Host giới thiệu thợ uy tín tại Ocean Park; khách và thợ tự thỏa thuận chi phí và chịu trách nhiệm trực tiếp, sự cố hỏng hóc được xử lý ngay trong ngày mà không bị phụ thuộc chủ nhà ở xa.

### 1.4. Ma Trận Giải Quyết Dứt Điểm 4 Nỗi Đau Của Chủ Nhà (Landlord Solutions Matrix)
1. **Giải quyết Trống phòng kéo dài & Thiệt hại tài chính kép (Pre-Leasing Vacancy):**
   * *AI Matchmaker theo All-in Cost:* Khớp nhu cầu khách thuê trong 30 giây, rút ngắn chu kỳ tìm khách từ 30 ngày xuống dưới 7 ngày.
   * *Dynamic Deal & Badge "Căn hời phân khu":* Nhận diện căn có giá tốt ($\ge 10\%$), ưu tiên hiển thị Top đầu, tăng gấp 3 lần lượt xem mà chủ nhà không bị ép dìm giá.
   * *Khóa căn giữ chỗ 24h qua VietQR động (2.000.000 VNĐ):* Khóa trạng thái `holding` 24h, tạo áp lực khan hiếm, thúc đẩy chốt deal tức thì.
2. **Giải quyết Cực hình đi xa 20–30km & Môi giới làm phiền (Distance & Broker Chaos):**
   * *Mạng lưới Field Host + Cấp mã khóa điện tử qua App:* Chủ nhà lưu mã khóa số lên hệ thống khi ký gửi (hoặc nhân sự phân khu quản lý chìa cơ); Field Host (có sẵn thẻ cư dân thang máy) đón khách tại sảnh và dẫn lên xem phòng. Khi tới cửa, Host bấm xác nhận xem phòng trên app để nhận mã số mở cửa tức thì (tuyệt đối không dùng Lockbox treo cửa vi phạm quy chế BQL). Chủ nhà ở nhà 100%, theo dõi từ xa qua mobile app.
   * *Xác thực SĐT qua Zalo OTP & Nhắc hẹn kép T-10m:* Bắt buộc khách xác thực OTP trước khi đặt lịch; hệ thống kích hoạt thông báo nhắc hẹn kép trước 10 phút (báo Host xuống sảnh chuẩn bị, gửi Zalo kèm nút 1-chạm "Tôi đã có mặt tại sảnh" cho khách, không dán QR sảnh), triệt tiêu khách ảo và no-show.
   * *Listing Verified 100% & Bảo vệ thông tin chủ nhà:* Định danh [Tòa - Tầng - Căn] kèm ảnh timestamp; mã hóa SĐT cá nhân chủ nhà; watermark ảnh chống môi giới copy phá giá.
3. **Giải quyết Tranh chấp hư hao nội thất & Rủi ro tiền cọc (Asset & Deposit Disputes):**
   * *Hộ chiếu bàn giao số (Digital Handover Passport):* Chụp ảnh kiểm định 10 hạng mục nội thất nhúng Timestamp + Geofence; phân định rõ hao mòn tự nhiên và hư hại bất cẩn làm cơ sở pháp lý đối soát.
   * *Chuẩn hóa Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit):* Cọc 2M chuyển thành một phần của cọc bảo đảm, giữ nguyên suốt kỳ hạn thuê, TUYỆT ĐỐI KHÔNG khấu trừ vào tiền thuê tháng đầu tiên, làm lá chắn bảo vệ tài sản và bù đắp nợ cước.
   * *Ký số Thỏa thuận cọc & AI OCR CCCD:* Bóc tách CCCD 2 mặt, sinh hợp đồng cọc số ký OTP bảo mật AES-256 theo Nghị định 13/2023/NĐ-CP, ràng buộc pháp lý chặt chẽ.
4. **Giải quyết Khủng hoảng bảo trì vặt, BQL phạt & Bùng tiền dịch vụ (Operations & Rules):**
   * *Danh bạ Kỹ thuật Ngoài & Vận hành Tinh gọn (Asset-Light Handyman Referral):* VinStay AI & Field Host tuyệt đối không ôm khâu sửa chữa, không làm tổng thầu bảo trì; chỉ giới thiệu danh bạ thợ uy tín tại Ocean Park; khách và thợ tự thỏa thuận chi phí và chịu trách nhiệm trực tiếp, giải phóng chủ nhà khỏi cảnh réo đêm mà VinStay AI không gánh rủi ro vận hành.
   * *Số hóa Nội quy BQL Vinhomes & Tự động cấn trừ phạt vào cọc:* Mọi biên bản phạt của BQL do lỗi của khách sẽ tự động khấu trừ vào Tiền Cọc Bảo Đảm (Security Deposit).
   * *Chốt công tơ điện nước EVN & Đối soát All-in Cost:* Chụp ảnh công tơ điện nước có timestamp lúc nhận và trả phòng, đối soát dứt điểm tiền điện EVN, nước, phí gửi xe trước khi hoàn cọc.

### 1.5. Ma Trận Giải Quyết Dứt Điểm 5 Điểm Nghẽn Của Field Host (Field Host Solutions Matrix)
1. **Khách "bỏ bom" (No-Show Fatigue) & Lãng phí thời gian di chuyển:**
   * *Xác thực SĐT qua Zalo OTP:* Loại bỏ 100% tài khoản ảo và môi giới do thám.
   * *Quy trình Nhắc hẹn Kép T-10m & Nút tương tác Zalo 1-chạm:* Báo trước 10 phút cho Host xuống sảnh chuẩn bị; khách bấm `[📍 Tôi đã có mặt tại sảnh]` hoặc `[🚗 Đang trên đường]`, tuyệt đối không dán mã QR sảnh vi phạm quy chế BQL. Tự động giải phóng ca trực cho Host nếu khách không phản hồi trước 15 phút.
2. **Tranh giành Lead & Bất công phân bổ (Lead Cannibalization & Dispatch SLA):**
   * *Thuật toán Auto-Dispatch 3 tầng:* Ưu tiên Host gần nhất $\le 200$m (SLA 3m nhận việc) $\rightarrow$ Open Pool 500m $\rightarrow$ Chuyển Area Lead điều phối khẩn cấp.
   * *Quy tắc chống ôm Lead:* Giới hạn tối đa 1 lịch xem trong khung giờ 45 phút/Host, đảm bảo công bằng và đúng giờ tuyệt đối.
3. **Cực hình quản lý chìa khóa & Trở ngại thang máy (Key Chaos & Elevator Access):**
   * *Cấp mã mở khóa điện tử tức thì trên Mobile App:* Khi Host dẫn khách tới trước cửa phòng bấm `[Xác nhận xem phòng]`, mã số mở cửa hiển thị ngay trên app (kèm tin báo Zalo tự động cho chủ nhà).
   * *Quản lý chìa cơ tại phân khu:* Với căn chưa có khóa điện tử, Area Lead/quầy phân khu quản lý chìa khóa dự phòng; tuyệt đối không dùng Lockbox treo cửa.
   * *Thẻ cư dân thang máy RFID chuẩn mực:* 100% Host được trang bị thẻ cư dân phân khu Sapphire, lên phòng trong 60 giây.
4. **Nguy cơ bị "cắt cầu" giao dịch & Mất trắng công sức (Platform Leakage / Disintermediation):**
   * *Mã hóa liên lạc 2 chiều:* Ẩn số điện thoại cá nhân giữa khách và chủ nhà trên toàn hệ thống.
   * *VietQR cọc 2 triệu tại sảnh & Cơ chế Attribution Lock:* Khóa cứng mã định danh của Field Host dẫn khách; đảm bảo hoa hồng chốt cọc được chi trả tự động vào ví Host ngay khi deal thành công.
5. **Bẫy OpEx cố định & Kiểm soát chất lượng CTV (Fixed OpEx Trap & Quality Standardization):**
   * *Cấu hình Biến phí Động trên Trang Quản Trị (Admin Configurable Commission & Incentives):* Ban quản trị chủ động điều chỉnh mức thù lao lượt dẫn (Ticket Fee), tỷ lệ hoa hồng chốt cọc (Success Commission) và các gói thưởng nóng kích cầu theo từng giai đoạn thị trường/mùa vụ linh hoạt mà không cần can thiệp mã nguồn.
   * *Mobile Dashboard 1-chạm & Sổ tay phân khu số:* Tra cứu All-in Cost, diện tích, quy chế BQL chuẩn xác tức thì.
   * *Đánh giá sao (Rating 5-star):* Khách chấm sao sau lượt dẫn; Host đạt đánh giá cao ($\ge 4.8$) được ưu tiên bắn lead tầng 1.

### 1.6. Ma Trận Giải Quyết Dứt Điểm 5 Bài Toán Của Đơn Vị Quản Lý Nền Tảng (Platform Operator Solutions Matrix)
1. **Rổ hàng bị "thiu" & Chi phí kiểm định giỏ hàng (Inventory Desync & Verification Cost):**
   * *Mô hình Ký gửi Quản lý Độc quyền (Exclusive Rental Mandate):* Chủ nhà ủy quyền cho VinStay AI toàn quyền quản lý, kiểm soát mã khóa/chìa cơ và điều phối lịch xem phòng. Rổ hàng sạch 100%, không bị tình trạng môi giới ngoài cho thuê mất.
   * *Chi phí kiểm định = 0:* Field Host thẩm định và chụp ảnh 10 hạng mục nội thất đúng 1 lần duy nhất khi tiếp nhận độc quyền.
   * *Điều khoản Thoát Linh hoạt (15-Day Vacant Exit Clause):* Chủ nhà có quyền hủy ủy quyền khi ngưng cho thuê hoặc tự cho thuê với 2 điều kiện bắt buộc: **(1) Thông báo trước tối thiểu 15 ngày** và **(2) Căn hộ đang ở trạng thái trống (Vacant)**, đảm bảo tính công bằng và tạo sự an tâm tuyệt đối cho chủ nhà khi ký độc quyền.
2. **Nguy cơ bị "cắt cầu" giao dịch & Thất thoát nguồn thu (Platform Leakage / Disintermediation):**
   * *Ràng buộc pháp lý từ Hợp đồng Quản lý Độc quyền:* Điều khoản cam kết mọi giao dịch thuê trong thời hạn ủy quyền phải thực hiện qua VinStay AI.
   * *Mã hóa liên lạc 2 chiều & VietQR cọc tại sảnh:* Ẩn SĐT cá nhân; cọc 2 triệu chuyển vào tài khoản định danh nền tảng để khóa căn `holding` 24h và tự động sinh Thỏa thuận cọc số.
   * *Ràng buộc quyền lợi Hộ chiếu bàn giao số:* Quyền lợi sử dụng bộ ảnh đối soát 10 hạng mục nội thất chỉ áp dụng cho giao dịch hợp lệ trên nền tảng, loại bỏ 100% động cơ ký ngoài.
3. **Bẫy chi phí cố định (Fixed OpEx Trap) & Tối ưu hóa dòng tiền:**
   * *Mô hình Vận hành Siêu tinh gọn (Ultra Asset-Light):* 100% Field Host hoạt động theo cơ chế biến phí (Ticket Fee + Hoa hồng chốt cọc) cấu hình linh hoạt từ Admin Portal; nền tảng không gánh nặng lương cứng.
   * *Không ôm bộ máy bảo trì:* Field Host chỉ giới thiệu Danh bạ thợ kỹ thuật ngoài uy tín; khách và thợ tự thỏa thuận, nền tảng zero-liability về sửa chữa.
   * *Tự động hóa 70% bằng AI:* AI Matchmaker (30s), AI OCR CCCD (5s), Zalo Bot nhắc hẹn kép T-10m, cắt giảm tối đa nhân sự vận hành thủ công.
4. **Tuân thủ pháp lý & Bảo vệ dữ liệu cá nhân (Compliance & Decree 13/2023/NĐ-CP):**
   * *Mã hóa CSDL cấp độ AES-256 & Phân quyền RBAC:* Dữ liệu CCCD gắn chip sau khi OCR được mã hóa ngay; cấm tải ảnh gốc CCCD bừa bãi.
   * *Ký số Thỏa thuận cọc qua OTP chính chủ:* Hợp đồng điện tử có đầy đủ Audit Trail (IP, thời gian, thiết bị), đảm bảo giá trị chứng cứ pháp lý khi có tranh chấp.
5. **Quản trị thông minh & Báo cáo thời gian thực (Admin BI Dashboard & Market Insights):**
   * *Bảng điều khiển BI thời gian thực:* Giám sát phễu chuyển đổi toàn diện, bản đồ nhiệt lấp đầy (Occupancy Heatmap) từng phân khu Sapphire 1 & 2.
   * *Theo dõi hiệu suất Field Host:* Tỷ lệ nhận ticket (SLA 3m), số deal chốt trong tuần, điểm đánh giá sao trung bình.
   * *Công cụ cấu hình biến phí linh hoạt:* Admin chủ động điều chỉnh thù lao ticket, hoa hồng và tạo gói thưởng kích cầu theo mùa vụ/chiến dịch tiếp thị mà không cần sửa code.

---

## 2. Kiến Trúc Phân Hệ & Công Nghệ AI (AI Engine & System Architecture)

```
                       [ Khách thuê trên Web App ]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ 1. Bộ Lọc All-in Cost ]                 [ 2. AI Matchmaker Engine ]
   • Tính tổng phí hàng tháng                • Lọc hard: All-in Cost <= Budget
   • Hiển thị Badge "Căn hời"                • Trả kết quả Top 3 căn trong 30s
              │
              ▼
   [ 3. Modal Đặt Lịch & Xác Thực OTP ]
   • Khách chọn slot giờ khớp ca trực Field Host
   • Bắt buộc xác thực SĐT qua OTP (Zalo/SMS)
   • Kích hoạt quy trình nhắc hẹn kép T-10m
              │
              ▼
   [ 4. AI Dispatcher & Dashboard Field Host ]
   • Phân bổ ticket cho Field Host gần nhất (SLA 3m)
   • Báo Host xuống sảnh trước 10 phút; Khách bấm Zalo 1-chạm
   • Host quẹt thẻ thang máy dẫn lên phòng -> Bấm nhận mã mở cửa trên app
              │
              ▼
   [ 5. Chốt Cọc 24h & AI OCR CCCD ]
   • Khách ưng ý -> Sinh mã VietQR động cọc 2.000.000 VNĐ
   • Webhook xác nhận -> Chuyển căn sang 'holding' (khóa 24h)
   • AI OCR bóc tách CCCD 2 mặt -> Tự động điền Thỏa thuận cọc điện tử
   • Ký xác nhận OTP qua Zalo/SMS
              │
              ▼
   [ 6. AI Conflict Resolver (Xử lý Căn HOT & Double Booking) ]
   • Gắn nhãn 🔥 HOT khi căn có >= 3 lịch xem/24h
   • Khi căn có cọc: Tự động hủy các lịch xem sau
   • Bot Zalo gửi tin xin lỗi + gợi ý ngay 2 căn tương đương
```

---

## 3. Quy Trình Vận Hành Chi Tiết (End-to-End Operational Workflow)

### 3.1. Giai đoạn 1: Tìm Căn & Khớp Nhu Cầu (All-in Cost & Matchmaker)
* **Bảng tính All-in Cost thời gian thực:**
  $$\text{All-in Cost} = \text{base\_rent\_price} + \text{management\_fee} + \text{parking\_fee\_estimate} + \text{utility\_cost\_estimate}$$
  * *Phí quản lý:* Tính theo diện tích thông thủy ($\text{Diện tích} \times 9.500\text{ đ/m}^2$).
  * *Phí gửi xe:* Định mức mặc định ($150.000\text{ đ/xe máy}$, $1.250.000\text{ đ/ô tô}$).
  * *Ước tính điện nước:* Theo số nhân khẩu ($300.000\text{ đ/người/tháng}$).
* **Tiêu chí "Căn hời phân khu":** Hệ thống so sánh $\text{base\_rent\_price}$ với $\text{market\_avg\_price}$ của tòa nhà. Nếu thấp hơn $\ge 10\%$, căn hộ được tự động gắn nhãn nổi bật `[Căn hời phân khu - Tiết kiệm X%]`.

### 3.2. Giai đoạn 2: Đặt Lịch & Điều Phối Field Host Hiện Trường
1. Khách chọn khung giờ xem phòng khả dụng (khớp ca trực phân khu: 08:30 - 11:30 hoặc 14:00 - 18:00).
2. Khách xác thực số điện thoại qua OTP 4 số gửi qua Zalo/SMS.
3. Hệ thống tạo mã tham chiếu lịch hẹn `booking_ref_code` gửi vào Zalo của khách kèm vị trí Google Maps sảnh tòa và thông tin Field Host tiếp đón.
4. **Cơ chế phân bổ Field Host & Nhắc hẹn kép T-10m:**
   * Hệ thống tự động bắn ticket vào Dashboard của Field Host phụ trách Block/Tòa đó (SLA 3 phút nhận việc, sau 3 phút chuyển Open Pool 500m).
   * **Mốc T-10 phút:** Hệ thống tự động gửi Push Notification + rung chuông nhắc Host di chuyển xuống sảnh đón khách; đồng thời Zalo Bot gửi tin nhắn nhắc giờ cho khách kèm nút 1-chạm `[Tôi đã có mặt tại sảnh]`.

### 3.3. Giai đoạn 3: Đón Tiếp & Khảo Sát Hiện Trường
1. **Tiếp đón tại sảnh:** Khi khách bước vào sảnh bấm nút Zalo `[Tôi đã có mặt tại sảnh]`, App của Host rung báo để Host tiến lại chào đón. Host bấm `[Bắt đầu tiếp đón]` trên app ghi nhận giờ đón.
2. **Lên căn hộ:** Field Host sử dụng thẻ cư dân thang máy hợp lệ tại phân khu để quẹt cửa an ninh sảnh và quẹt tầng thang máy, đưa khách lên phòng đúng giờ và chuyên nghiệp.
3. **Mở cửa căn hộ (Cơ chế Tinh gọn MVP):**
   * *Với căn dùng khóa thông minh (có mã số):* Host dẫn khách tới trước cửa phòng $\rightarrow$ Bấm nút **`[Xác nhận xem phòng]`** trên app $\rightarrow$ Hệ thống gửi mã mở cửa về điện thoại của Host để bấm mở khóa (đồng thời gửi thông báo Zalo cho chủ nhà ghi nhận lịch sử mở cửa). Tuyệt đối không dùng Lockbox treo cửa vi phạm BQL.
   * *Với căn dùng chìa khóa cơ:* Host nhận và sử dụng chìa khóa cơ do nhân sự quản lý thực địa / quầy phân khu The Sapphire quản lý.

### 3.4. Giai đoạn 4: Chốt Cọc Giữ Chỗ 24h & Ký Thỏa Thuận Điện Tử
1. Khách xem xong và đồng ý giữ chỗ: Field Host bấm **[Khách Chốt]** trên Mobile App.
2. Web App sinh ngay mã **VietQR động** với số tiền cọc quy định **2.000.000 VNĐ**, nội dung chuyển khoản: `COC [Mã căn] [SĐT khách]`.
3. Khi tiền về tài khoản định danh, Webhook kích hoạt:
   * Chuyển trạng thái căn sang `holding` (khóa căn trong 24h trên toàn hệ thống).
   * Kích hoạt quy trình hủy các lịch xem còn lại của căn này (xem mục 3.5).
4. **AI OCR CCCD & Ký thỏa thuận:**
   * Khách chụp 2 mặt ảnh CCCD tải lên Web App.
   * AI Vision trích xuất các trường: Họ tên, Số CCCD, Ngày cấp, Nơi thường trú trong $\le 5$ giây.
   * Tự động điền thông tin vào **Thỏa thuận Đặt cọc Giữ chỗ Căn hộ (24h)**.
   * Khách xác thực ký điện tử bằng mã OTP gửi về Zalo/SMS.
5. **Chuyển đổi thành Tiền Cọc Bảo Đảm Nội Thất (Security Deposit):**
   * Khi ký Hợp đồng thuê chính thức trong vòng 24 giờ, khoản 2.000.000 VNĐ này được chuyển đổi 100% thành một phần của **Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)** của Hợp đồng.
   * Khoản tiền cọc này được giữ nguyên vẹn suốt thời hạn thuê làm tài sản bảo chứng niềm tin, ràng buộc trách nhiệm giữ gìn nội thất của khách thuê; và được hoàn trả lại 100% khi thanh lý hợp đồng sau khi đối soát hiện trạng.

### 3.5. Giai đoạn 5: Cơ Chế Xử Lý Căn HOT & Double Booking (Giải quyết triệt để xung đột)
* **Gắn cờ Căn HOT:** Nếu 1 căn hộ ghi nhận $\ge 3$ lịch hẹn xem trong vòng 24 giờ tới, hệ thống tự động cập nhật cờ `is_hot = TRUE` và hiển thị badge **🔥 CĂN HOT - Nhiều người đang xem** trên giao diện tìm kiếm.
* **Xử lý khi có khách cọc trước:**
  * Giả sử khách A, B, C cùng đặt xem căn hộ S1.02-12A08. Khách B xem lúc 10h và bấm chốt cọc thành công lúc 10h20.
  * Ngay lập tức, hệ thống tự động hủy lịch xem lúc 14h của khách C.
  * Zalo Bot tự động gửi tin nhắn cho khách C:
    > *"VinStay AI xin thông báo: Căn hộ S1.02-12A08 bạn vừa đặt lịch vừa được một khách thuê khác hoàn tất cọc giữ chỗ 24h. Để không làm mất thời gian của bạn, VinStay AI đã tìm thấy 2 căn hộ tương đương về layout và ngân sách trong cùng phân khu. Bấm vào link dưới đây để đổi lịch xem miễn phí ngay lập tức!"*
  * Đi kèm link xem 2 căn hộ khả dụng tương đương (cùng layout, ngân sách chênh lệch không quá 5%).

### 3.6. Giai đoạn 6: Nhận Nhà, Hộ Chiếu Bàn Giao Số & Danh Bạ Thợ Kỹ Thuật (Post-Move & Asset-Light Referral)
1. **Hộ chiếu bàn giao số (Digital Handover Passport):**
   * Tại thời điểm nhận nhà, Field Host và Khách cùng chụp ảnh kiểm kê 10 hạng mục nội thất (tường, sàn, sofa, nệm, điều hòa, tủ lạnh, bếp...) nhúng timestamp bảo mật.
   * Khi trả phòng, hai bên mở app đối soát; mọi hao mòn tự nhiên theo thời gian tuyệt đối không được trừ vào tiền cọc bảo đảm của khách; hư hại do lỗi sử dụng sẽ đối soát trừ cọc minh bạch.
2. **Danh bạ Thợ Kỹ thuật Ngoài & Cơ chế Vận hành Tinh gọn (Asset-Light Handyman Directory):**
   * Trong quá trình ở, nếu phát sinh hỏng hóc trang thiết bị do khách sử dụng, Field Host/Sale chỉ cung cấp danh bạ các đội thợ kỹ thuật ngoài uy tín tại nội khu Ocean Park (điện nước, điện lạnh, khóa cửa, sofa...).
   * Khách thuê và phía kỹ thuật ngoài tự thỏa thuận phương án xử lý, giá cả và chịu trách nhiệm trực tiếp với nhau.
   * VinStay AI duy trì mô hình vận hành tinh gọn (Asset-Light), không ôm khâu điều phối và không chịu trách nhiệm kỹ thuật sửa chữa để tránh phình to chi phí vận hành và rủi ro tranh chấp.

---

## 4. Ma Trận Phân Định Trách Nhiệm (RACI)

| Tác vụ | AI Engine | Field Host (Sale nội khu) | Khách thuê (Tenant) | Chủ nhà (Landlord) |
| :--- | :---: | :---: | :---: | :---: |
| Trả lời giá, All-in Cost, layout | **R** (Responsible) | **I** (Informed) | **A** (Accountable) | **I** (Informed) |
| Khớp căn thông minh (Matchmaker) | **R** | **I** | **A** | **I** |
| Đặt lịch & Xác thực OTP | **R** | **I** | **R** | **I** |
| Đón sảnh, quẹt thang máy, mở phòng | **I** | **R** | **C** (Consulted) | **I** |
| Sinh mã VietQR cọc 2 triệu | **R** | **A** | **R** (Thanh toán) | **I** |
| Khóa căn 24h & Hủy lịch trùng | **R** | **I** | **I** | **I** |
| Bóc tách CCCD & Điền Thỏa thuận cọc | **R** | **S** (Support) | **R** (Upload & Ký OTP) | **I** |

---

## 5. Cấu Trúc Dữ Liệu Cốt Lõi (Database Schema)

Thiết kế trên PostgreSQL / Supabase gồm 4 bảng quan hệ chuẩn:

### Bảng 1: `field_hosts` (Nhân sự hiện trường / Sale nội khu)
* `id` (UUID, PK): Mã định danh Host.
* `full_name` (VARCHAR(100)): Họ tên nhân sự.
* `phone` (VARCHAR(15), UNIQUE): Số điện thoại đăng nhập.
* `assigned_block` (VARCHAR(50)): Phân khu/tòa phụ trách (vd: `The Sapphire 1 - S1.01 đến S1.06`).
* `rfid_card_number` (VARCHAR(50)): Mã thẻ cư dân quản lý.
* `status` (VARCHAR(20)): `active`, `busy`, `off_duty`.
* `rating` (DECIMAL(3,2)): Đánh giá chất lượng phục vụ (1.00 - 5.00).

### Bảng 2: `units` (Danh mục căn hộ kiểm định)
* `id` (UUID, PK): Mã định danh căn hộ.
* `unit_code` (VARCHAR(50), UNIQUE): Mã căn thực tế (vd: `VHOP-S1.02-12A08`).
* `block_name` (VARCHAR(20)): Tên tòa nhà (vd: `S1.02`).
* `layout_type` (VARCHAR(20)): `Studio`, `1PN+`, `2PN_1WC`, `2PN_2WC`, `3PN`.
* `base_rent_price` (DECIMAL(12,2)): Giá thuê niêm yết hàng tháng.
* `management_fee` (DECIMAL(12,2)): Phí quản lý Vinhomes.
* `parking_fee_estimate` (DECIMAL(12,2)): Dự toán phí xe (mặc định 150k/xe máy).
* `utility_cost_estimate` (DECIMAL(12,2)): Dự toán điện nước theo nhân khẩu.
* `market_avg_price` (DECIMAL(12,2)): Giá tham chiếu tòa nhà để tính căn hời.
* `door_access_code` (VARCHAR(50), Nullable): Mật mã khóa số điện tử do chủ nhà cập nhật (hoặc 'PHYSICAL_KEY' nếu dùng chìa cơ do nhân sự phân khu giữ).
* `verified_images` (JSONB): Danh sách link ảnh thực tế kèm timestamp kiểm định.
* `status` (VARCHAR(20)): `available`, `holding`, `rented`.
* `is_hot` (BOOLEAN, Default: FALSE): Cờ báo căn đang có nhiều lịch xem.
* `landlord_phone` (VARCHAR(15)): Số điện thoại chủ nhà.

### Bảng 3: `viewings` (Lịch hẹn xem phòng thực địa)
* `id` (UUID, PK): Mã định danh lịch hẹn.
* `unit_id` (UUID, FK $\rightarrow$ `units.id`): Căn hộ xem.
* `host_id` (UUID, FK $\rightarrow$ `field_hosts.id`, Nullable): Field Host phụ trách.
* `tenant_name` (VARCHAR(100)): Họ tên khách thuê.
* `tenant_phone` (VARCHAR(15)): SĐT khách đã qua xác thực OTP.
* `viewing_slot` (TIMESTAMP): Khung giờ hẹn xem phòng.
* `booking_ref_code` (VARCHAR(100), UNIQUE): Mã tham chiếu lịch hẹn để kích hoạt tin nhắn Zalo tương tác T-10m.
* `status` (VARCHAR(20)): `pending`, `confirmed`, `completed`, `no_show`, `cancelled`.
* `cancel_reason` (VARCHAR(255), Nullable): Lý do hủy (vd: `auto_cancelled_due_to_deposit`).

### Bảng 4: `holding_deposits` (Thỏa thuận cọc giữ chỗ 24h)
* `id` (UUID, PK): Mã định danh thỏa thuận cọc.
* `viewing_id` (UUID, FK $\rightarrow$ `viewings.id`): Liên kết lịch hẹn tương ứng.
* `unit_id` (UUID, FK $\rightarrow$ `units.id`): Căn hộ được cọc.
* `tenant_id_card_data` (JSONB): Thông tin OCR bóc tách (họ tên, CCCD, ngày cấp, nơi thường trú).
* `deposit_amount` (DECIMAL(12,2)): Số tiền cọc quy định (Mặc định: 2.000.000 VNĐ).
* `vietqr_payment_code` (VARCHAR(100)): Mã giao dịch VietQR động.
* `payment_status` (VARCHAR(20)): `pending`, `paid`, `expired`, `refunded`.
* `signed_agreement_url` (VARCHAR(255), Nullable): Link file PDF thỏa thuận cọc.
* `signed_at` (TIMESTAMP, Nullable): Thời điểm khách ký xác thực qua OTP.
* `expires_at` (TIMESTAMP): Hạn chót giữ căn (Đúng 24 giờ kể từ thời điểm thanh toán).

---

## 6. Đặc Tả Yêu Cầu Người Dùng & Tiêu Chí Chấp Nhận (User Stories & AC)

### Module 1: AI Matchmaker & Bảng Tính All-in Cost
* **User Story 1.1:** Là khách tìm thuê, tôi muốn nhập ngân sách tối đa hàng tháng và số người ở để nhận gợi ý 3 căn phù hợp nhất trong 30 giây mà không lo chi phí phát sinh bất ngờ.
  * **AC 1.1.1:** Hệ thống tính đúng tổng $\text{All-in Cost}$ theo công thức chuẩn.
  * **AC 1.1.2:** Loại trừ 100% căn hộ có $\text{All-in Cost} > \text{Ngân sách trần}$.
  * **AC 1.1.3:** Hiển thị tối đa 3 thẻ căn hộ tối ưu nhất; bóc tách đủ 4 khoản chi phí; tự động gắn badge `[Căn hời phân khu]` nếu giá rẻ hơn $\ge 10\%$ so với giá trung bình tòa.

### Module 2: Đặt Lịch Xem Phòng & Điều Phối Field Host
* **User Story 2.1:** Là khách thuê, tôi muốn đặt lịch xem phòng nhanh chóng, xác thực qua OTP và nhận tin nhắn hướng dẫn qua Zalo có nút xác nhận 1-chạm khi tới sảnh.
  * **AC 2.1.1:** Chỉ hiển thị các khung giờ trống khớp ca trực của Field Host.
  * **AC 2.1.2:** Bắt buộc nhập đúng OTP 4 số gửi qua Zalo/SMS mới tạo lịch thành công.
  * **AC 2.1.3:** Tự động gửi Zalo thông báo nhắc hẹn trước 10 phút, gửi tên & SĐT Field Host, link định vị sảnh tòa và nút bấm 1-chạm `[Tôi đã có mặt tại sảnh]`.
* **User Story 2.2:** Là Field Host, tôi muốn nhận thông báo lịch xem trên Mobile Dashboard trước 10 phút để chủ động xuống sảnh đón khách và nhận mã mở cửa phòng trên app.
  * **AC 2.2.1:** Dashboard hiển thị: [Giờ hẹn] - [Tên khách] - [Mã căn] - [Nút: Bắt đầu tiếp đón].
  * **AC 2.2.2:** Khi dẫn khách lên trước cửa phòng, Host bấm [Xác nhận xem phòng] $\rightarrow$ App hiển thị mã khóa điện tử mở cửa (hoặc ghi chú chìa khóa cơ) và gửi thông báo xác nhận mở cửa cho chủ nhà.

### Module 3: Chốt Cọc Giữ Chỗ & Ký Thỏa Thuận Số Hóa
* **User Story 3.1:** Là khách thuê đồng ý giữ phòng, tôi muốn quét mã VietQR cọc 2.000.000 VNĐ để khóa phòng ngay lập tức trong 24 giờ.
  * **AC 3.1.1:** Field Host bấm [Khách chốt] $\rightarrow$ Sinh mã VietQR động với cú pháp `COC [Mã căn] [SĐT khách]`.
  * **AC 3.1.2:** Webhook nhận tiền thành công trong $\le 10$ giây $\rightarrow$ Trạng thái căn chuyển sang `holding`, tự động hủy các lịch hẹn xem sau của căn này.
* **User Story 3.2:** Là khách đã cọc, tôi muốn chụp ảnh CCCD để AI tự động điền Thỏa thuận cọc và ký duyệt qua OTP.
  * **AC 3.2.1:** AI Vision OCR trích xuất 100% chính xác: Họ tên, Số CCCD, Ngày cấp, Nơi thường trú từ 2 mặt ảnh trong $\le 5$ giây.
  * **AC 3.2.2:** Sinh file Thỏa thuận cọc điện tử, khách bấm ký và nhận mã OTP xác nhận hoàn tất giao dịch.

### Module 4: Quản Trị Biến Phí & Vòng Đời Ký Gửi Độc Quyền (Admin Portal)
* **User Story 4.1:** Là Quản trị viên nền tảng (Admin), tôi muốn tùy chỉnh linh hoạt biểu phí dịch vụ dẫn khách, hoa hồng chốt cọc và các gói thưởng nóng cho Field Host trên Admin Portal mà không cần sửa code, để tối ưu chi phí OpEx và kích cầu theo mùa vụ.
  * **AC 4.1.1:** Admin Portal cung cấp giao diện cấu hình trực quan 4 tham số biến phí: Thù lao dẫn khách theo lượt (`base_viewing_fee`), Hoa hồng chốt cọc thành công (`deal_commission`), Hệ số thưởng đánh giá sao (`rating_multiplier`), và Gói thưởng nóng theo chiến dịch (`campaign_bonus`).
  * **AC 4.1.2:** Mọi thay đổi cấu hình có hiệu lực ngay lập tức với các ticket phát sinh mới; lưu vết lịch sử thay đổi (Audit Log: Ai sửa, ngày giờ, giá trị cũ/mới).
  * **AC 4.1.3:** Tự động tính toán tổng thu nhập thực nhận của từng Field Host theo công thức cấu hình và xuất bảng kê thanh toán (Payout Report) hàng tuần.
* **User Story 4.2:** Là Quản trị viên và Chủ nhà, tôi muốn theo dõi trạng thái Hợp đồng Ký gửi Độc quyền và kích hoạt quy trình thoát ủy quyền 15 ngày khi cần, nhằm bảo đảm rổ hàng luôn tươi mới 100% và tôn trọng quyền tự chủ của Chủ nhà.
  * **AC 4.2.1:** Chủ nhà có thể gửi yêu cầu ngưng ủy quyền trên portal; hệ thống kiểm tra điều kiện tiên quyết: (1) Căn hộ đang ở trạng thái nhà trống `available` (không có cọc `holding` hay hợp đồng thuê đang hiệu lực), và (2) Cam kết báo trước đủ 15 ngày.
  * **AC 4.2.2:** Khi thỏa mãn điều kiện, hệ thống kích hoạt đồng hồ đếm ngược 15 ngày (`mandate_termination_countdown`), đồng thời gửi thông báo xác nhận tới Admin và Chủ nhà. Trong thời gian này, căn hộ vẫn hiển thị để khai thác nốt các khách tiềm năng sẵn có trừ khi Chủ nhà chủ động đóng lịch.
  * **AC 4.2.3:** Hết 15 ngày đếm ngược, trạng thái căn hộ tự động chuyển sang `unlisted`, thu hồi quyền truy cập mã cửa/chìa cơ của mạng lưới Field Host và hoàn tất thanh lý ký gửi độc quyền.
* **User Story 4.3:** Là Quản trị viên, tôi muốn theo dõi Bảng điều khiển BI (Business Intelligence) thời gian thực về phễu chuyển đổi, SLA tiếp nhận của Field Host và phân bổ rổ hàng để kịp thời điều phối nguồn lực vận hành.
  * **AC 4.3.1:** Biểu đồ phễu chuyển đổi thời gian thực 6 giai đoạn: Lượt xem web $\rightarrow$ Chat AI Matchmaker $\rightarrow$ Đặt lịch xem phòng $\rightarrow$ Check-in sảnh $\rightarrow$ Quét VietQR cọc $\rightarrow$ Ký Thỏa thuận số.
  * **AC 4.3.2:** Báo cáo SLA tiếp nhận ticket xem phòng của Field Host (mục tiêu $\le 3$ phút); cảnh báo đỏ các ca xem phòng có nguy cơ trễ hẹn hoặc không có Host nhận.
  * **AC 4.3.3:** Bản đồ nhiệt (Heatmap) tỷ lệ lấp đầy theo từng phân khu (Sapphire 1, Sapphire 2, Pavilion, Zenpark...) giúp định hướng các chiến dịch kích cầu căn hộ trống lâu ngày.

---

## 7. Quy Trình Xử Lý Kịch Bản Ngoại Lệ (Edge Cases & Fallback)

| Kịch bản ngoại lệ | Rủi ro phát sinh | Cơ chế xử lý tự động (Fallback Logic) |
| :--- | :--- | :--- |
| **Khách trễ hẹn quá 15 phút (No-show)** | Lãng phí ca trực của Field Host, gián đoạn lịch căn hộ và làm giảm hiệu suất mạng lưới điều phối. | Quá 15 phút sau giờ hẹn mà khách không bấm nút `[Tôi đã có mặt tại sảnh]` trên Zalo, hệ thống tự động kích hoạt Bot gửi tin nhắn tương tác: `[Gia hạn 15 phút]` hoặc `[Hủy lịch hẹn]`. Nếu sau 5 phút khách không phản hồi, ca trực tự động giải phóng (`cancelled_no_show`) để Host nhận khách khác, đồng thời gắn cờ uy tín SĐT khách thuê. |
| **Xung đột căn (Double Booking khi có cọc)** | Căn hộ được khách trước quét VietQR cọc `holding` trước giờ hẹn của lượt xem sau. | Kích hoạt Trigger hủy tự động; Zalo Bot lập tức gửi thông báo xin lỗi kèm gợi ý 3 căn có All-in Cost tương đương cùng phân khu và link chọn lại lịch 1-chạm (không cần xác thực lại OTP). |
| **Lỗi mã khóa điện tử / Thất lạc chìa cơ tại cửa** | Khách và Field Host đã lên tới trước cửa nhưng không mở được cửa phòng, gây bức xúc và mất uy tín. | Field Host bấm nút `[Hỗ trợ khẩn cấp]` trên app:<br>• **Với khóa điện tử:** Kích hoạt cuộc gọi thoại bảo mật (Masked Call) kết nối trực tiếp Host tới Chủ nhà để xin mã khẩn cấp hoặc mở từ xa.<br>• **Với chìa khóa cơ:** Hệ thống tự động báo Area Lead phân khu mang chìa khóa cơ sơ cua tới hỗ trợ tại chỗ trong vòng $\le 5$ phút. |
| **Chủ nhà yêu cầu hủy ủy quyền khi đang có cọc / lịch xem** | Xung đột quyền lợi giữa Chủ nhà, Nền tảng và Khách thuê đang đặt cọc hoặc đang trên đường tới xem phòng. | • **Nếu căn đang có cọc `holding` (2 triệu):** Hệ thống từ chối hủy ủy quyền, yêu cầu giữ nguyên trạng thái cho tới khi hết 24h giữ chỗ hoặc ký HĐ chính thức.<br>• **Nếu căn đang có lịch xem trong ngày:** Hệ thống yêu cầu Host hoàn tất các ca xem phòng đã hẹn, sau đó mới kích hoạt đồng hồ đếm ngược 15 ngày thoát ủy quyền (`mandate_termination_countdown`). |
| **Ảnh chụp CCCD bị mờ / lóa sáng / nghiêng góc** | AI OCR bóc tách sai lệch thông tin pháp lý trên Thỏa thuận cọc điện tử. | Nếu độ tin cậy AI OCR $< 85\%$, app tự động chuyển sang form điền tay với các trường nghi ngờ tô viền đỏ nổi bật (Họ tên, CCCD, Ngày cấp), cho phép Host và khách đối chiếu trực tiếp thẻ cứng để sửa nhanh trước khi ký OTP. |
| **Webhook ngân hàng bị trễ (VietQR đã chuyển nhưng chưa nảy trạng thái)** | Khách đã bị trừ tiền nhưng trạng thái căn chưa chuyển sang `holding`, nguy cơ bị khách khác cọc mất căn. | Mobile Dashboard của Field Host có nút `[Xác nhận đã thấy UNC]`. Host chụp ảnh biên lai giao dịch thành công của khách tải lên app; hệ thống tạm khóa căn (`temporary_holding`) trong 30 phút để kiểm tra thủ công, bảo vệ quyền lợi khách thuê. |

---

## 8. Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)
* **Hiệu năng (Latency):**
  * AI Matchmaker lọc căn và trả kết quả: $\le 3$ giây.
  * AI OCR CCCD bóc tách thông tin và sinh thỏa thuận: $\le 5$ giây.
  * Webhook gạch nợ VietQR và cập nhật trạng thái phòng: $\le 5$ giây.
* **Bảo mật & Tuân thủ Pháp lý:**
  * Tuân thủ nghiêm ngặt **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân: Mọi hình ảnh CCCD chỉ dùng mục đích xác thực giao dịch, được mã hóa AES-256 trong Database và có hộp kiểm chấp thuận (Consent) của khách hàng trước khi tải lên.
* **Khả năng tương thích:**
  * 100% Mobile Responsive trên Safari (iOS) và Chrome (Android) dành cho màn hình của Khách thuê và Field Host.

---

## 9. Các Chỉ Số Thành Công Cốt Lõi & Mục Tiêu OKR (Key Success Metrics & OKRs)

Hệ thống chỉ số thành công của VinStay AI được xây dựng theo khung quản trị mục tiêu **OKRs (Objectives & Key Results)**, đối soát trực tiếp vào bài toán kinh tế thực tế của Chủ nhà, trải nghiệm không ma sát của Khách thuê và mô hình vận hành tinh gọn Asset-Light của Nền tảng.

### 9.1 Bảng Mục Tiêu OKR Đo Lường Thành Công

#### Objective 1 (Chủ nhà): Triệt tiêu rủi ro trống phòng kép, tự động hóa 100% khâu tiếp đón từ xa và xóa bỏ tranh chấp tài sản.
* **KR 1.1 (Pre-leasing Vacancy):** Rút ngắn chu kỳ tìm khách thuê mới giữa 2 hợp đồng từ trung bình **15–30 ngày xuống dưới 7 ngày** (giảm $\ge 75\%$ thời gian phòng trống nhờ AI Matchmaker và thuật toán Dynamic Deal gắn huy hiệu "Căn hời phân khu").
* **KR 1.2 (Distance & Remote Landlord):** Đạt **100% Chủ nhà "ở nhà hoàn toàn"** (0 km di chuyển, 0 phút tiếp khách/mở cửa) nhờ mạng lưới Field Host nội khu quẹt thẻ thang máy và cấp mã cửa điện tử qua app khi xác nhận xem phòng.
* **KR 1.3 (Zero Deposit Dispute):** **100% căn hộ cho thuê được thiết lập Hộ chiếu bàn giao số (Digital Handover Passport)** 10 hạng mục nội thất có timestamp, kéo giảm tỷ lệ tranh chấp trừ tiền cọc khi trả phòng về **0%**.
* **KR 1.4 (Zero Bad Debt):** Đạt **100% đối soát sạch hóa đơn tiền điện EVN, nước sinh hoạt và phí gửi xe** trước khi thanh lý cọc, không để phát sinh nợ đọng dịch vụ cho chủ hộ.

#### Objective 2 (Khách thuê): Minh bạch hóa toàn diện chi phí, trải nghiệm xem phòng không ma sát và bảo đảm an toàn tiền cọc.
* **KR 2.1 (Listing Truth):** **100% Listing Verified** định danh chuẩn [Tòa-Tầng-Căn] kèm ảnh thực tế có timestamp; tỷ lệ tin ảo hoặc lệch hiện trạng bàn giao = **0%**.
* **KR 2.2 (No Hidden Cost):** **Độ lệch giữa All-in Cost dự toán và chi phí thực tế phát sinh = 0%** (khách không chịu bất kỳ phụ phí ẩn nào ngoài bảng tính All-in đã công khai).
* **KR 2.3 (Viewing Efficiency & No-show):** Giảm thời gian đưa khách từ sảnh lên phòng xuống **$\le 60$ giây**; giảm tỷ lệ khách bỏ bom (No-show) xuống **$\le 5\%$** nhờ xác thực OTP bắt buộc và quy trình nhắc hẹn kép T-10m.
* **KR 2.4 (Fast & Secure Escrow):** Tốc độ khóa phòng giữ chỗ qua VietQR động **$\le 10$ giây**; AI OCR bóc tách CCCD gắn chip và sinh Thỏa thuận cọc điện tử **$\le 5$ giây** với độ chính xác **$\ge 95\%$**.

#### Objective 3 (Nền tảng & Vận hành): Vận hành tinh gọn Asset-Light, triệt tiêu rò rỉ giao dịch và tối ưu hiệu suất điều phối.
* **KR 3.1 (Zero Disintermediation):** **Tỷ lệ cắt cầu giao dịch ngoài nền tảng (Platform Leakage) = 0%** nhờ ràng buộc Hợp đồng Ký gửi Độc quyền (thoát ủy quyền 15 ngày kèm nhà trống) và gạch nợ tự động cọc giữ chỗ 2 triệu qua VietQR định danh nền tảng.
* **KR 3.2 (Dispatch SLA):** **100% ticket xem phòng được tiếp nhận trong vòng $\le 3$ phút** qua thuật toán Auto-Dispatch 3 tầng; tỷ lệ Field Host hoàn thành ca xem phòng đúng giờ đạt **$\ge 95\%$**.
* **KR 3.3 (Asset-Light Hardware & Zero OpEx Trap):** **Chi phí đầu tư phần cứng (Hardware CapEx) = 0 VNĐ** (tận dụng thẻ thang máy sẵn có của Field Host, mã khóa điện tử sẵn có hoặc chìa cơ phân khu; không lắp hộp lockbox, không can thiệp IoT khóa thông minh); 100% thù lao dẫn khách và hoa hồng chốt cọc là **biến phí linh hoạt** được cấu hình và kiểm soát theo thời gian thực trên Admin Portal.
* **KR 3.4 (Asset-Light Maintenance):** **100% sự cố hỏng hóc phát sinh được xử lý qua Danh bạ Kỹ thuật ngoài uy tín**; VinStay AI và Field Host giữ vai trò giới thiệu tinh gọn, không ôm bộ máy sửa chữa cồng kềnh, không chịu rủi ro pháp lý hay gánh nặng lương thợ cố định.

---

### 9.2 Bảng Đối Soát Chỉ Số Trước & Sau Khi Ứng Dụng VinStay AI (Scorecard Matrix)

| Chỉ số đo lường (KPI) | Hiện trạng truyền thống | Mục tiêu VinStay AI (MVP Pilot) | Nguồn dữ liệu kiểm chứng |
| :--- | :--- | :--- | :--- |
| **Thời gian lấp đầy phòng trống** | 15 – 30 ngày (mất 6–12 triệu/tháng) | **$\le 7$ ngày** (tiết kiệm $\ge 70\%$ chi phí trống) | Hệ thống Booking & Webhook VietQR `holding` |
| **Thời gian chủ nhà bỏ ra mở cửa** | 20 – 30km đi lại (1–2h/lượt hẹn) | **0 phút / 0 km** (Chủ nhà ở nhà 100%) | Log kích hoạt mã cửa trên Mobile Host |
| **Tỷ lệ tin ảo / lệch hiện trạng** | 60% – 70% trên mạng xã hội | **0%** (100% ảnh thật, mã căn chuẩn) | Báo cáo thẩm định Listing tiếp nhận |
| **Tỷ lệ khách bỏ bom (No-show)** | 25% – 35% tổng số ca hẹn | **$\le 5\%$** | Lịch sử Check-in sảnh T-10m trên Dashboard Host |
| **Thời gian khớp căn tối ưu** | 7 – 14 ngày chat hỏi nhiều môi giới | **$\le 30$ giây** (Top 3 căn All-in Cost chuẩn) | Log truy vấn AI Matchmaker API |
| **Tỷ lệ tranh chấp cọc & nội thất** | 40% – 50% khi trả phòng | **0%** (Đối soát 10 hạng mục Digital Passport) | Hồ sơ Hộ chiếu bàn giao số lúc thanh lý |
| **SLA tiếp nhận dẫn khách của Host** | Không xác định / Chậm 15–30 phút | **$\le 3$ phút** (Auto-dispatch 3 tầng) | Hệ thống quản trị Ticket Host Dispatch |
| **Chi phí phần cứng lắp đặt thêm** | 500k – 2 triệu/căn (Lockbox, IoT) | **0 VNĐ** (Thẻ cư dân & mã số/chìa cơ có sẵn) | Báo cáo tài chính & Bảng cân đối CapEx |
| **Tỷ lệ cắt cầu ngoài nền tảng** | 30% – 40% số giao dịch | **0%** | Audit HĐ Ký gửi Độc quyền & VietQR Escrow |

