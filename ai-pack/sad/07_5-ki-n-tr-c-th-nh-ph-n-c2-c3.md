<!-- nguồn: docs/SAD_v2.md, dòng 197–295 -->
## 5. KIẾN TRÚC THÀNH PHẦN (C2 / C3)

**Kiểu triển khai (🔵 đề xuất):** Modular Monolith — các "Service" trong sơ đồ dưới là **module** trong một ứng dụng, không phải microservice. Stack đề xuất: NestJS + Prisma + PostgreSQL (Supabase); Redis/BullMQ 🔵; Object Storage 🟡; Vault/KMS 🟡.

```mermaid
flowchart LR
    subgraph Clients["Giao diện"]
        WebApp["Web App<br>(Khách thuê / Chủ nhà)"]
        HostApp["Mobile Host PWA"]
        AdminPortal["Admin Portal"]
    end

    subgraph API["API Backend (Modular Monolith)"]
        GW["API Gateway / Auth<br>(JWT, rate limit, idempotency)"]
        AuthZ["Authorization Service<br>(policy engine)"]
        Matchmaker["Matchmaker"]
        Booking["Booking / OTP"]
        Dispatcher["Dispatcher (rule engine)"]
        Payment["Payment / Webhook"]
        HoldLock["Holding Lock"]
        Conflict["Conflict Resolver"]
        IdentitySvc["Identity Verification<br>(adapter → eKYC)"]
        KeySvc["Door Key Service"]
        Contract["Contract & E-Sign"]
        Handover["Handover Passport"]
        Commission["Commission & Payout"]
        Notify["Notification"]
        BI["Admin / BI"]
        Audit["Audit Log"]
    end

    subgraph Data["Lưu trữ"]
        DB[("PostgreSQL")]
        Vault[("Vault / KMS<br>mã khóa, dữ liệu định danh")]
        ObjectStore[("Object Storage<br>ảnh căn hộ, PDF, ảnh bàn giao")]
        Queue[("Redis + BullMQ 🔵")]
    end

    subgraph Ext["Bên ngoài"]
        Zalo2["Zalo API"]
        BankAPI["Bank / VietQR"]
        eKYCProvider["FPT.AI eKYC ↔ C06"]
        TSA2["Dấu thời gian (TBD)"]
    end

    WebApp & HostApp & AdminPortal --> GW
    GW -.mọi request.-> AuthZ
    GW --> Matchmaker & Booking & Dispatcher & Payment & HoldLock & Conflict & IdentitySvc & KeySvc & Contract & Handover & Commission & BI
    GW --> Audit
    Booking & Matchmaker & Dispatcher & Payment & HoldLock & Conflict & Contract & Handover & Commission & BI & Audit & AuthZ --> DB
    Payment --> BankAPI
    IdentitySvc --> eKYCProvider
    IdentitySvc --> Vault
    KeySvc --> Vault
    KeySvc --> DB
    Notify --> Zalo2
    Contract --> TSA2
    Contract & Handover --> ObjectStore
    Dispatcher & Booking & HoldLock --> Queue
```

**Ghi chú:**

- Mã khóa cửa và dữ liệu định danh **không nằm dạng plaintext trong Primary DB**; DB chỉ giữ tham chiếu (`vault_secret_ref`), ciphertext ở Vault với khóa quản lý tách biệt.
- `IdentitySvc` là adapter/orchestrator; **không** OCR/Vision trong nội bộ.
- `AuthZ` được Gateway gọi **trước mọi request** tới module nghiệp vụ (§9).

### 5.1 Cấu trúc mã nguồn (🔵 đề xuất)

```
vinstay-backend/src/
├── app.module.ts / main.ts
├── common/
│   ├── guards/            supabase-auth.guard.ts, authz.guard.ts (gọi AuthZ Service)
│   ├── decorators/        @CurrentUser(), @RequirePermission('resource:action'), @Public()
│   ├── interceptors/      idempotency, audit-logging, transform
│   └── filters/
└── modules/
    ├── iam/               Profiles, Roles, Permissions, Supabase Auth hooks
    ├── authz/             Policy engine: role + ownership + ticket state
    ├── property/          Building, Unit, trạng thái available/holding/rented/unlisted
    ├── search/            All-in Cost
    ├── matching/          [Engine 1] Matchmaker
    ├── booking/           Viewing, OTP, xác nhận qua Zalo
    ├── dispatch/          [Engine 2] Dispatcher 3 tầng + worker SLA
    ├── door-key/          Vòng đời mã khóa, reveal, rotate, revoke      (mới)
    ├── payment/           VietQR, webhook, idempotency
    ├── holding/           Khóa căn 7 ngày, hết hạn, UNC tạm 30p
    ├── conflict/          [Engine 3] Hủy lịch trùng, gợi ý căn thay thế
    ├── identity/          [Engine 4] Adapter eKYC, review queue          (thay ocr/)
    ├── contract/          Mandate, thỏa thuận cọc, hợp đồng thuê, ký, niêm phong
    ├── handover/          Hộ chiếu bàn giao, công tơ
    ├── commission/        FeeConfig, host payout
    ├── notification/      Zalo ZNS/OA, SMS dự phòng
    └── admin-bi/          Funnel, SLA, (🔵 heatmap)
```

---

