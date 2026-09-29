# VINSTAY AI — HỆ THỐNG VĂN BẢN & KHUNG PHÁP LÝ NỀN TẢNG (LEGAL & COMPLIANCE FRAMEWORK)

> **MỤC ĐÍCH THƯ MỤC:**  
> Thư mục `/legal/` lưu trữ toàn bộ các biểu mẫu văn bản pháp lý, thỏa thuận điện tử, quy chế tuân thủ và chính sách bảo vệ dữ liệu được thiết kế riêng cho Hệ điều hành Cho thuê & Vận hành Căn hộ **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.  
> Toàn bộ các văn bản này được xây dựng bám sát 100% Bộ luật Dân sự 2015, Luật Kinh doanh Bất động sản 2023, Luật Nhà ở 2023, Nghị định 13/2023/NĐ-CP và Quy chế vận hành của Ban Quản lý (BQL) Vinhomes.

---

## 1. DANH MỤC TÀI LIỆU PHÁP LÝ CỐT LÕI

| STT | Tên Tài Liệu | Đối Tượng Áp Dụng | Mục Đích & Căn Cứ Pháp Lý | Tệp Tin |
| :---: | :--- | :--- | :--- | :--- |
| **00** | **Quy Chuẩn Ký Kết Hợp Đồng Điện Tử Thống Nhất** *(Universal E-Signing Protocol)* | Chủ nhà $\leftrightarrow$ Khách thuê $\leftrightarrow$ VinStay AI | Chuẩn hóa quy trình ký số Hybrid 4 bước trong 60 giây (Chữ ký vẽ tay + Mã xác thực Zalo OTP chính chủ + Niêm phong PDF SHA-256). Căn cứ Khoản 2 Điều 164 Luật Nhà ở 2023 (không bắt buộc công chứng) và Luật Giao dịch Điện tử 2023. | [`00_UNIVERSAL_ELECTRONIC_SIGNING_PROTOCOL.md`](./00_UNIVERSAL_ELECTRONIC_SIGNING_PROTOCOL.md) |
| **01** | **Hợp Đồng Ký Gửi Quản Lý Cho Thuê Độc Quyền** *(Exclusive Rental Mandate)* | Nền tảng $\leftrightarrow$ Chủ nhà | Ủy quyền độc quyền quản lý rổ hàng, thẩm định 1 lần (chi phí kiểm định 0đ), bảo mật mã cửa điện tử, điều khoản thoát linh hoạt 15 ngày khi nhà trống. | [`01_EXCLUSIVE_RENTAL_MANDATE.md`](./01_EXCLUSIVE_RENTAL_MANDATE.md) |
| **02** | **Thỏa Thuận Đặt Cọc Giữ Chỗ Linh Hoạt & Cọc Bảo Đảm Nội Thất** *(Holding & Security Deposit Agreement)* | Nền tảng $\leftrightarrow$ Khách thuê $\leftrightarrow$ Chủ nhà | Đặt cọc giữ chỗ (mặc định 2.000.000 VNĐ, thời hạn tùy chỉnh từ Admin Portal) qua VietQR động. **Khi ký HĐ chính thức, chuyển đổi 100% thành Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit)**, tuyệt đối không khấu trừ vào tiền thuê tháng đầu. Căn cứ Điều 328 BLDS 2015. | [`02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md`](./02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md) |
| **03** | **Chính Sách Bảo Vệ Dữ Liệu Cá Nhân & Đồng Thuận OCR CCCD** *(Data Privacy & Consent)* | Nền tảng $\leftrightarrow$ Toàn bộ Người dùng | Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân; quy chuẩn mã hóa ảnh CCCD gắn chip khi bóc tách qua AI Vision OCR; cấm chia sẻ cho môi giới ngoài. | [`03_PRIVACY_POLICY_AND_DATA_CONSENT.md`](./03_PRIVACY_POLICY_AND_DATA_CONSENT.md) |
| **04** | **Quy Chế Tuân Thủ Nội Quy BQL Vinhomes & Khấu Trừ Phạt** *(BQL Compliance & Liability)* | Khách thuê $\leftrightarrow$ Chủ nhà $\leftrightarrow$ BQL | Số hóa nội quy BQL Ocean Park (tiếng ồn sau 22h, thú cưng, thẻ thang máy, cấm dán QR sảnh). Ràng buộc khấu trừ mọi khoản phạt của BQL trực tiếp vào Tiền Cọc Bảo Đảm Tài Sản. | [`04_BQL_REGULATIONS_AND_LIABILITY.md`](./04_BQL_REGULATIONS_AND_LIABILITY.md) |
| **05** | **Điều Khoản Miễn Trừ Trách Nhiệm Dịch Vụ Sửa Chữa Ngoài** *(Asset-Light Handyman Disclaimer)* | Nền tảng $\leftrightarrow$ Khách thuê $\leftrightarrow$ Thợ ngoài | Tuyên bố miễn trừ trách nhiệm bảo trì kỹ thuật; xác định VinStay AI và Field Host chỉ giới thiệu danh bạ thợ ngoài uy tín; khách và thợ tự thỏa thuận chi phí theo mô hình Asset-Light. | [`05_HANDYMAN_REFERRAL_DISCLAIMER.md`](./05_HANDYMAN_REFERRAL_DISCLAIMER.md) |
| **06** | **Hợp Đồng Thuê Căn Hộ Chung Cư Chính Thức Số Hóa** *(Official Apartment Lease Agreement)* | Chủ nhà $\leftrightarrow$ Khách thuê | Chuẩn hóa theo Luật Nhà ở 2023 (Khoản 2 Điều 164: Không bắt buộc công chứng); ký số OTP Zalo/SMS; điều khoản bảo vệ tài sản nội thất, chuyển 2M cọc giữ chỗ thành cọc bảo đảm; tự động trừ phạt BQL; Hộ chiếu bàn giao 10 hạng mục. | [`06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md`](./06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md) |
| **07** | **Chính Sách Ký Quỹ & Giữ Hộ Tiền Cọc 3 Bên (Hợp Tác Ngân Hàng)** *(Escrow & Deposit Custody Policy)* | Nền tảng $\leftrightarrow$ Khách thuê $\leftrightarrow$ Chủ nhà $\leftrightarrow$ Ngân hàng | Xác lập cơ chế ký quỹ độc lập tại Ngân hàng theo Điều 554-558 BLDS 2015 & NĐ 52/2024/NĐ-CP; khóa giải tỏa thông minh (Smart Release); giải tỏa từng phần & Passive Approval SLA 07 ngày; triệt tiêu 100% cắt cầu ngoài sàn. | [`07_ESCROW_AND_DEPOSIT_CUSTODY_POLICY.md`](./07_ESCROW_AND_DEPOSIT_CUSTODY_POLICY.md) |
| **08** | **Hợp Đồng Đối Tác Tiếp Đón Thực Địa & Quy Trình Dẫn Khách** *(Field Host Partnership & Viewing Protocol)* | Nền tảng $\leftrightarrow$ Field Host / Sale | Xác lập quan hệ đối tác dịch vụ độc lập (100% biến phí, Điều 513 BLDS 2015); thuật toán Auto-Dispatch 3 tầng SLA 3 phút; cơ chế Attribution Lock bảo vệ hoa hồng; thẻ RFID cấm đi ké thang máy; mã cửa JIT 45 phút; chế tài chống cắt cầu (phạt 1 tháng tiền thuê). | [`08_FIELD_HOST_PARTNERSHIP_AND_VIEWING_PROTOCOL.md`](./08_FIELD_HOST_PARTNERSHIP_AND_VIEWING_PROTOCOL.md) |

