# HỆ THỐNG PHÁP LÝ & VẬN HÀNH THỰC ĐỊA DÀNH CHO FIELD HOST
### (FIELD OPERATIONS & HOST SUITE — NHÓM 3)

> **MỤC TIÊU CỐT LÕI CỦA BỘ VĂN BẢN NHÓM 3:**  
> Chuẩn hóa mạng lưới **Đối tác Tiếp đón Thực địa (Field Host)** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)** theo mô hình **Siêu Tinh Gọn (Asset-Light & Lean Operations)**.  
> Bộ văn bản giải quyết triệt để 5 điểm nghẽn vận hành thực tế: Loại bỏ chi phí kiểm định thủ công đắt đỏ; Triệt tiêu 100% nguy cơ cắt cầu giao dịch ngoài sàn; Xóa bỏ nỗi ám ảnh khách bỏ bom (No-Show); Tránh bẫy chi phí cố định OpEx; và Phân bổ điều phối tự động đạt chuẩn SLA dưới 3 phút.

---

## DANH MỤC 6 BƯỚC PHÁP LÝ & QUY CHUẨN VẬN HÀNH FIELD HOST

| Bước | Tên Văn Bản Quy Chuẩn | Mục Tiêu & Cơ Chế Vận Hành Tinh Gọn | Liên Kết Văn Bản |
| :---: | :--- | :--- | :---: |
| **Bước 1** | **Hợp Đồng Đối Tác Tiếp Đón Thực Địa & Cam Kết SLA** *(Field Host Partnership & SLA Agreement)* | • Mô hình đối tác kinh tế độc lập (100% biến phí).<br/>• Thuật toán Auto-Dispatch 3 tầng tiếp nhận ticket dưới 3 phút.<br/>• Quẹt thẻ thang máy thần tốc 60 giây, cấp mã JIT 45 phút.<br/>• Bảo vệ hoa hồng với cơ chế Attribution Lock. | [`08_FIELD_HOST_PARTNERSHIP_AND_VIEWING_PROTOCOL.md`](../08_FIELD_HOST_PARTNERSHIP_AND_VIEWING_PROTOCOL.md) |
| **Bước 2** | **Chính Sách Thù Lao Linh Hoạt, Hoa Hồng & Cơ Chế Thưởng Nóng** *(Dynamic Commission & Incentive Engine)* | • **Cấu hình trực tiếp mọi thông số trên Admin Portal** (`fee_configs`).<br/>• Thù lao lượt dẫn (`base_viewing_fee`) + Hoa hồng chốt cọc (`deal_commission_pct`).<br/>• Thưởng nóng căn hời, nhân hệ số 5 sao, phạt hủy muộn.<br/>• 4 nguyên tắc minh bạch bất biến: Audit Log, không hồi tố, push in-app. | [`02_DYNAMIC_COMMISSION_AND_INCENTIVE_POLICY.md`](./02_DYNAMIC_COMMISSION_AND_INCENTIVE_POLICY.md) |
| **Bước 3** | **Quy Chuẩn Tiếp Đón Sảnh, Thẻ Cư Dân RFID & Kênh Liên Lạc Zalo OA (ZCC)** *(Lean Lobby Reception & Zalo OA / ZCC)* | • Kênh liên lạc chính thống qua **Zalo OA tích vàng "VinStay AI"**.<br/>• Gọi thoại ZCC bảo mật SĐT 100% bằng Zalo UID, đa kênh đồng thời.<br/>• Quẹt thẻ cư dân RFID chính chủ, **tuyệt đối cấm "đi ké" thang máy**.<br/>• Kiểm tra an ninh 1-chạm khi rời phòng (không bắt buộc chụp ảnh).<br/>• Kịch bản tư vấn thuê dài hạn 5 bước: Không ép cọc, tặng Hồ sơ số. | [`03_LOBBY_RECEPTION_AND_RFID_CARD_PROTOCOL.md`](./03_LOBBY_RECEPTION_AND_RFID_CARD_PROTOCOL.md) |
| **Bước 4** | **Quy Trình Nhắc Hẹn Kép T-10m, Xử Lý Trễ Giờ & Bù Thù Lao No-Show** *(Double Reminder & Automated No-Show SOP)* | • Chuỗi nhắc hẹn kép Zalo ZNS T-2h & T-10m với 3 nút bấm 1-chạm.<br/>• Khoảng đệm trễ giờ linh hoạt (Grace Period 30p) không phạt lỗi kẹt xe.<br/>• Nút chuyển giao ticket cho đồng đội trong phân khu nếu bận ca sau.<br/>• Báo vắng tự động qua đối soát Call Log, **bù ngay 50% thù lao chờ**.<br/>• Chế tài khách ảo: Cảnh báo, hạn chế đặt lịch, thu phí cam kết 50k. | [`04_DOUBLE_REMINDER_AND_ANTI_NOSHOW_PROTOCOL.md`](./04_DOUBLE_REMINDER_AND_ANTI_NOSHOW_PROTOCOL.md) |
| **Bước 5** | **Bộ Quy Tắc Ứng Xử 5 Sao, Bảo Mật Thông Tin & Chống Cắt Cầu Giao Dịch** *(5-Star Code of Conduct & Anti-Circumvention)* | • Phong thái "Đại sứ trải nghiệm — Chuyên gia thổ địa" Ocean Park.<br/>• Bảo mật dữ liệu cá nhân khách hàng chuẩn Nghị định 13/2023/NĐ-CP.<br/>• Chế tài chống cắt cầu đa tầng: Tịch thu thu nhập, khóa vĩnh viễn, **phạt bồi thường 01 tháng tiền thuê (tối thiểu 10.000.000 VNĐ)**.<br/>• Thưởng nóng 1 triệu đồng cho khách hàng/chủ nhà tố giác cắt cầu. | [`05_CODE_OF_CONDUCT_AND_NON_CIRCUMVENTION.md`](./05_CODE_OF_CONDUCT_AND_NON_CIRCUMVENTION.md) |
| **Bước 6** | **Quy Trình Nghiệm Thu Hộ Chiếu Số, Báo Cáo Sự Cố 1-Chạm & Đánh Giá Host** *(Digital Handover & Host Scorecard)* | • Phối hợp kiểm định Hộ chiếu bàn giao 10 hạng mục Geofence + Timestamp.<br/>• Chốt chỉ số công tơ điện nước EVN bảo đảm 0% nợ đọng cho Chủ nhà.<br/>• **Bảo trì Asset-Light:** Không làm tổng thầu, đẩy Danh bạ thợ ngoài uy tín.<br/>• Hệ thống SPS đánh giá Host toàn diện (Tỷ lệ chốt căn $\ge 25\%$, Rating 5★).<br/>• Thù lao kiểm định bàn giao riêng biệt (50k - 100k/ca) + Thưởng nóng. | [`06_DIGITAL_HANDOVER_AND_HOST_PERFORMANCE_RATING.md`](./06_DIGITAL_HANDOVER_AND_HOST_PERFORMANCE_RATING.md) |

