# VINSTAY AI — BACKEND SERVICE PLATFORM

Hệ thống API Backend toàn diện cho nền tảng thuê căn hộ Asset-Light tại **Vinhomes Ocean Park (The Sapphire 1 & 2)**.

> **Công nghệ:** NestJS 10 + Prisma ORM + Supabase (PostgreSQL + Auth + Storage).  
> **Tuân thủ chuẩn:** [SAD v2.0](../docs/SAD_v2.md), [Backend Implementation Plan](../docs/backend_implementation_plan.md) và [Interactive Prototype Guide](../docs/PROTOTYPE_GUIDE.md).  
> **🎯 TRÌNH DIỄN SƠ ĐỒ & TÀI LIỆU BACKEND:** Mở tệp tin [`backend/BACKEND_SHOW.html`](./BACKEND_SHOW.html) (hoặc [`presentation/BACKEND_SHOW.html`](../presentation/BACKEND_SHOW.html)) để xem tài liệu cơ bản và bấm nút **"Mở Trình Chiếu Sơ Đồ (Show Mode)"** để xem 6 sơ đồ kiến trúc tương tác!

---

## 1. TỔNG QUAN KIẾN TRÚC & CÁC PHÂN HỆ NGHIỆP VỤ

Hệ thống cung cấp đầy đủ 10 phân hệ nghiệp vụ phục vụ trực tiếp cho 4 nhóm đối tượng:

1. **👤 Khách thuê (Tenant Journey - 6 Màn hình):**
   - **All-in Cost Calculator (`/api/v1/properties/units`)**: Bóc tách 4 khoản phí thời gian thực (Tiền thuê gốc + Phí BQL 9.5k/m2 + Gửi xe + Điện nước 300k/người).
   - **AI Matchmaker 30 Giây (`/api/v1/matchmaker/recommend`)**: Lọc hard constraints theo ngân sách trần All-in, ranking Top 3 căn hời nhất kèm badge tiết kiệm.
   - **Đặt lịch xem OTP (`/api/v1/bookings/request-otp` & `confirm`)**: Diệt 100% môi giới ảo và no-show.
   - **Đón sảnh 1-chạm (`/api/v1/bookings/:id/lobby-checkin`)**: Nút Zalo `[📍 Tôi đã có mặt tại sảnh]`, không dán QR sảnh vi phạm BQL.
   - **VietQR Cọc 2.000.000đ (`/api/v1/deposits/generate-vietqr` & `webhook-vietqr`)**: Gạch nợ ≤ 5s, chuyển căn sang `HOLDING` 7 ngày, **Conflict Resolver** tự động hủy lịch trùng và gợi ý 2 căn thay thế.
   - **FPT.AI eKYC & Ký số OTP (`/api/v1/identity/ekyc/verify` & `/api/v1/contracts/holding-agreement/sign`)**: Cơ chế **Zero-Storage RAM (0 byte ảnh lưu server)** theo Nghị định 356/2025/NĐ-CP, ký số Canvas + Zalo OTP và trao danh bạ thợ ngoài uy tín.

2. **🏠 Chủ nhà (Landlord Journey - Ở nhà 100%, 0 công sức):**
   - **Ký gửi Độc quyền Mandate (`/api/v1/contracts/mandate/create`)**: Thẩm định 0đ, nhập mã khóa cửa lưu an toàn vào Vault (AES-256).
   - **Bảng điều khiển Giám sát từ xa (`/api/v1/landlord/dashboard`)**: Quãng đường = 0km, thời gian = 0 phút; theo dõi cọc 2M đã gạch nợ.
   - **Nhật ký mở cửa Audit Trail (`/api/v1/landlord/units/:id/audit-trail`)**: Minh bạch ai mở, lúc nào, kết quả.
   - **Kích hoạt Thoát 15 ngày (`/api/v1/landlord/mandates/request-exit`)**: Chỉ áp dụng khi căn Available; countdown 15 ngày tự động xóa mã khỏi hệ thống Host.

3. **🚶 Field Host / Sale nội khu (Mobile PWA 1-chạm):**
   - **Nhận Ticket ca trực SLA (`/api/v1/dispatch/tickets/:id/accept`)**: SLA 3-5 phút đếm ngược.
   - **Quẹt thẻ cư dân thang máy (`/api/v1/dispatch/tickets/:id/elevator-rfid`)**: Đón khách trong 60 giây.
   - **Cấp mã mở cửa JIT tại phòng (`/api/v1/dispatch/tickets/:id/reveal-key`)**: Không dùng Lockbox. Cấp mã PIN Vault chỉ khi ticket active, ghi Audit Log và gửi Zalo alert cho chủ nhà.
   - **Hộ chiếu bàn giao số (`/api/v1/handovers`)**: Kiểm định 10 hạng mục nội thất + công tơ điện nước Host nhập tay + ảnh chứng cứ.
   - **Thu nhập biến phí tức thì**: Nhảy số ví ngay: +450.000 VNĐ (50k dẫn + 400k hoa hồng cọc).

