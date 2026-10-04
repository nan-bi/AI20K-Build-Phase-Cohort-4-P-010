# Architecture Diagram — VinStay AI

Sơ đồ kiến trúc **đúng với mã nguồn hiện tại** (nhánh `main`, 2026-10-04). Kiến trúc mục tiêu và lý do thiết kế nằm ở [`ARCHITECTURE.md`](../ARCHITECTURE.md) và [`docs/SAD_v2.md`](SAD_v2.md); khi hai bên lệch nhau, file này mô tả cái **đã chạy**, hai file kia mô tả cái **định làm**.

Ký hiệu trạng thái dùng trong file: **Thật** = nối dữ liệu thật · **Mô phỏng** = có API nhưng dùng bộ giả lập · **Mock** = dữ liệu cứng trong trình duyệt · **Chưa nối** = có code nhưng không ai gọi.

## 1. Tổng quan hệ thống (container)

```mermaid
graph TB
    U([Người dùng<br/>Khách thuê · Chủ nhà · Field Host · Admin]) --> WEB

    subgraph WEB["apps/web — Next.js 16 · React 19 · :3000"]
        P1[Cổng Khách thuê<br/>/ · /units · /booking · /account]
        P2[Cổng Chủ nhà<br/>/landlord/*]
        P3[Cổng Field Host<br/>/host/*]
        P4[Cổng Admin<br/>/admin/*]
        PX[src/proxy.ts<br/>chặn trang theo phiên + rewrite /api/v1/*]
    end

    PX -->|HTTP /api/v1/* · cookie httpOnly vs_access| API

    subgraph API["backend — NestJS 10 · :4000 · Swagger /api/docs"]
        G[Guard toàn cục<br/>SupabaseAuthGuard → RolesGuard]
        M[17 module nghiệp vụ<br/>xem mục 2]
    end

    API -->|Prisma 5 · 27 model| DB[(Supabase PostgreSQL<br/>pooler 6543)]
    API -->|service role| ST[(Supabase Storage<br/>bucket private consignment-photos<br/>ảnh thẩm định)]
    API -->|Passport OAuth| GG[Google OAuth 2.0]
    API -.->|chưa triển khai, dev ghi log| ZL[Zalo ZNS / SMS OTP]
    API -.->|giả lập| VQ[VietQR + webhook]
    API -.->|giả lập| EK[eKYC CCCD]

    AI["src/ — FastAPI + LangGraph · :8000<br/>khung template, chưa nối"]:::off
    WEB -. không gọi .-> AI
    API -. không gọi .-> AI

    classDef off fill:#eee,stroke:#999,stroke-dasharray: 4 3,color:#666
```

| Thành phần | Công nghệ | Trạng thái |
|---|---|---|
| Web 4 cổng | Next.js 16.3, React 19.2, TypeScript, Vitest | Khách thuê, Chủ nhà: **Thật** · Field Host "Lịch & yêu cầu" và "Thẩm định ký gửi": **Thật** · Field Host thu nhập/sổ tay, Admin (trừ `/admin/hosts`): **Mock** |
| Chat "VinStay AI" trang chủ | `interpret()` chạy trong trình duyệt (regex + FAQ soạn sẵn) trên catalog thật | **Mock** — không gọi LLM ([TC-02](qa/TC-02_ai-apartment-qa.md)) |
| Backend API | NestJS 10, Prisma 5, class-validator, Passport, pdfkit | **Thật** |
| Cơ sở dữ liệu | PostgreSQL trên Supabase; nguồn chân lý `backend/prisma/schema.prisma` | **Thật** |
| Lưu ảnh | Supabase Storage (bucket private, link ký 1 giờ) | **Thật** |
| OTP SĐT | `ZaloZnsSender`, `SmsFallbackSender` luôn ném lỗi; `OTP_ECHO_DEV_CODE=true` thì trả `devCode` | **Mô phỏng** (chỉ dev) |
| Cọc VietQR | `VietQrSimulator` + `POST /vietqr/webhook` có header secret | **Mô phỏng** |
| eKYC CCCD | `EkycSimulator` | **Mô phỏng** |
| Redis | Có trong `.env` và `backend/docker-compose.yml` | Khai báo, **code không dùng** |
| AI service | FastAPI + LangGraph (`analyze` → `respond`), `gpt-4o-mini` cấu hình sẵn | **Chưa nối** — node trả chuỗi lặp lại input |

## 2. Backend — module và phân quyền

```mermaid
graph LR
    REQ[Request] --> AG{SupabaseAuthGuard}
    AG -->|"@Public()"| RG
    AG -->|JWT HS256 iss=vinstay-backend<br/>cookie vs_access hoặc Bearer| RG{RolesGuard}
    AG -->|thiếu / sai token| E401[401 unauthorized]
    RG -->|"@Roles(...) · @HostRoles(sale|inspector)"| CTRL[Controller]
    RG -->|sai vai| E403[403 forbidden / host_role_missing]

    subgraph Public["Công khai"]
        PR[property · matchmaker<br/>legal/deposit-terms · auth/* · otp<br/>media/listing · vietqr/webhook]
    end
    subgraph Tenant["tenant"]
        BK[bookings/* · bookings/:ref/deposit<br/>bookings/:ref/ekyc · me/*]
    end
    subgraph Landlord["landlord"]
        LL[landlord/* · contracts/mandate/create]
    end
    subgraph Host["field_host"]
        HS[host/board · host/tickets · host/viewings — sale<br/>host/inspections — inspector · host/me]
    end
    subgraph Admin["ops_admin"]
        AD[admin/* · admin/field-hosts<br/>contracts/:id/evidence-package]
    end
    CTRL --> Public & Tenant & Landlord & Host & Admin
```

