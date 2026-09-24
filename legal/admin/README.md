# HỆ THỐNG PHÁP LÝ & QUẢN TRỊ NỀN TẢNG
### (ADMIN & PARTNERS SUITE — NHÓM 4)

> **MỤC TIÊU CỐT LÕI CỦA BỘ VĂN BẢN NHÓM 4:**  
> Thiết lập quy chuẩn điều hành hệ thống, quản trị tài chính ký quỹ độc lập, giám sát phễu chuyển đổi thông minh (BI), tự động hóa phân bổ điều phối thực địa và bảo vệ an toàn thông tin tuân thủ **Nghị định 13/2023/NĐ-CP** cùng **Khung Quản trị Trí tuệ Nhân tạo An toàn (AI Observability & Governance)** của nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

---

## DANH MỤC 6 BƯỚC PHÁP LÝ & QUẢN TRỊ ADMIN PORTAL

| Bước | Tên Văn Bản Quy Chuẩn | Mục Tiêu & Cơ Chế Quản Trị Hệ Thống | Liên Kết Văn Bản |
| :---: | :--- | :--- | :---: |
| **Bước 1** | **Quy Chế Quản Trị Hệ Thống, Giám Sát Phễu BI & Bản Đồ Nhiệt Lấp Đầy** *(System Administration, BI Funnel & Occupancy Heatmap)* | • Phân quyền quản trị viên 4 cấp độ (RBAC: Super Admin, Area Lead, Finance Auditor, CSKH).<br/>• Phễu chuyển đổi 6 giai đoạn thời gian thực kèm cơ chế Cứu Lead tự động (Drop-off Rescue).<br/>• Bản đồ nhiệt lấp đầy (Heatmap) & Thuật toán **Căn hời phân khu (Dynamic Deal)**.<br/>• Quản lý chu kỳ trống phòng trước (Pre-Leasing Vacancy T-45/T-30 ngày). | [`01_SYSTEM_ADMINISTRATION_AND_BI_OCCUPANCY_HEATMAP.md`](./01_SYSTEM_ADMINISTRATION_AND_BI_OCCUPANCY_HEATMAP.md) |
| **Bước 2** | **Quy Chuẩn Quản Trị Rổ Hàng Độc Quyền, Khóa Căn 24h & Giám Sát Rút Ký Gửi 15 Ngày** *(Exclusive Inventory & 15-Day Exit)* | • Vòng đời 6 trạng thái căn hộ (`Available`, `Holding`, `Rented`, `Pre-Leasing`, `Exit_Pending`, `Offboarded`).<br/>• **Khóa căn giữ chỗ 24h thần tốc trong 3 giây** qua VietQR động 2.000.000 VNĐ.<br/>• Thoát ủy quyền linh hoạt: **Báo trước 15 ngày kèm trạng thái nhà trống**.<br/>• Thẩm định 1 lần duy nhất (Chi phí = 0đ) & Đóng Watermark số chống tin mồi. | [`02_EXCLUSIVE_INVENTORY_AND_15_DAY_EXIT_MONITORING.md`](./02_EXCLUSIVE_INVENTORY_AND_15_DAY_EXIT_MONITORING.md) |
| **Bước 3** | **Quy Chế Vận Hành Công Cụ Cấu Hình Biến Phí & Bảng Ghi Vết Kiểm Toán Bất Biến** *(Dynamic Commission Engine & Audit Trail)* | • **Cấu hình trực tiếp 8 tham số thù lao/hoa hồng trên Admin Portal** (`fee_configs`).<br/>• Giao diện thanh trượt (Sliders) & Công cụ mô phỏng dòng tiền trước khi lưu.<br/>• **4 nguyên tắc minh bạch:** Audit Log mã băm SHA-256, Không hồi tố, Push In-App, Bóc tách công thức ví.<br/>• Quy trình Phê duyệt kép (Maker - Checker Workflow) với mã OTP cho thay đổi lớn. | [`03_DYNAMIC_COMMISSION_ENGINE_AND_AUDIT_TRAIL.md`](./03_DYNAMIC_COMMISSION_ENGINE_AND_AUDIT_TRAIL.md) |
| **Bước 4** | **Quy Chuẩn Giám Sát Điều Phối SLA Field Host & Xử Lý Khủng Hoảng Vận Hành** *(Auto-Dispatch SLA & Field Escalation)* | • **Thuật toán Auto-Dispatch 3 tầng:** Chỉ định độc quyền (3p) $\rightarrow$ Open Pool 500m (2p) $\rightarrow$ Báo Động Đỏ Area Lead.<br/>• Bản đồ giám sát đội ngũ thực địa thời gian thực (Fleet Telemetry) cân bằng tải.<br/>• Quy trình xử lý khủng hoảng tại sảnh (đến sớm, hỏng xe, cấp thẻ Master 5 phút).<br/>• Thuật toán chống gian lận định vị (Anti-Spoofing Geofence 3 lớp). | [`04_AUTO_DISPATCH_SLA_AND_FIELD_ESCALATION.md`](./04_AUTO_DISPATCH_SLA_AND_FIELD_ESCALATION.md) |
| **Bước 5** | **Quy Chế Quản Lý Tài Khoản Định Danh, Quyết Toán Ký Quỹ & Đối Soát All-in Cost** *(Named Escrow & Fast Deposit Settlement)* | • **Phân tách dòng tiền độc lập:** Tài khoản Ký Quỹ Độc Lập đóng băng vốn vs. Tài khoản Phí Vận Hành.<br/>• Gạch nợ tự động trong 3 giây qua mã VietQR động chuẩn NAPAS 247.<br/>• Chuẩn hóa Tiền Cọc Bảo Đảm Tài Sản giữ nguyên suốt kỳ thuê (không trừ tiền thuê tháng đầu).<br/>• Thác khấu trừ quyết toán cọc tự động (EVN $\rightarrow$ Phạt BQL $\rightarrow$ Hư hỏng $\rightarrow$ Hoàn cọc).<br/>• **Smart Release giải tỏa cọc trong 60 giây** & Cơ chế **Phê duyệt thụ động sau 7 ngày**. | [`05_NAMED_ESCROW_ACCOUNT_AND_SETTLEMENT_PROTOCOL.md`](./05_NAMED_ESCROW_ACCOUNT_AND_SETTLEMENT_PROTOCOL.md) |
| **Bước 6** | **Quy Chuẩn An Toàn Thông Tin, Bảo Vệ Dữ Liệu Nghị Định 13 & Giám Sát AI Governance** *(System Security, PDPA & AI Observability)* | • Mã hóa AES-256 cơ sở dữ liệu & TLS 1.3 truyền dẫn mạng.<br/>• Tuân thủ toàn diện **Nghị định 13/2023/NĐ-CP** (Quyền xóa dữ liệu, báo cáo rò rỉ trong 72h).<br/>• Phân tách dữ liệu cấp CSDL bằng **PostgreSQL Row-Level Security (RLS)** & Che mờ SĐT/CCCD.<br/>• **Khung 5 tầng giám sát AI:** StateGraph Tracing, Timeout $\le 3$s, Sandboxed Read-only Tools, Kill Switch.<br/>• **Chống ảo giác AI:** Tách bạch Tất định (SQL 100%) vs Xác suất; Cổng tin cậy OCR $\ge 85\%$. | [`06_DATA_PRIVACY_SECURITY_AND_AI_GOVERNANCE.md`](./06_DATA_PRIVACY_SECURITY_AND_AI_GOVERNANCE.md) |

