# QUY CHẾ QUẢN LÝ THÙ LAO BIẾN PHÍ, HOA HỒNG ĐÓNG DEAL & GÓI THƯỞNG NÓNG KÍCH CẦU
### (DYNAMIC COMMISSION, DEAL INCENTIVE & PERFORMANCE BONUS POLICY)
*Mã văn bản: VINSTAY-LEGAL-FH-02*  
*Căn cứ áp dụng: Bộ luật Dân sự 2015 (Điều 513-521 - Hợp đồng dịch vụ), Luật Thương mại 2005 (Thù lao dịch vụ và hoa hồng đại lý), Luật Thuế Thu nhập cá nhân và Luật Giao dịch Điện tử 2023.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ THỰC THI
Văn bản này quy định chi tiết cơ chế phân bổ thu nhập, công thức tính toán thù lao lượt dẫn, tỷ lệ hoa hồng chốt cọc và các gói thưởng nóng kích cầu dành cho **Đối tác Tiếp đón Thực địa (Field Host)** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**. 

Quy chế được thiết kế nhằm hiện thực hóa mục tiêu kép: **Tạo thu nhập linh hoạt, hấp dẫn, công bằng theo năng lực thực tế cho Field Host**, đồng thời duy trì mô hình **Biến phí 100% (Dynamic Commission Engine)** giúp VinStay AI thoát khỏi bẫy chi phí vận hành cố định (Fixed OpEx Trap) trong mùa thấp điểm của thị trường bất động sản cho thuê.

---

## ĐIỀU 1. ĐỊNH NGHĨA & CƠ CHẾ ĐIỀU HÀNH THÙ LAO ĐỘNG (ADMIN DYNAMIC ENGINE)
1. **Mô Hình Thu Nhập 3 Tầng (Three-Pillar Earning Engine):** Thu nhập của Field Host trong mỗi kỳ đối soát được cấu thành từ 3 nguồn độc lập:
   $$\text{Tổng Thu Nhập Kỳ} = \sum \text{Thù Lao Lượt Dẫn} + \sum \text{Hoa Hồng Đóng Deal} + \sum \text{Gói Thưởng Nóng \& Chất Lượng}$$

2. **Cơ Chế Cấu Hình Trực Tiếp Toàn Bộ Tham Số Trên Trang Quản Trị (Admin Portal):**
   - Mọi khoản thù lao, tỷ lệ hoa hồng, hệ số thưởng phạt và các gói khuyến khích **được chỉnh sửa và kích hoạt trực tiếp trên giao diện Admin Portal** mà không cần can thiệp vào mã nguồn phần mềm.
   - Quản trị viên (Admin) có toàn quyền chủ động điều chỉnh linh hoạt theo từng giai đoạn thị trường, biến động mùa vụ (mùa nhập học sinh viên, mùa cao điểm/thấp điểm cuối năm) và chiến lược riêng của từng phân khu (Sapphire, Pavilion, Zenpark).

3. **Danh Mục Các Tham Số Kinh Tế Được Cấu Hình Trực Tiếp Trên Trang Admin:**