---

## 2. PHÂN HỆ PHÁP LÝ CHUYÊN BIỆT THEO 4 NHÓM NGƯỜI DÙNG

* **Nhóm 1 — Khách Thuê (Tenant Legal Suite):** [`legal/tenant/README.md`](./tenant/README.md) *(Hoàn tất 6/6 bước: Tìm kiếm All-in $\rightarrow$ Cọc 24h VietQR $\rightarrow$ Privacy & OCR CCCD $\rightarrow$ HĐ Thuê số hóa $\rightarrow$ Ký quỹ 3 bên $\rightarrow$ Bàn giao & Hoàn cọc 60s)*.
* **Nhóm 2 — Chủ Nhà (Landlord Legal Suite):** [`legal/landlord/README.md`](./landlord/README.md) *(Hoàn tất 6/6 bước: Ký gửi độc quyền $\rightarrow$ Mã khóa JIT & Lưu chìa cơ $\rightarrow$ Hộ chiếu bàn giao 10 hạng mục $\rightarrow$ Trừ phạt BQL & Quản lý cọc $\rightarrow$ Miễn trừ sửa chữa Asset-Light $\rightarrow$ Check-out & Smart Release 60s)*.
* **Nhóm 3 — Field Host (Field Operations Suite):** [`legal/host/README.md`](./host/README.md) *(Hoàn tất 6/6 bước: Hợp đồng đối tác SLA $\rightarrow$ Thù lao linh hoạt & Audit Log $\rightarrow$ Tiếp đón sảnh & Zalo OA/ZCC $\rightarrow$ Nhắc hẹn kép & Bù No-show $\rightarrow$ Ứng xử 5 sao & Chống cắt cầu $\rightarrow$ Hộ chiếu số & SPS Rating)*.
* **Nhóm 4 — Quản Trị & Đơn Vị Vận Hành (Admin & Partners Suite):** [`legal/admin/README.md`](./admin/README.md) *(Hoàn tất 6/6 bước: Quản trị hệ thống & BI Heatmap $\rightarrow$ Rổ hàng độc quyền & Thoát 15 ngày $\rightarrow$ Công cụ biến phí & Audit Trail $\rightarrow$ Giám sát Auto-Dispatch SLA $\rightarrow$ Ký quỹ độc lập & EVN Waterfall $\rightarrow$ An toàn thông tin, NĐ 13 & AI Observability)*.