---

## BẢNG MA TRẬN ĐỐI SOÁT VẬN HÀNH TOÀN HỆ THỐNG VINSTAY AI

```
┌───────────────────────────────────────┬────────────────────────────────────────────────────────┐
│      KHÍA CẠNH QUẢN TRỊ TRỌNG YẾU     │           GIẢI PHÁP ĐÃ ĐƯỢC THỂ CHẾ HÓA TRONG NHÓM 4   │
├───────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Tránh bẫy chi phí cố định (OpEx)   │ 100% biến phí linh hoạt; cấu hình tham số thanh trượt  │
│                                       │ trực tiếp trên Admin Portal với Audit Log SHA-256.     │
│                                       │                                                        │
│ 2. Giải tỏa cọc & Chống nợ đọng       │ Smart Release trong 60 giây; Thác khấu trừ chốt nợ EVN;│
│                                       │ Cơ chế Phê duyệt thụ động sau 7 ngày chống om cọc.    │
│                                       │                                                        │
│ 3. Chống rổ hàng "thiu" & Bán trùng   │ VietQR gạch nợ 3 giây khóa trạng thái Holding 24h;     │
│                                       │ Thoát ủy quyền linh hoạt 15 ngày khi nhà trống.        │
│                                       │                                                        │
│ 4. Tiếp đón không để khách chờ        │ Thuật toán Auto-Dispatch 3 tầng trong 3 phút;         │
│                                       │ Còi báo động đỏ khẩn cấp đẩy Area Lead can thiệp.      │
│                                       │                                                        │
│ 5. An ninh dữ liệu & Chống ảo giác AI │ Mã hóa AES-256; Supabase RLS; Logic tài chính bằng SQL │
│                                       │ thuần; Ngưỡng tự tin OCR >= 85%; Agent Kill Switch.    │
└───────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