| Tên Tham Số Trên Admin | Ý Nghĩa Nghiệp Vụ & Phạm Vi Điều Chỉnh | Giá Trị Mặc Định | Cơ Chế Tác Động Thực Tế |
| :--- | :--- | :---: | :--- |
| `base_viewing_fee` | Thù lao cơ sở chi trả cho 01 lượt dẫn xem phòng hoàn tất. | 50.000 – 100.000đ | Tự động cộng vào ví đối tác của Host ngay khi kết thúc phiên xem phòng. |
| `no_show_compensation_pct` | Tỷ lệ bù đắp thù lao khi khách thuê "bỏ bom" (no-show). | 50% | Chi trả tự động khi Host có mặt đúng giờ T-10m và chờ đủ 15 phút. |
| `deal_commission_pct` | Tỷ lệ hoa hồng trích từ phí dịch vụ khi khách ký hợp đồng chính thức. | 20% – 40% | Khóa cứng với mã Host ID dẫn khách (`Attribution Lock`). |
| `rating_multiplier_5star` | Hệ số thưởng thêm khi khách đánh giá trải nghiệm 5 sao. | +10% – +20% | Nhân trực tiếp vào thù lao lượt dẫn của buổi tiếp đón đó. |
| `peak_hour_multiplier` | Hệ số thưởng giờ cao điểm (18h00 - 20h30) và các ngày Thứ 7, Chủ Nhật. | +30% | Tự động kích hoạt theo lịch hệ thống để khuyến khích Host trực sảnh. |
| `slow_inventory_bonus` | Thưởng nóng giải phóng căn hộ trống trên 30 ngày ("Căn tồn"). | 500k – 1.000.000đ | Thưởng nóng tức thì vào kỳ quyết toán khi chốt thành công căn hộ kích cầu. |
| `penalty_late_cancel` | Mức giảm trừ khi Host bỏ hẹn hoặc hủy ticket dưới 30 phút. | 100.000đ | Khấu trừ vào kỳ quyết toán và tạm dừng nhận ticket 24 giờ. |

4. **Quy Chuẩn Minh Bạch Bất Biến & Nhật Ký Kiểm Toán (Immutable Audit Trail):**
   Nhằm bảo đảm tính minh bạch tuyệt đối, loại trừ mọi nguy cơ lạm quyền hoặc thay đổi mờ ám:
   - **Lưu vết kiểm toán bất biến (`fee_configs.audit_log`):** Mỗi lần Quản trị viên bấm nút "Cập nhật" trên Admin Portal, hệ thống tự động ghi lại một bản ghi vĩnh viễn gồm:
     * Định danh Quản trị viên thực hiện (`changed_by`).
     * Dấu thời gian chuẩn xác đến từng giây (`Timestamp`).
     * Giá trị cũ (`old_value`) $\rightarrow$ Giá trị mới (`new_value`).
     * Lý do điều chỉnh bắt buộc (`reason` — ví dụ: *"Kích cầu mùa nhập học sinh viên VinUni"*).
     * Thời điểm bắt đầu có hiệu lực (`effective_from`).
   - **Nguyên tắc "Tuyệt đối không áp dụng hồi tố" (Strict No-Retroactive Policy):**
     * Mọi thay đổi về thù lao và hoa hồng chỉ áp dụng cho các ticket và giao dịch phát sinh **sau thời điểm quyết định mới có hiệu lực**.
     * Toàn bộ các lượt dẫn và giao dịch cọc phát sinh trước thời điểm thay đổi được **bảo lưu 100% theo biểu phí cũ**, bảo vệ quyền lợi chính đáng đã xác lập của Field Host.
   - **Thông báo đa kênh & Công khai trên Mobile App:**
     * Ngay khi có cập nhật biểu phí mới, hệ thống tự động bắn thông báo Push Notification tới 100% Field Host và cập nhật minh bạch tại mục *"Biểu Phí Hiện Hành"* trên Host Mobile PWA.
   - **Phân rã thu nhập thời gian thực (Real-time Transparent Breakdown):**
     * Trong mục Báo cáo thu nhập, Field Host có thể nhấp vào từng khoản tiền để xem chi tiết: *Nhận từ căn hộ nào, lượt dẫn lúc mấy giờ, công thức tính ra sao, kèm đường dẫn tra cứu tới Quyết định biểu phí của Admin*.

---

## ĐIỀU 2. THÙ LAO LƯỢT TIẾP ĐÓN THỰC ĐỊA (BASE VIEWING TICKET FEE)
Field Host được nhận thù lao cho mỗi lượt dẫn khách xem phòng hoàn thành đúng quy chuẩn và đạt tiêu chuẩn chất lượng SLA:

1. **Khung thù lao tiêu chuẩn:**
   - Mức thù lao cơ sở: Từ **50.000 VNĐ đến 100.000 VNĐ / lượt dẫn hoàn tất** (tùy thuộc vào phân khu Sapphire, Pavilion hay Zenpark).