---

## BẢNG ĐỐI CHIẾU GIẢI PHÁP VỚI 5 ĐIỂM NGHẼN VẬN HÀNH THỰC TẾ

```
┌──────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│     5 ĐIỂM NGHẼN VẬN HÀNH THỰC TẾ            │       GIẢI PHÁP ĐÃ THỂ CHẾ HÓA TRONG NHÓM 3      │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ 1. Rổ hàng bị "thiu" & Chi phí kiểm định cao │ Hợp đồng Ký gửi Độc quyền; Thẩm định 1 lần duy   │
│                                              │ nhất lúc tiếp nhận; Khóa căn 24h qua VietQR.    │
│                                              │                                                 │
│ 2. Nguy cơ bị "cắt cầu" giao dịch ngoài sàn   │ Chế tài bồi thường 01 tháng tiền thuê; Khóa tài │
│                                              │ khoản vĩnh viễn; Thưởng 1 triệu cho người tố giác│
│                                              │                                                 │
│ 3. Nỗi ám ảnh khách "bỏ bom" (No-Show)       │ Nhắc hẹn kép Zalo T-10m; Báo vắng qua Call Log   │
│                                              │ tự động; Bù ngay 50% thù lao chờ vào ví Host.    │
│                                              │                                                 │
│ 4. Bẫy chi phí cố định OpEx vs Quản lý CTV   │ 100% biến phí linh hoạt cấu hình trên Admin;    │
│                                              │ Tự động nhân thưởng 5 sao; Không ôm lương cứng.  │
│                                              │                                                 │
│ 5. Tranh giành Lead & Chậm trễ điều phối     │ Thuật toán Auto-Dispatch 3 tầng trong 3 phút;   │
│                                              │ Khóa phiên dẫn Session Binding; Cấm đi ké thang.│
└──────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---
*Văn bản thuộc Hệ thống Pháp lý Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