---

### 3. MA TRẬN ĐỐI ỨNG: PHÁP LÝ GIẢI QUYẾT 4 NỖI ĐAU CỦA CHỦ NHÀ
```
┌──────────────────────────────────────────────┬────────────────────────────────────────────────────────────────┐
│           NỖI ĐAU THỰC TẾ CHỦ NHÀ            │                 CƠ CHẾ PHÁP LÝ VINSTAY AI XỬ LÝ                │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 1. Trống phòng kéo dài & Thiệt hại tài chính │ • Thỏa thuận Ký gửi Độc quyền: VinStay AI toàn quyền khớp căn. │
│    kép (mỗi tháng mất 6–12tr tiền thuê +     │ • Cọc giữ chỗ 24h qua VietQR động: Tạo áp lực chốt nhanh, khóa │
│    gánh nợ ngân hàng + phí quản lý BQL)      │   căn tự động trên hệ thống, triệt tiêu khách do dự so đo.    │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 2. Cực hình đi xa 20-30km mở cửa & Môi giới  │ • Hợp đồng Ký gửi Độc quyền: Điều khoản ủy quyền Field Host    │
│    làm phiền, ăn cắp ảnh đăng tin mồi dìm giá│   dùng mã số mở cửa tức thì qua App (Chủ nhà ở nhà 100%).      │
│                                              │ • Bản quyền hình ảnh & Watermark số: Chống môi giới ngoài dìm. │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 3. Tranh chấp hư hao nội thất & Rủi ro       │ • Cọc 2M chuyển 100% thành Tiền Cọc Bảo Đảm Nội Thất           │
│    tiền cọc bàn giao khi trả phòng           │   (Security Deposit), không trừ vào tiền thuê tháng đầu.       │
│                                              │ • Hộ chiếu bàn giao số (Digital Passport) 10 hạng mục timestamp│
│                                              │   làm bằng chứng pháp lý đối soát trừ cọc khi thanh lý.        │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 4. Khủng hoảng bảo trì vặt & Rủi ro bị       │ • Quy chế BQL: Tự động trừ tiền phạt vi phạm BQL vào tiền cọc. │
│    BQL phạt / bùng tiền điện nước EVN        │ • Chốt công tơ điện nước timestamp trước khi tất toán cọc.     │
│                                              │ • Điều khoản Asset-Light Handyman: Giải phóng chủ nhà khỏi     │
│                                              │   sự cố vặt ban đêm, khách tự thỏa thuận thợ ngoài uy tín.     │
└──────────────────────────────────────────────┴────────────────────────────────────────────────────────────────┘
```

---

## 4. NGUYÊN TẮC ÁP DỤNG & GIÁ TRỊ PHÁP LÝ CHỮ KÝ SỐ

1. **Hiệu lực thỏa thuận điện tử:** Toàn bộ hợp đồng và thỏa thuận trong thư mục này được ký kết thông qua mã **Zalo/SMS OTP** có định danh số điện thoại thật, lưu trữ dấu vết thời gian (Timestamped Audit Log) và địa chỉ IP, có đầy đủ giá trị pháp lý theo **Luật Giao dịch Điện tử 2023** (có hiệu lực từ 01/07/2024).
2. **Bảo mật dữ liệu:** Mọi thông tin CCCD gắn chip, số điện thoại và mã khóa cửa điện tử đều được mã hóa bằng chuẩn **AES-256** tại cơ sở dữ liệu Supabase/PostgreSQL, tuân thủ nghiêm ngặt **Nghị định 13/2023/NĐ-CP**.