2. **Điều kiện ghi nhận thù lao hoàn tất (SLA Gate):**
   - Có mặt tại sảnh tầng 1 trước giờ hẹn tối thiểu 10 phút (kể từ khi nhận thông báo T-10m).
   - Quẹt thẻ cư dân thang máy dẫn khách lên căn hộ trong vòng 60 giây kể từ khi gặp khách.
   - Thực hiện đầy đủ quy trình mở cửa JIT, giải thích bảng All-in Cost và chụp 01 ảnh xác nhận cửa chính đã khóa chốt an toàn khi rời căn hộ.
3. **Chính sách bảo vệ Host khi khách "bỏ bom" (Tenant No-Show Compensation):**
   - Trường hợp Field Host đã có mặt tại sảnh đúng giờ T-10m, bấm nút xác nhận có mặt nhưng khách thuê không đến (sau khi đã kích hoạt quy trình chờ tối đa 15 phút):
   - Hệ thống vẫn tự động chi trả **50% mức thù lao lượt dẫn** cho Field Host nhằm bù đắp chi phí thời gian và công sức di chuyển của Host.

---

## ĐIỀU 3. HOA HỒNG ĐÓNG DEAL THÀNH CÔNG (DEAL CLOSING COMMISSION)
Đây là khoản thu nhập tạo đòn bẩy tài chính lớn nhất, khuyến khích Host tư vấn tận tâm và hỗ trợ khách thuê chốt cọc nhanh:

1. **Tỷ lệ hoa hồng chốt cọc thành công:**
   - Khi khách thuê quét mã VietQR động chuyển cọc 2.000.000 VNĐ và ký Hợp đồng Thuê căn hộ chính thức:
   - Field Host được hưởng hoa hồng từ **300.000 VNĐ đến 1.000.000 VNĐ / hợp đồng chốt thành công** (tương đương **20% đến 40%** trên tổng phí dịch vụ nền tảng thu được từ giao dịch đó).
2. **Cơ chế Khóa Quyền Lợi Bản Quyền (Attribution Lock):**
   - Ngay khi giao dịch cọc 2.000.000 VNĐ được xác nhận qua Webhook ngân hàng, hệ thống tự động khóa cứng mã Host ID của người dẫn phòng với hồ sơ căn hộ (`holding_deposits.host_id`).
   - Quyền lợi hoa hồng được bảo đảm 100% cho Host trực tiếp dẫn phòng, không bị chia sẻ hay tranh chấp bởi bất kỳ nhân sự nào khác.

---

