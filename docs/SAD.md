# VINSTAY AI — SOFTWARE ARCHITECTURE DOCUMENT (SAD)

> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-22  
> **Trạng thái:** Draft — Pending Review  
> **Tài liệu liên quan:** PRD.md · UI_FLOW_SPEC.md · PROJECT_CHARTER.md

---

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Nguyên Tắc Thiết Kế](#2-nguyên-tắc-thiết-kế)
3. [Kiến Trúc Cấp Cao (C1 — Context)](#3-kiến-trúc-cấp-cao-c1--context)
4. [Kiến Trúc Container (C2 — Container)](#4-kiến-trúc-container-c2--container)
5. [Kiến Trúc Component Chi Tiết (C3 — Component)](#5-kiến-trúc-component-chi-tiết-c3--component)
6. [Luồng Dữ Liệu End-to-End](#6-luồng-dữ-liệu-end-to-end)
7. [Thiết Kế Database (ERD)](#7-thiết-kế-database-erd)
8. [API Contract](#8-api-contract)
9. [Kiến Trúc Bảo Mật](#9-kiến-trúc-bảo-mật)
10. [Hạ Tầng & CI/CD](#10-hạ-tầng--cicd)
11. [SLA & NFR](#11-sla--nfr)
12. [Architecture Decision Records (ADR)](#12-architecture-decision-records-adr)

---

## 1. Tổng Quan Kiến Trúc

VinStay AI số hóa vòng đời thuê BĐS tại **Vinhomes Ocean Park** theo luồng:  
**Tìm kiếm → Khớp căn All-in Cost → Đặt lịch xem phòng → Đón tiếp tại sảnh → Cọc giữ chỗ 24h → Ký thỏa thuận điện tử**

### Đặc trưng kiến trúc cốt lõi

| Đặc trưng | Mô tả |
|---|---|
| **Asset-Light** | Zero hardware CapEx; tận dụng thẻ thang máy RFID và khóa điện tử sẵn có |
| **AI-First** | 70% tác vụ lặp lại tự động hoá: Matchmaker, OCR, Dispatcher, Conflict Resolver |
| **Mobile-First** | 100% mobile responsive; Field Host vận hành qua Progressive Web App |
| **Event-Driven** | Webhook VietQR → Trigger chuỗi: khóa căn → hủy lịch → notify Zalo |
| **Zero-Trust Security** | AES-256 CCCD; masked call; ẩn SĐT cá nhân hai chiều |
| **Multi-Tenant RBAC** | 4 vai trò: Tenant / Field Host / Landlord / Platform Admin |

---

## 2. Nguyên Tắc Thiết Kế

```
P1 — Reliability First    : Webhook VietQR ≤ 10s; OCR ≤ 5s; Dispatch ≤ 3 phút
P2 — Privacy by Design    : Nghị định 13/2023/NĐ-CP; AES-256; Consent-gate CCCD
P3 — Operational Lean     : Asset-Light; biến phí 100%; zero lương cứng Host
P4 — Anti-Leakage         : Mask SĐT; VietQR định danh; Attribution Lock Host
P5 — Graceful Degradation : Fallback OCR → form tay; Webhook delay → temporary_holding
P6 — Auditability         : Mọi hành động có Audit Trail (IP, timestamp, actor)
```

---

## 3. Kiến Trúc Cấp Cao (C1 — Context)

```mermaid
graph TB
    subgraph "Actors"
        T["👤 Khách thuê (Tenant)\nTìm căn, đặt lịch, cọc, ký số"]
        H["👤 Field Host\nĐón sảnh, mở cửa, chốt cọc"]
        L["👤 Chủ nhà (Landlord)\nKý gửi độc quyền, theo dõi từ xa"]
        A["👤 Platform Admin\nBI dashboard, cấu hình phí, rổ hàng"]
    end

    subgraph "VinStay AI Platform"
        VS["🏠 VinStay AI\n(Core System)"]
    end

    subgraph "External Systems"
        ZALO["📱 Zalo OA / ZNS\nOTP, nhắc hẹn, bot 1-chạm"]
        VQRB["🏦 VietQR / Ngân hàng\nCọc 2tr, Webhook xác nhận"]
        OCR_API["👁️ AI Vision / OCR\nBóc tách CCCD ≤5s"]
        MAPS["🗺️ Google Maps\nVị trí sảnh tòa"]
        EVN["⚡ EVN API (opt)\nGiá điện theo kỳ"]
    end

    T -- "HTTPS/PWA" --> VS
    H -- "HTTPS/PWA" --> VS
    L -- "HTTPS/Web" --> VS
    A -- "HTTPS/Web" --> VS

    VS -- "ZNS API" --> ZALO
    VS -- "VietQR + Webhook" --> VQRB
    VS -- "REST/gRPC" --> OCR_API
    VS -- "JS SDK" --> MAPS
    VS -- "REST (opt)" --> EVN
```

---

## 4. Kiến Trúc Container (C2 — Container)

```mermaid
graph TB
    subgraph "Frontend Layer"
        FE_T["Tenant Web App\nNext.js 14 PWA\nTìm căn, đặt lịch, cọc, ký OCR"]
        FE_H["Host Mobile PWA\nNext.js 14 PWA\nDashboard ticket, mở cửa, chốt cọc"]
        FE_A["Admin Portal\nNext.js 14\nBI, phí, rổ hàng"]
        FE_L["Landlord Portal\nNext.js 14\nTheo dõi từ xa, ký gửi"]
    end

    subgraph "API & Backend Layer"
        GW["API Gateway\nFastAPI + Nginx\nAuth · Rate Limit · Routing"]
        CORE["Core Service\nFastAPI\nMatchmaker · Viewing · Deposit logic"]
        AI["AI Engine\nFastAPI + LangGraph\nOCR · Matchmaker AI · Dispatcher"]
        NOTIF["Notification Service\nFastAPI + Celery\nZalo ZNS · SMS · T-10m cron"]
        PAY["Payment & Webhook\nFastAPI\nVietQR gen · Webhook handler · Escrow"]
        ADMIN["Admin & BI Service\nFastAPI\nRBAC · Audit · Payout · Heatmap"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL\nSupabase\nCore domain data"]
        REDIS["Redis\nUpstash\nSession · OTP TTL · Holding lock"]
        S3["Object Storage\nS3 / R2\nCCCD ảnh mã hoá · verified_images"]
        VEC["pgvector\nSupabase\nAI Matchmaker embeddings"]
    end

    FE_T & FE_H & FE_A & FE_L --> GW
    GW --> CORE & AI & NOTIF & PAY & ADMIN
    CORE & AI --> PG & REDIS
    AI --> S3 & VEC
    NOTIF --> REDIS
    PAY --> REDIS & PG
```

---

## 5. Kiến Trúc Component Chi Tiết (C3 — Component)

### 5.1 Frontend Pages

```mermaid
graph TD
    HP["/ — Trang chủ\nHero + Bộ lọc All-in Cost"]
    SEARCH["/search — AI Matchmaker Results\nTop 3 card + Badge Căn hời"]
    DETAIL["/units/id — Chi tiết căn\nGallery timestamp · All-in breakdown"]
    BOOK["/book — Đặt lịch\nChọn slot · OTP gate"]
    HOST_D["/host/dashboard — Host Dashboard\nDanh sách ticket · SLA timer"]
    HOST_V["/host/viewing/id — Xem phòng\nXác nhận → nhận mã mở cửa"]
    DEP["/deposit/id — VietQR Cọc\nQR display · countdown"]
    KYC["/deposit/id/kyc — Upload CCCD\nCamera → AI OCR → Review form"]
    SIGN["/deposit/id/sign — Ký thỏa thuận\nPDF preview → OTP ký số"]
    ADMIN["/admin — BI Dashboard\nFunnel · Heatmap · Host SLA"]

    HP --> SEARCH --> DETAIL --> BOOK --> HOST_D --> HOST_V --> DEP --> KYC --> SIGN
```

### 5.2 AI Engine — 4 Module

```mermaid
graph LR
    subgraph "AI Engine Service"
        MM["🤖 AI Matchmaker\n• Filter: all_in ≤ budget\n• Rank: savings%, rating, recency\n• Badge: savings ≥ 10%\n• Top 3 results\nSLA: ≤ 3s"]
        OCR["👁️ AI OCR CCCD\n• Pre-process: denoise/deskew\n• Vision API call\n• Parse NLP fields\n• Confidence < 85% → flag manual\nSLA: ≤ 5s"]
        DISP["📍 AI Dispatcher (3-tier)\n• Tier1: block match ≤200m\n• Tier2: open pool ≤500m\n• Tier3: Area Lead escalate\nSLA: assignment ≤30s"]
        CONF["⚔️ Conflict Resolver\n• Triggered by VietQR webhook\n• Bulk cancel competing viewings\n• ZNS xin lỗi + 2 alternatives\n• Hot flag if ≥3 views/24h"]
    end
```

### 5.3 Notification — Loại thông báo

| Trigger | Kênh | Nội dung chính |
|---|---|---|
| OTP đặt lịch | Zalo ZNS / SMS | Mã 4 số, TTL 5 phút |
| Booking confirmed | Zalo ZNS | `booking_ref_code`, Maps link, tên Host |
| **T-10m reminder** | Zalo ZNS (interactive) | Nút `[Tôi đã có mặt]` / `[Đang trên đường]` |
| Host alert T-10m | Push + ZNS | Tên khách, mã căn, tòa |
| No-show T+15m | Zalo ZNS (interactive) | Gia hạn / Hủy |
| Cọc thành công | Zalo ZNS | PDF link, expires_at |
| Lịch bị hủy | Zalo ZNS | Xin lỗi + 2 căn thay thế |
| Chủ nhà: mở cửa | Zalo ZNS | Log timestamp mở cửa |
| OTP ký số | Zalo ZNS / SMS | Mã xác nhận ký thỏa thuận |

---

## 6. Luồng Dữ Liệu End-to-End

### 6.1 Luồng AI Matchmaker

```mermaid
flowchart TD
    A["Input: budget_max, num_occupants,\nlayout_pref, parking_needs"]
    B["SQL Filter:\nSELECT units WHERE status='available'\nCompute all_in = rent+mgmt+parking+utility\nWHERE all_in ≤ budget_max"]
    C["Scoring:\nscore = w1×savings_pct + w2×rating\n      + w3×image_recency + w4×host_avail\nORDER BY score DESC"]
    D{"savings_pct ≥ 10%?"}
    E["Badge: Căn hời phân khu\nTiết kiệm X%"]
    F["Listing thường"]
    G["Top 3 results"]
    H["Hot Flag Check:\nCOUNT viewings/24h ≥ 3\n→ is_hot = TRUE"]
    I["Response JSON:\nunit_code, all_in_cost,\nbreakdown, badge?, is_hot,\navailable_slots"]

    A --> B --> C --> D
    D -- Có --> E --> G
    D -- Không --> F --> G
    G --> H --> I
```

### 6.2 Luồng Đặt Lịch & Dispatch Field Host

```mermaid
flowchart TD
    A["Tenant chọn unit_id + viewing_slot"]
    B["OTP Gate:\nGửi OTP 4 số → Zalo/SMS\nTTL: 5 phút - Redis"]
    C{"OTP đúng?"}
    D["Retry max 3x\nLock 10 phút"]
    E["POST /viewings\n{unit_id, slot, tenant_phone, name, otp}"]
    F["Tạo viewing: status='pending'\nSinh booking_ref_code"]
    G1{"Tier 1: Host.block = unit.block\nAND active AND no overlap ±45m?"}
    G2{"Tier 2: active\nAND distance ≤500m?"}
    G3["Tier 3: Escalate\n→ Area Lead"]
    H["Assign host_id\nstatus = 'confirmed'\nPush notification → Host"]
    I["Zalo ZNS → Tenant:\nref_code, host (masked), Maps link, slot"]
    J["Schedule Celery:\nT-10m: send_reminder\nT+0: noshow_check_start\nT+15m: noshow_escalate"]

    A --> B --> C
    C -- Sai --> D
    C -- Đúng --> E --> F --> G1
    G1 -- Có --> H
    G1 -- Không --> G2
    G2 -- Có --> H
    G2 -- Không --> G3
    H --> I --> J
```

### 6.3 Luồng Chốt Cọc VietQR & AI OCR CCCD

```mermaid
flowchart TD
    A["Host bấm Khách Chốt"] --> B["POST /deposits\n{viewing_id, unit_id}"]
    B --> C["Sinh VietQR động:\namount=2,000,000\ncontent='COC {unit_code} {tenant_phone}'\nexpiry=15 phút"]
    C --> D["Tenant quét QR → chuyển khoản"]
    D --> E["Bank → POST /webhooks/vietqr"]

    E --> E1["Verify HMAC-SHA256 signature"]
    E1 --> E2["Idempotency: Redis SETNX payment_ref"]
    E2 -- Chưa xử lý --> F["Atomic TX:\nunits.status = 'holding'\nholding_expires_at = NOW()+24h\ndeposits.payment_status = 'paid'\nRedis lock:unit TTL 24h"]
    E2 -- Đã xử lý --> SKIP["Bỏ qua (idempotent)"]

    F --> G["Parallel: AI OCR Flow"]
    F --> H["Parallel: Conflict Resolver"]

    subgraph "AI OCR Flow"
        G --> G1["Upload CCCD 2 mặt → S3 AES-256\nPre-signed URL TTL 30m"]
        G1 --> G2["Google Vision API\nExtract: fullname, cccd_no,\nissued_date, address + confidence"]
        G2 --> G3{"confidence ≥ 85%?"}
        G3 -- Đúng --> G4["Auto-fill PDF thỏa thuận cọc"]
        G3 -- Không --> G5["Flag fields nghi ngờ\n→ Form tay viền đỏ"]
        G5 --> G4
        G4 --> G6["Tenant review → Ký\n→ OTP Zalo/SMS ký số\nAudit: IP, device, ts"]
    end

    subgraph "Conflict Resolver"
        H --> H1["SELECT viewings WHERE unit_id=?\nAND status IN (pending,confirmed)\nAND id ≠ current"]
        H1 --> H2["Bulk cancel:\nstatus='cancelled'\nreason='auto_cancelled_due_to_deposit'"]
        H2 --> H3["ZNS xin lỗi + 2 căn thay thế\n(same layout, cost diff ≤5%)"]
    end
```

### 6.4 State Machine — Vòng Đời Lịch Hẹn

```mermaid
stateDiagram-v2
    [*] --> Pending : POST /viewings created

    Pending --> Confirmed : Host assigned (Dispatcher)
    Confirmed --> CheckedIn : Tenant bấm Tôi đã có mặt
    Confirmed --> NoShowAlert : T+15m không phản hồi

    NoShowAlert --> Extended : Gia hạn 15 phút
    NoShowAlert --> CancelledNoShow : Hủy hoặc không phản hồi +5m

    Extended --> CheckedIn : Tenant đến
    Extended --> CancelledNoShow : Hết gia hạn

    CheckedIn --> ViewingInProgress : Host bắt đầu tiếp đón
    ViewingInProgress --> Completed : Khách không chốt
    ViewingInProgress --> DepositInitiated : Host bấm Khách Chốt

    DepositInitiated --> Holding : VietQR Webhook paid
    Holding --> Signed : AI OCR + OTP ký thành công

    Signed --> [*] : Deal done
    CancelledNoShow --> [*] : Free Host slot
    Completed --> [*] : Host nhận Ticket Fee
```

---

## 7. Thiết Kế Database (ERD)

```mermaid
erDiagram
    field_hosts {
        UUID id PK
        VARCHAR full_name
        VARCHAR phone UK
        VARCHAR assigned_block
        VARCHAR rfid_card_number
        VARCHAR status "active|busy|off_duty"
        DECIMAL rating "1.00-5.00"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    units {
        UUID id PK
        VARCHAR unit_code UK "VHOP-S1.02-12A08"
        VARCHAR block_name
        VARCHAR layout_type "Studio|1PN+|2PN_1WC|2PN_2WC|3PN"
        DECIMAL base_rent_price
        DECIMAL management_fee
        DECIMAL parking_fee_estimate
        DECIMAL utility_cost_estimate
        DECIMAL market_avg_price
        VARCHAR door_access_code "nullable|PHYSICAL_KEY"
        JSONB verified_images
        VARCHAR status "available|holding|rented|unlisted"
        BOOLEAN is_hot "default false"
        TIMESTAMP holding_expires_at
        VARCHAR landlord_phone
        UUID landlord_user_id FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    viewings {
        UUID id PK
        UUID unit_id FK
        UUID host_id FK
        VARCHAR tenant_name
        VARCHAR tenant_phone
        TIMESTAMP viewing_slot
        VARCHAR booking_ref_code UK
        VARCHAR status "pending|confirmed|checkedin|inprogress|completed|no_show|cancelled"
        VARCHAR cancel_reason
        TIMESTAMP checked_in_at
        TIMESTAMP completed_at
        INTEGER tenant_rating "nullable 1-5"
        TIMESTAMP created_at
    }

    holding_deposits {
        UUID id PK
        UUID viewing_id FK
        UUID unit_id FK
        JSONB tenant_id_card_data "AES-256 encrypted"
        DECIMAL deposit_amount "default 2000000"
        VARCHAR vietqr_payment_code
        VARCHAR payment_ref UK
        VARCHAR payment_status "pending|paid|expired|refunded"
        VARCHAR signed_agreement_url "S3 URL"
        TIMESTAMP signed_at
        TIMESTAMP expires_at "NOW()+24h"
        JSONB audit_trail "IP, device, timestamps"
        TIMESTAMP created_at
    }

    landlords {
        UUID id PK
        VARCHAR full_name
        VARCHAR phone UK
        VARCHAR email
        VARCHAR status "active|suspended"
        TIMESTAMP created_at
    }

    mandate_contracts {
        UUID id PK
        UUID unit_id FK
        UUID landlord_id FK
        VARCHAR status "active|termination_requested|countdown|unlisted"
        TIMESTAMP termination_requested_at
        TIMESTAMP mandate_ends_at "termination_req+15d"
        INTEGER notice_days "default 15"
        JSONB terms
        TIMESTAMP created_at
    }

    fee_configs {
        UUID id PK
        DECIMAL base_viewing_fee
        DECIMAL deal_commission_pct
        DECIMAL rating_multiplier
        JSONB campaign_bonuses
        UUID changed_by FK
        TIMESTAMP effective_from
        JSONB audit_log "actor, old_val, new_val, reason"
    }

    payout_records {
        UUID id PK
        UUID host_id FK
        DECIMAL total_ticket_fees
        DECIMAL total_commissions
        DECIMAL total_bonuses
        DECIMAL payout_total
        VARCHAR period "2026-W38"
        VARCHAR status "pending|processed|paid"
        VARCHAR report_url "S3 PDF"
        TIMESTAMP created_at
    }

    units         ||--o{ viewings          : "has many"
    field_hosts   ||--o{ viewings          : "assigned to"
    viewings      ||--o| holding_deposits  : "leads to"
    units         ||--o{ holding_deposits  : "for unit"
    landlords     ||--o{ units             : "owns"
    units         ||--o| mandate_contracts : "governed by"
    landlords     ||--o{ mandate_contracts : "signs"
    field_hosts   ||--o{ payout_records    : "earns"
```

**Indexes quan trọng:**

```sql
-- Matchmaker filter performance
CREATE INDEX idx_units_status_rent ON units(status, base_rent_price);
CREATE INDEX idx_units_block       ON units(block_name);

-- Viewing dispatch
CREATE INDEX idx_viewings_slot_status ON viewings(viewing_slot, status);
CREATE INDEX idx_viewings_unit_id     ON viewings(unit_id);

-- Hot flag computation
CREATE INDEX idx_viewings_unit_slot ON viewings(unit_id, viewing_slot)
    WHERE status IN ('pending','confirmed');

-- Deposit idempotency
CREATE UNIQUE INDEX idx_deposits_payment_ref ON holding_deposits(payment_ref);
```

---

## 8. API Contract

### 8.1 AI Matchmaker

```http
POST /api/v1/ai/matchmaker
Authorization: Bearer {jwt}

Request:
{
  "budget_max": 8500000,
  "num_occupants": 2,
  "layout_pref": "2PN_1WC",
  "parking_needs": { "motorbike": 1, "car": 0 }
}

Response 200:
{
  "query_time_ms": 1240,
  "results": [
    {
      "unit_id": "uuid",
      "unit_code": "VHOP-S1.02-12A08",
      "layout_type": "2PN_1WC",
      "base_rent_price": 6800000,
      "all_in_cost": 8320000,
      "breakdown": {
        "rent": 6800000,
        "management_fee": 570000,
        "parking": 150000,
        "utilities": 600000
      },
      "badge": "BARGAIN",
      "savings_pct": 12.5,
      "is_hot": true,
      "available_slots": ["2026-09-24T08:30", "2026-09-24T14:00"],
      "thumbnail_url": "https://s3.../thumb.jpg"
    }
  ]
}
```

### 8.2 Đặt Lịch Xem Phòng

```http
POST /api/v1/viewings
Authorization: Bearer {jwt}

Request:
{
  "unit_id": "uuid",
  "viewing_slot": "2026-09-24T14:00:00+07:00",
  "tenant_name": "Nguyễn Văn A",
  "tenant_phone": "0912345678",
  "otp_code": "4829"
}

Response 201:
{
  "viewing_id": "uuid",
  "booking_ref_code": "VS-2026-09-24-8X4K",
  "host": {
    "name": "Trần Thị B",
    "phone_masked": "091****678",
    "block": "S1.02"
  },
  "maps_link": "https://maps.google.com/?q=...",
  "reminder_scheduled_at": "2026-09-24T13:50:00+07:00"
}
```

### 8.3 Sinh VietQR & Webhook

```http
POST /api/v1/deposits
Authorization: Bearer {jwt} (host role)

Request:
{
  "viewing_id": "uuid",
  "unit_id": "uuid"
}

Response 201:
{
  "deposit_id": "uuid",
  "amount": 2000000,
  "payment_content": "COC VHOP-S1.02-12A08 0912345678",
  "qr_data": "00020101021238...",
  "expires_in_seconds": 900
}

---

POST /webhooks/vietqr  (from Bank → VinStay)
X-Signature: HMAC-SHA256(secret, body)

Payload:
{
  "payment_ref": "COC-VHOP-S1.02-12A08-0912345678-1727012345",
  "amount": 2000000,
  "status": "SUCCESS",
  "transaction_id": "MB20260924001234",
  "timestamp": "2026-09-24T14:22:10+07:00"
}
```

### 8.4 AI OCR CCCD

```http
POST /api/v1/ai/ocr/cccd
Authorization: Bearer {jwt}
Content-Type: multipart/form-data

Fields:
  deposit_id: "uuid"
  front_image: <binary>
  back_image: <binary>

Response 200:
{
  "processing_time_ms": 3820,
  "confidence": 0.94,
  "extracted": {
    "fullname": "NGUYEN VAN AN",
    "cccd_no": "001234567890",
    "issued_date": "2022-08-15",
    "address": "So 12 Pho Le Loi, Q. Hoan Kiem, Ha Noi"
  },
  "flagged_fields": [],
  "requires_manual_review": false
}
```

---

## 9. Kiến Trúc Bảo Mật

```mermaid
graph TB
    L1["🌐 L1 — Transport\nHTTPS/TLS 1.3 · HSTS · Nginx rate limit"]
    L2["🔐 L2 — Authentication\nSupabase Auth JWT RS256\nOTP Zalo/SMS TTL 5m max 3 retry\nRefresh token rotation"]
    L3["🛡️ L3 — Authorization (RBAC)\ntenant: listings, booking, upload CCCD\nhost: ticket, confirm viewing, chốt cọc\nlandlord: listing + door_access_code\nadmin: full CRUD + fee config + BI\nRow-level security (Supabase RLS)"]
    L4["🔒 L4 — Data Encryption\nCCCD images: AES-256-GCM at rest S3\nCCCD OCR JSON: pgcrypto in DB\nPre-signed URL TTL 30 phút\nDoor access code: encrypted column\nMask SĐT: landlord ẩn với tenant/host"]
    L5["📋 L5 — Compliance NĐ 13/2023\nConsent gate trước upload CCCD\nCCCD chỉ dùng cho KYC transaction\nRight to deletion (soft delete)\nAudit trail: user_id, IP, device, ts\nWebhook: HMAC-SHA256 verify"]
    L6["🔗 L6 — Anti-Leakage\nMasked Call: ẩn SĐT chủ nhà/khách\nAttributionLock: deposit.host_id cứng\nVietQR định danh nền tảng\nMandate contract 15-day exit clause"]

    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

**Tuân thủ Nghị định 13/2023/NĐ-CP:**

| Yêu cầu pháp lý | Cơ chế kỹ thuật |
|---|---|
| Chỉ thu thập dữ liệu cần thiết | CCCD chỉ lấy 4 trường KYC (tên, số, ngày, địa chỉ) |
| Consent của chủ thể dữ liệu | Checkbox + timestamp consent trước upload |
| Bảo vệ dữ liệu cá nhân | AES-256 S3 + pgcrypto DB + pre-signed URL |
| Quyền xóa dữ liệu | Soft delete + purge CCCD sau 90 ngày deal expired |
| Audit trail pháp lý | JSON audit_trail nhúng trong holding_deposits |
| Ký số hợp lệ | OTP ký kèm IP, device, timestamp → PDF Audit Trail |

---

## 10. Hạ Tầng & CI/CD

### 10.1 Infrastructure Diagram

```mermaid
graph TB
    subgraph "Edge"
        CF["Cloudflare CDN\nStatic assets · DDoS protection"]
    end

    subgraph "Compute — Railway"
        FE["Next.js App\nVercel / Railway"]
        API["FastAPI Backend\nRailway Autoscale"]
        AI_W["AI Engine\nRailway GPU (opt)"]
        CEL["Celery Workers\n2 replicas"]
        BEAT["Celery Beat\nScheduler 1 instance"]
    end

    subgraph "Managed Data"
        SB["Supabase\nPostgreSQL 15 + Auth\n+ Realtime + RLS + pgvector"]
        RD["Upstash Redis\nServerless\nSession · OTP · Locks"]
        S3M["Cloudflare R2 / AWS S3\nCCCD + verified_images"]
    end

    subgraph "External"
        ZA["Zalo OA ZNS"]
        BK["MB Bank VietQR API"]
        GV["Google Cloud Vision OCR"]
        GM["Google Maps Platform"]
    end

    CF --> FE --> API --> AI_W
    API --> CEL & BEAT
    API & AI_W --> SB & RD
    AI_W --> S3M & GV
    API --> ZA & BK & GM
```

### 10.2 Môi Trường

| Môi trường | URL | Mục đích |
|---|---|---|
| **Local Dev** | `localhost:3000 / :8000` | Phát triển cá nhân |
| **Staging** | `staging.vinstay.ai` | QA, demo nội bộ |
| **Production** | `vinstay.ai` | Pilot Ocean Park |

### 10.3 CI/CD Pipeline

```mermaid
flowchart LR
    DEV["Developer\npush feature/*"] --> PR["Pull Request → main"]
    PR --> CI["GitHub Actions:\n• ESLint + Ruff lint\n• Pytest + Jest tests\n• Pyright + tsc type-check\n• Docker build smoke test"]
    CI -- Pass --> STG["Auto-deploy Staging"]
    STG --> QA["QA:\n• Playwright smoke tests\n• Webhook integration test"]
    QA -- Approved --> PROD["Manual trigger\nDeploy Production\n(Blue-Green)"]
```

---

## 11. SLA & NFR

| Yêu cầu | Mục tiêu | Cơ chế |
|---|---|---|
| AI Matchmaker latency | ≤ 3s (p95) | Index `status, all_in_cost`; pgvector HNSW |
| AI OCR CCCD | ≤ 5s (p95) | Google Vision API; image pre-processing |
| VietQR Webhook | ≤ 10s | Celery async; Redis atomic SETNX |
| Host Dispatch SLA | ≤ 3 phút nhận ticket | Push + 3-tier escalation fallback |
| API uptime | ≥ 99.5% | Railway autoscale; Supabase managed HA |
| Mobile Responsive | iOS Safari + Android Chrome | PWA; Playwright cross-browser CI |
| CCCD Encryption | AES-256-GCM | S3 SSE-C + pgcrypto |
| OTP TTL | 5 phút; max 3 retry; lockout 10m | Redis EXPIRE + counter |
| Audit trail retention | 12 tháng | PostgreSQL partition by month |
| Holding lock timeout | 24h auto-release | Redis TTL + Supabase pg_cron |

---

## 12. Architecture Decision Records (ADR)

### ADR-001 — Supabase làm Primary Database Platform

**Quyết định:** Dùng Supabase (PostgreSQL 15) thay vì bare PostgreSQL  
**Lý do:**
- Auth (JWT + RLS) built-in → giảm effort bảo mật  
- Supabase Realtime → push trạng thái `holding` tức thì  
- pgvector extension → AI Matchmaker không cần Vector DB riêng  
- Managed HA + backup tự động  

**Đánh đổi:** Nhẹ vendor lock-in; query complexity có giới hạn

---

### ADR-002 — Celery + Redis cho T-10m Notification Scheduling

**Quyết định:** Celery Beat schedule dynamic reminder, không dùng fixed cron  
**Lý do:**
- Viewing slots hoàn toàn động → cần `apply_async(countdown=seconds_until_t10)`  
- Redis đã có sẵn cho OTP và holding lock  
- Retry policy: `max_retries=3, countdown=60`  

**Đánh đổi:** Cần maintain Celery worker infra; crash recovery cần xử lý

---

### ADR-003 — VietQR Idempotency qua Redis SETNX

**Quyết định:** `Redis SETNX payment_ref 1 EX 86400` trước khi xử lý webhook  
**Lý do:**
- Bank webhook có thể gửi duplicate (network retry)  
- Ngăn double `holding` và double payout tuyệt đối  
- Fallback: `UNIQUE constraint` trên `holding_deposits.payment_ref`  

**Đánh đổi:** Nếu Redis restart trước TTL → fallback DB constraint bắt lỗi 409

---

### ADR-004 — S3 Pre-signed URL (TTL 30m) cho CCCD Upload

**Quyết định:** Client upload CCCD thẳng lên S3, không qua backend  
**Lý do:**
- Giảm bandwidth API server (ảnh 2-5MB)  
- File không bao giờ unencrypted trên server disk  
- Pre-signed TTL 30m → exposure window ngắn  

**Đánh đổi:** Client cần handle multipart upload; CORS config S3 bucket cẩn thận

---

### ADR-005 — PWA thay vì Native App cho Field Host

**Quyết định:** Host dùng Next.js PWA thay vì React Native riêng  
**Lý do:**
- MVP: không đủ thời gian App Store review (iOS 7-14 ngày)  
- PWA Add-to-Home-Screen đủ trải nghiệm native  
- Web Push + Zalo ZNS thay thế native push  
- Single codebase, deploy tức thì không qua review  

**Đánh đổi:** iOS Safari camera API có hạn chế nhỏ → fallback `<input type=file>`

---

*SAD này sẽ được cập nhật song song với các sprint phát triển. Mọi thay đổi kiến trúc lớn cần tạo ADR mới và cập nhật sơ đồ tương ứng.*