4. **⚙️ Quản trị viên (Admin Portal - 4 Module):**
   - **Module 1: BI Funnel & Occupancy Heatmap (`/api/v1/admin/bi-funnel`)**: Phễu 6 giai đoạn thời gian thực (no-show 3.8%) & Heatmap Sapphire 1 & 2.
   - **Module 2: Quản lý Rổ hàng Độc quyền (`/api/v1/admin/exclusive-inventory`)**: Quản lý rổ hàng và countdown thoát 15 ngày.
   - **Module 3: Giám sát Điều phối SLA Field Host (`/api/v1/admin/dispatch-sla`)**: Cảnh báo đỏ ticket quá 3 phút.
   - **Module 4: Dynamic Commission Engine (`/api/v1/admin/commission-engine`)**: Bảng kê thanh toán tuần, xuất file ngân hàng 1-chạm, điều chỉnh biến phí có Audit Log.

---

## 2. CẤU TRÚC THƯ MỤC SOURCE CODE

```
backend/
├── prisma/
│   ├── schema.prisma          # Toàn bộ 22 Data Models (IAM, Property, Vault Door Key, VietQR, eKYC, E-Sign, Handover, Audit)
│   └── seed.ts                # Dữ liệu khởi tạo (Sapphire 1 & 2, Field Host Nam & Thanh, Unit S1.02, Fee Configs)
│
├── src/
│   ├── main.ts                # Entrypoint, Swagger UI, Global Pipes, CORS
│   ├── app.module.ts          # Root Module
│   │
│   ├── prisma/                # PrismaService & PrismaModule (Global)
│   ├── supabase/              # SupabaseService (Auth JWT verification & Storage)
│   │
│   ├── common/                # Shared Cross-cutting Concerns
│   │   ├── decorators/        # @CurrentUser, @Roles, @Public
│   │   ├── guards/            # SupabaseAuthGuard, RolesGuard (RBAC 7 roles)
│   │   ├── filters/           # HttpExceptionFilter
│   │   └── interceptors/      # LoggingInterceptor, TransformInterceptor
│   │
│   └── modules/               # 10 Phân hệ nghiệp vụ chi tiết
│       ├── property/          # Bóc tách 4 khoản phí All-in Cost & Rổ hàng Sapphire 1 & 2
│       ├── matchmaker/        # AI Matchmaker 30s & Ranking Top 3 căn hời nhất
│       ├── booking/           # Đặt lịch xác thực OTP SĐT & Nút Zalo T-10m đón sảnh 1-chạm
│       ├── dispatch/          # Điều phối Host 3 tầng SLA & Cấp mã mở cửa JIT bảo mật Vault
│       ├── deposit/           # VietQR 2M động, Webhook gạch nợ & Conflict Resolver khóa 7 ngày
│       ├── identity/          # FPT.AI eKYC Adapter (Zero-Storage RAM 0 byte, Liveness, C06)
│       ├── contract/          # Ký Thỏa thuận cọc số, Mandate độc quyền & Gói chứng cứ JSON
│       ├── landlord/          # Dashboard Ở nhà 100%, Audit Trail mở cửa & Kích hoạt thoát 15 ngày
│       ├── handover/          # Hộ chiếu bàn giao số 10 hạng mục nội thất & công tơ điện nước
│       ├── admin/             # 4 Module BI Funnel, Heatmap, SLA Host, Dynamic Commission Engine
│       └── audit/             # Audit Service ghi nhận bất biến (append-only)
│
├── .env.example
├── docker-compose.yml         # Container PostgreSQL & Redis local dev
├── package.json
└── tsconfig.json
```

---

## 3. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### Bước 1: Cài đặt thư viện dependencies

```bash
cd backend
npm install
```

### Bước 2: Cấu hình biến môi trường

```bash
cp .env.example .env
```

_(Nếu đã kết nối Supabase Cloud, điền `DATABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`. Nếu chạy local dev offline, khởi chạy Docker Compose)._

### Bước 3: Khởi chạy Database local (Tùy chọn nếu không dùng Supabase Cloud)

```bash
docker compose up -d
```

### Bước 4: Tạo Client & Seed dữ liệu mẫu

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### Bước 5: Khởi chạy Backend Server ở chế độ Development

```bash
npm run start:dev
```

- **Backend API Base URL:** `http://localhost:3000/api/v1`
- **Swagger UI Interactive Documentation:** `http://localhost:3000/api/docs`