## ĐIỀU 4. GÓI THƯỞNG NÓNG & HỆ SỐ ĐÁNH GIÁ CHẤT LƯỢNG (RATING & BONUSES)
Nhằm tạo động lực thi đua và nâng cao trải nghiệm dịch vụ khách hàng 5 sao tại Vinhomes Ocean Park:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    BẢNG HỆ SỐ ĐÁNH GIÁ CHẤT LƯỢNG & CÁC GÓI THƯỞNG NÓNG KÍCH CẦU                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. HỆ SỐ ĐÁNH GIÁ SAO (RATING MULTIPLIER):                                                       │
│    • Đánh giá 5.0 Sao từ khách thuê ──> Thưởng thêm +20% Thù lao lượt dẫn (Ticket Fee).         │
│    • Đánh giá 4.0 - 4.9 Sao          ──> Hưởng 100% Thù lao lượt dẫn tiêu chuẩn.                 │
│    • Đánh giá dưới 3.0 Sao (do lỗi)  ──> Khấu trừ 20% Ticket Fee và hạ điểm ưu tiên nhận ticket.  │
│                                                                                                  │
│ 2. THƯỞNG GIỜ VÀNG & CUỐI TUẦN (PEAK HOUR BONUS):                                                │
│    • Lượt dẫn vào khung giờ cao điểm (18h00 - 20h30) và các ngày Thứ Bảy, Chủ Nhật:             │
│      Được tự động nhân hệ số +30% Thù lao lượt dẫn.                                              │
│                                                                                                  │
│ 3. THƯỞNG NÓNG GIẢI PHÓNG CĂN KHÓ (SLOW-MOVING INVENTORY BONUS):                                 │
│    • Các căn hộ có thời gian trống trên 30 ngày được gắn nhãn "Kích Cầu":                        │
│      Host chốt deal thành công được thưởng nóng ngay 500.000 VNĐ - 1.000.000 VNĐ / căn.          │
│                                                                                                  │
│ 4. GIẢI THƯỞNG TOP PERFORMER TUẦN & THÁNG:                                                       │
│    • Top 1 Host có số lượt chốt cọc cao nhất tuần  ──> Thưởng nóng 1.000.000 VNĐ tiền mặt.      │
│    • Top 1 Host xuất sắc nhất tháng               ──> Thưởng nóng 3.000.000 VNĐ tiền mặt.      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 5. CHU KỲ ĐỐI SOÁT & QUYẾT TOÁN THU NHẬP MINH BẠCH (WEEKLY PAYOUT)
1. **Chu kỳ quyết toán hàng tuần (Weekly Payout):**
   - Kỳ làm việc tính từ **00h00 ngày Thứ Hai đến 23h59 ngày Chủ Nhật** hàng tuần.
   - Bảng tổng hợp thu nhập số (**Digital Payout Statement**) được hệ thống tự động xuất trên Host Mobile PWA vào sáng Thứ Hai.
   - Tiền thù lao và hoa hồng được chuyển khoản trực tiếp vào tài khoản ngân hàng của Field Host vào **Thứ Ba hàng tuần**.
2. **Khấu trừ thuế thu nhập cá nhân (TNCN):**
   - VinStay AI thực hiện nghĩa vụ khấu trừ thuế TNCN đối với thu nhập vãng lai theo đúng quy định hiện hành của pháp luật thuế Việt Nam (áp dụng mức khấu trừ 10% đối với các khoản chi trả từ 2.000.000 VNĐ/lần trở lên đối với cá nhân chưa ký cam kết theo mẫu).
   - Hệ thống tự động xuất Chứng từ khấu trừ thuế điện tử cho Host vào cuối năm tài chính.

---

## ĐIỀU 6. CHẾ TÀI GIẢM TRỪ THÙ LAO & XỬ LÝ VI PHẠM KỶ LUẬT
Để bảo đảm tính nghiêm minh và chất lượng dịch vụ đồng đều:
1. **Bỏ hẹn tiếp đón sát giờ (Host No-Show):**
   - Host nhận ticket nhưng không đến hoặc hủy hẹn trong vòng dưới 30 phút trước giờ hẹn: Phạt khấu trừ **100.000 VNĐ** vào kỳ quyết toán gần nhất và tạm khóa quyền nhận ticket trong 24 giờ.
2. **Đến muộn để khách chờ tại sảnh quá 10 phút:**
   - Không được nhận Thù lao lượt dẫn của buổi xem phòng đó và bị ghi nhận 01 điểm vi phạm SLA.
3. **Gian lận định vị GPS (Fake Location / Bấm mở cửa ảo):**
   - Mọi hành vi cố tình sử dụng phần mềm giả lập vị trí GPS để bấm nhận thù lao mà không dẫn khách thực tế sẽ bị **tịch thu 100% thu nhập trong kỳ** và khóa tài khoản đối tác vĩnh viễn.

---

## ĐIỀU 7. HIỆU LỰC ÁP DỤNG
1. Quy chế này có hiệu lực kể từ ngày được công bố trên Ứng dụng VinStay AI và áp dụng cho toàn bộ mạng lưới Field Host đang hoạt động.
2. Field Host xác nhận đồng thuận với quy chế này bằng việc bấm kích hoạt tài khoản và nhận ticket trên ứng dụng.

---
*Văn bản thuộc Hệ thống Pháp lý Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
