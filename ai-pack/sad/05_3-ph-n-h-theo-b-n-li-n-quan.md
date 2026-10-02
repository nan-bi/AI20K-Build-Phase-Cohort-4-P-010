<!-- nguồn: docs/SAD_v2.md, dòng 116–151 -->
## 3. PHÂN HỆ THEO BÊN LIÊN QUAN

| Bên                    | Kênh                     | Năng lực chính                                                                                                                                                                   |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Khách thuê**         | Web PWA (Next.js) + Zalo | Tìm căn theo All-in Cost; đặt lịch xem (OTP SĐT, không QR); nút Zalo "Tôi đã có mặt tại sảnh"; cọc VietQR; xác thực eKYC; ký thỏa thuận/hợp đồng; nhận bàn giao 10 hạng mục      |
| **Chủ nhà**            | Web Portal + Zalo OTP    | Ký gửi Độc quyền (thẩm định 0đ); **cấu hình mã khóa (ghi, không xem plaintext)**; theo dõi từ xa; duyệt/ký hợp đồng; yêu cầu xoay mã; thoát ủy quyền 15 ngày khi căn `available` |
| **Field Host**         | Mobile PWA               | Nhận ticket theo tầng SLA; đón sảnh; xem mã khóa **chỉ khi ticket active**; sinh VietQR cọc có Attribution Lock; lập Hộ chiếu Bàn giao; thu nhập biến phí vào ví                 |
| **Area Lead**          | Mobile/Web               | Nhận ticket Tầng 3 (broadcast/leo thang), chỉ định nhân sự, hỗ trợ khẩn cấp (chìa dự phòng)                                                                                      |
| **Ops Admin**          | Admin Portal             | BI/funnel, cấu hình biến phí, giám sát SLA, xử lý ngoại lệ, xoay mã khi cần                                                                                                      |
| **Compliance Officer** | Admin Portal (quyền hẹp) | Rà soát thủ công ca eKYC `needs_review`; đối soát pháp lý; mọi truy cập đều có audit                                                                                             |
| **Đối tác**            | API                      | Bank/VietQR, Zalo, FPT.AI eKYC↔C06, dấu thời gian; BQL Vinhomes (ràng buộc vận hành: không QR/tờ rơi ở sảnh, không Lockbox); mạng lưới thợ ngoài (chỉ giới thiệu, 🔵)            |

### 3.1 All-in Cost (✅ rule tất định)

```
All-in Cost = base_rent + management_fee + parking_fee_estimate + utility_cost_estimate
```

| Thành phần         | Công thức mặc định (tham số cấu hình, ⚠ giá trị lấy từ bản Enterprise — cần xác thực với BQL/nguồn) |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Phí quản lý        | Diện tích thông thủy × 9.500 đ/m²                                                                   |
| Phí gửi xe         | 150.000 đ/xe máy; 1.250.000 đ/ô tô                                                                  |
| Điện nước ước tính | 300.000 đ/người/tháng                                                                               |

### 3.2 Biến phí Host (Dynamic Commission) — cấu hình qua Admin, không sửa mã

Tham số (khoảng giá trị đề xuất, 🔵 cần chốt với Ops): `base_viewing_fee` (30–100k), `deal_commission` (200k–1.000k), `rating_multiplier_5star` (1,1–1,5x), `peak_hour_multiplier` (1,1–1,5x), `slow_inventory_bonus` (100–500k), `handover_inspection_fee` (50–100k), `no_show_wait_allowance_pct` (50%), `penalty_late_cancel` (50k). Thay đổi ghi audit (old/new/actor/lý do). 🔵 Maker–Checker cho điều chỉnh > 50 triệu và Financial Simulator: giai đoạn sau pilot.

### 3.3 Hộ chiếu Bàn giao số (✅ 10 hạng mục)

Tường/sơn · sàn · cửa & khóa · điều hòa · tủ lạnh · bếp & thiết bị · thiết bị vệ sinh · sofa & bàn trà · giường/nệm/tủ · chiếu sáng, công tắc, ổ cắm. Mỗi ảnh gắn timestamp ISO 8601, tọa độ GPS trong bán kính ≤ 50m của tòa (tham số), hash SHA-256 ghi vào DB. **Chỉ số công tơ điện/nước: Host nhập tay + ảnh chứng cứ** (không OCR, không tích hợp EVN trong MVP).

**Nguyên tắc phân định hao mòn (⚖️ chính sách cần pháp chế duyệt):** hao mòn tự nhiên không được cấn trừ cọc; hư hại do sử dụng sai và nợ điện nước được cấn trừ theo bảng giá/hóa đơn minh bạch.

---