Module (`backend/src/app.module.ts`): `auth`, `property`, `matchmaker`, `booking`, `dispatch`, `deposit`, `identity`, `contract`, `landlord`, `handover`, `admin`, `account`, `host`, `field-hosts`, `demo`, `host-viewings`, `door`, `inspection` (+ `audit`, `prisma`, `supabase`). Lỗi trả dạng `{success:false, statusCode, code, message, errors}`; thành công bọc `{success:true, statusCode, data}`.

⚠ Đang `@Public` dù tài liệu yêu cầu đăng nhập: `GET /host/earnings`, `GET /handovers/contracts/:id`, `POST /handovers` — xem [BUG-TC04-01](qa/bugs/BUG-TC04-01.md), [BUG-TC04-02](qa/bugs/BUG-TC04-02.md).

## 3. Luồng đặt lịch xem phòng (đã kiểm ở [TC-03](qa/TC-03_booking-e2e.md))

```mermaid
sequenceDiagram
    actor K as Khách thuê
    participant W as Web (BookingSheet)
    participant A as Backend
    participant D as PostgreSQL
    K->>W: chọn căn + khung giờ
    W->>A: GET /properties/units/:code/busy-slots
    W->>A: POST /auth/otp/send {phone, TENANT_VIEWING}
    A-->>W: expiresInSeconds (+ devCode khi dev)
    W->>A: POST /auth/otp/verify {phone, code}
    A-->>W: actionToken (dùng 1 lần, 15 phút)
    W->>A: POST /bookings {unitCode, slot, contactName, phone, actionToken}
    A->>A: kiểm slot (08:30–17:30, ≥30′, ≤14 ngày), căn AVAILABLE, trùng slot
    A->>D: transaction: tạo Viewing PENDING_CONFIRMATION + DispatchTicket (giao Sale phân khu / Open Pool)
    A-->>W: 201 {ref: VS-XXXXX, status: pending, host}
```

## 4. Vòng đời lịch xem (`ViewingStatus`)

```mermaid
stateDiagram-v2
    [*] --> PENDING_CONFIRMATION: khách đặt lịch / đổi giờ
    PENDING_CONFIRMATION --> CONFIRMED: Sale nhận ticket
    CONFIRMED --> LOBBY: khách "Tôi đã có mặt tại sảnh"
    CONFIRMED --> RECEIVING: Host đón khách
    LOBBY --> RECEIVING: Host đón khách
    RECEIVING --> VIEWING: Host mở cửa (cấp mã 10′)
    VIEWING --> CLOSING: khách muốn cọc
    CLOSING --> HOLDING: VietQR 2.000.000đ gạch nợ
    HOLDING --> LEASED: eKYC + ký HĐ thuê
    VIEWING --> COMPLETED: khách chưa quyết
    CLOSING --> COMPLETED: khách chưa quyết
    CONFIRMED --> NO_SHOW: quá giờ hẹn 15′
    LOBBY --> NO_SHOW: quá giờ hẹn 15′
    PENDING_CONFIRMATION --> CANCELLED: khách huỷ (trước ≥ 2h)
    CONFIRMED --> CANCELLED: khách huỷ / căn bị người khác cọc trước
```

Nguồn: `backend/src/modules/host-viewings/viewing-flow.service.ts`, `booking.service.ts`, `deposit.service.ts`, `identity.service.ts`. `REJECTED` có trong enum nhưng chưa có luồng nào đặt trạng thái này.

Trạng thái căn (`UnitStatus`): `AVAILABLE`, `HOLDING`, `RENTED`, `UNLISTED`, `MAINTENANCE`. Cọc giữ chỗ chuyển 100% vào Tiền cọc bảo đảm khi ký HĐ, không trừ vào tiền thuê tháng đầu (`AGENTS.md`).

## 5. Ký gửi → thẩm định → niêm yết

```mermaid
graph LR
    L[Chủ nhà<br/>POST /landlord/consignments] --> S[Ký uỷ quyền OTP<br/>POST .../sign]
    S --> I[Inspector phân khu nhận ca<br/>SLA 48h · Open Pool sau 4h]
    I --> R[Phiếu 32 hạng mục + 4–12 ảnh niêm yết<br/>POST /host/inspections/:id/submit]
    R -->|Đạt| PUB[1 transaction: uỷ quyền ACTIVE<br/>căn AVAILABLE + Verified · ảnh vào UnitMedia]
    R -->|Không đạt| T[uỷ quyền TERMINATED]
    PUB --> CAT[Hiện ở catalog /units]
```

Không qua bước duyệt Admin; Admin ký gửi (`/admin/inventory`) vẫn là mock.

## 6. Môi trường chạy local

| Tiến trình | Lệnh | Cổng |
|---|---|---|
| Backend | `cd backend && npm run start:dev` | 4000 |
| Web | `cd apps/web && pnpm dev` | 3000 (rewrite `/api/v1/*` → `BACKEND_URL`) |
| AI service (tuỳ chọn) | `make run` | 8000 |

CI (`.github/workflows/ci.yml`) chỉ chạy `ruff` + `pytest` cho `src/`; backend (`npm test`) và web (`pnpm test`) chạy tay.
