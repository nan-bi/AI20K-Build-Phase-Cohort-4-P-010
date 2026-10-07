# 01 — Contracts

## 1. Charter
Chủ nhà #1 (Matchmaker tư vấn nhanh), #3 (nội thất chi tiết làm căn cứ) · Khách #1, #2, #4 · Vận hành #1. Tính năng nào trong hồ sơ không trỏ được về đây ⇒ bỏ.

## 2. Schema Prisma (`backend/prisma/schema.prisma`)

```prisma
model Unit {
  // … giữ nguyên các cột cũ …
  securityDeposit Decimal?  @map("security_deposit") @db.Decimal(12, 2) // null ⇒ = baseRentPrice (Q3)
  highlights      String[]  @default([])                                // tối đa 3, mỗi dòng ≤ 60 ký tự
  inventoryItems  UnitInventoryItem[]
}

/// Nội thất thật của căn, ghi khi niêm yết từ 32 dòng thẩm định (hồ sơ 18 SPEC-P01 §3).
model UnitInventoryItem {
  id        String   @id @default(uuid()) @db.Uuid
  unitId    String   @map("unit_id") @db.Uuid
  code      String   @db.VarChar(10)   // mã catalog "1".."32"
  groupCode String   @map("group_code") @db.VarChar(5) // I..VIII
  name      String   @db.VarChar(80)
  qty       Int      @default(1)
  spec      String?  @db.VarChar(120)
  condition Int?                        // độ mới % (thẩm định thật: bội 10; seed demo: nguyên 30–98). Công khai dạng conditionPct (chủ tịch 2026-10-07)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  unit      Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@unique([unitId, code])
  @@map("unit_inventory_items")
}
```
- Chỉ lưu dòng `present = true`.
- `direction` (cột cũ) chỉ nhận 1 trong 8 giá trị: `Đông, Tây, Nam, Bắc, Đông Nam, Đông Bắc, Tây Nam, Tây Bắc` (hằng `DIRECTIONS` ở `backend/src/modules/property/unit-facts.ts`, web import bản sao trong `apps/web/src/lib/units/facts.ts` — test so khớp 2 bản).
- CẤM đổi/xoá cột cũ. CẤM enum Prisma mới cho hướng (đổi danh sách không cần db push).

## 3. API đọc căn (công khai) — bổ sung trường
`GET /api/v1/units/:code` và phần tử của `GET /api/v1/units` (mapper `backend/src/modules/tenant/tenant.mappers.ts`) thêm:

```ts
securityDeposit: number;          // unit.securityDeposit ?? baseRentPrice
holdingDeposit: number;           // số tiền cọc giữ chỗ backend đang thu (Đ7) — lấy từ 1 hằng/hàm duy nhất trong modules/deposit
highlights: string[];
inventory: { code: string /* "1".."32" */; group: 'I'|'II'|'III'|'IV'|'V'|'VI'|'VII'|'VIII'; groupLabel: string; name: string; qty: number; spec: string | null; conditionPct: number | null }[]; // chỉ ở chi tiết, list trả []
```
- `bathrooms`, `direction`, `minMonths`, `title`, `description` đã có — giữ tên.
- `inventory` có `conditionPct` (từ cột `condition`; công khai theo đồng ý chủ tịch 2026-10-07) và `code`; CẤM chứa `compensation`, `photoIds`, ảnh bằng chứng.
- `holdingDeposit`: tách 2.000.000 trong `deposit.service.ts` thành `export function holdingDepositAmount(unit?): number` ở `backend/src/modules/deposit/deposit-amount.ts`, mọi chỗ H7 gọi hàm này. Giá trị trả về KHÔNG đổi ở hồ sơ này.

## 4. API ký gửi / thẩm định

### 4.1 `POST /api/v1/landlord/consignments` — `CreateConsignmentDto` thêm
```ts
bathrooms: number;            // @IsInt @Min(1) @Max(4) — bắt buộc
direction?: string;           // @IsIn(DIRECTIONS)
title?: string;               // ≤ 80
highlights?: string[];        // @ArrayMaxSize(3), mỗi phần tử ≤ 60
description?: string;         // ≤ 600
```
`note` giữ nguyên (ghi chú riêng cho Inspector, KHÔNG công khai). Validator text: SPEC-P01 §4.

### 4.2 `POST /api/v1/host/inspections/:id/submit` — `SubmitInspectionDto` thêm
```ts
facts: { areaM2: number; layout: 'Studio'|'1PN'|'2PN'|'3PN'; bathrooms: number; direction: string | null; floor: number };
pricing: { rent: number; securityDeposit: number; reason?: string }; // VNĐ nguyên; rent ∈ [3_000_000, 200_000_000]; securityDeposit ∈ [holdingDepositAmount(), 3×rent] (cọc bảo đảm không được nhỏ hơn cọc giữ chỗ vì cọc giữ chỗ chuyển 100% vào đó)
listing: { title: string; highlights: string[]; description: string }; // Inspector có thể sửa bản chủ khai
```
Response `InspectionResult.stage` mở rộng: `'approved' | 'rejected' | 'awaiting_landlord'`.

### 4.3 Duyệt giá của chủ — mới
```
POST /api/v1/landlord/consignments/:id/pricing-decision
body: { decision: 'accept' | 'decline' }
200 accept: { stage: 'approved'; unitCode: string; listedAt: string; rent: number; securityDeposit: number }
200 decline: { stage: 'rejected'; unitCode: string; listedAt: null }
```
`GET /api/v1/landlord/consignments/:id` thêm `pricingProposal: { rent; securityDeposit; reason: string|null; proposedAt; original: { rent; securityDeposit } } | null`.

### 4.4 Admin vai Host
`CreateFieldHostDto.roles` / `UpdateFieldHostDto.roles` giữ kiểu `string[]`; service chuẩn hoá qua `normalizeHostRoles` (SPEC-P02 §1) — chỉ chấp nhận đúng 2 tập `{sale}` / `{sale, inspector}` (thứ tự, trùng không quan trọng). Sai ⇒ 400 `HOST_ROLES_INVALID`.

## 5. Contract ai-engine
```
POST {AI_ENGINE_URL}/chat           (chỉ Nest gọi; header X-Internal-Key)
req: { messages: {role:'user'|'assistant'; content:string}[]  // ≤ 20, mỗi content ≤ 2000
       locale: 'vi'|'en'; user?: { firstName?: string }
       searchContext?: SearchContext }   // fix5: tiêu chí bot đang nhớ; khoá lạ bỏ qua
res: text/event-stream, các event:
  event: delta   data: {"text": "..."}
  event: units   data: {"unitCodes": [...], "mode": "search"|"focus", "criteria"?: SearchContext, "matched"?: n,
                         "matchedCodes"?: string[], "assumed"?: {occupants?, motorbikes?, cars?}}   // fix6
                 // unitCodes ≤ 3 = căn bot nhắc trong câu trả lời, chỉ mã có trong kết quả tool.
                 // fix6 (tìm trước, thu hẹp sau): lượt có search_units (matched > 0) kèm `matchedCodes` = mã TẤT CẢ căn khớp theo thứ tự
                 //   xếp hạng matchmaker (≤ 20, ⊆ mã kết quả tool) và `matched` = tổng căn khớp (có thể > 20). Phát event kể cả khi unitCodes [].
                 //   `assumed` = giả định mặc định (occupants 2, motorbikes 1, cars 0) CHỈ cho khoá khách chưa nói; vắng ⇒ khách đã nói đủ.
                 //   matched == 0 ⇒ không có matchedCodes/assumed. Không có matchedCodes (client/engine cũ) ⇒ web dùng unitCodes như trước. Lượt có search_units: kèm `criteria` (của lần gọi CUỐI) + `matched`.
                 // matched == 0 ⇒ VẪN phát units với unitCodes: [] (căn nearMiss KHÔNG ghim) ⇒ web GIỮ danh sách cũ.
                 // Lượt không gọi search_units: như cũ (mode "focus", không criteria).
  event: done    data: {"model": "...", "toolCalls": n, "ms": n}
  event: error   data: {"code": "LLM_UNAVAILABLE"|"TOOL_FAILED"|"BAD_REQUEST"|"POLICY_VIOLATION", "message": "..."}
Tool search_units (fix6): `max_all_in_budget` KHÔNG còn bắt buộc — thiếu ⇒ trần mặc định 30.000.000 (kết quả tool có `budgetAssumed`), người ở/xe thiếu ⇒
  mặc định DTO matchmaker và ghi `assumed`. Gọi `POST /matchmaker/recommend` với `limit: 20`. Kết quả cho LLM: ≤5 căn chi tiết + `totalMatched` + `shown`.
  `totalMatched` = số của matchmaker (`scanSummary.totalMatched`); khi có lọc thêm phía engine (must_have/furnishing/pet/tầng) = số đếm trong ≤20 ứng viên.
Matchmaker (fix6): `MatchmakerRequestDto.limit?: int 1..50` (mặc định 3 ⇒ web/tenant không đổi); `scanSummary.totalMatched` = số căn khớp trước khi cắt; `topRecommendations` cắt theo limit.
SearchContext = { max_all_in_budget?: int 0..1e9; occupants?: int 0..20; motorbikes?: int 0..10; cars?: int 0..10;
                  layout?: 'studio'|'1pn'|'2pn'|'3pn'; furnishing?: 'full'|'basic'|'empty'; pet?: boolean;
                  min_floor?: int 0..100; max_floor?: int 0..100; must_have?: string[] /* ≤5 phần tử, mỗi ≤40 ký tự */ }
  Sai kiểu/giới hạn ⇒ 422 (ai-engine) / 400 (Nest). `_system()` thêm đoạn "Tiêu chí tìm đang áp dụng…": HỢP NHẤT rồi search_units NGAY, không hỏi lại ngân sách/người/xe đã có.
  Web (fix6): preview ghim `matchedCodes` (≤20, theo xếp hạng); căn bot nhắc đứng đầu kèm nhãn "Gợi ý #n"; tiêu đề "N căn khớp" = matched; >12 căn ⇒ hiện 12 + "Xem thêm"; chip "Tạm tính …" từ `assumed`.
  Web: preview THU HẸP DẦN — event units có mã ⇒ thay; unitCodes [] ⇒ GIỮ danh sách cũ + ghi chú; không event ⇒ giữ. Chỉ "Làm mới" và chỉnh FilterTray xoá danh sách (và đặt searchContext = null).
GET {AI_ENGINE_URL}/health → {"ok": true, "model": "openai/gpt-4o-mini"}
```
Nest relay: `POST /api/v1/assistant/chat` (`@Public`, rate-limit 20 req/phút/IP) — cùng body trừ `user` (Nest tự gắn từ phiên), `searchContext` forward nguyên văn sau whitelist + validate (`SearchContextDto`), stream nguyên văn.

## 6. Bảng lỗi
| Mã | Ở đâu | HTTP | Hành vi caller |
| :-- | :-- | :-- | :-- |
| `LISTING_TEXT_FORBIDDEN` | ký gửi / submit | 400, `field` + `reason: phone|url|money` | Web tô đỏ ô, hiện lý do |
| `HOST_ROLES_INVALID` | admin hosts | 400 | Web chỉ cho chọn 2 option, lỗi này = bug |
| `PRICING_NOT_PENDING` | pricing-decision | 409 | Web tải lại hồ sơ |
| `NOT_OWNER` | pricing-decision | 403 | Web về danh sách |
| `REPORT_INVALID` (cũ) | submit thiếu `facts/pricing/listing` | 400 | như hồ sơ 16 |
| `LLM_UNAVAILABLE` | ai-engine → OpenRouter lỗi/timeout 20s | SSE error | Web rơi về bộ lọc cũ cho lượt đó (B8) |
| `TOOL_FAILED` | tool gọi Nest lỗi | SSE error sau khi LLM xin lỗi | Web giữ text đã stream, hiện nút "Thử lại" |
| `POLICY_VIOLATION` | ai-engine chặn câu trả lời vi phạm luật cứng (lượt có text chủ nhập) | SSE error, KHÔNG có delta | Web xử lý như lỗi trước delta đầu ⇒ fallback bộ lọc cũ (B8) |
| `AI_UPSTREAM_DOWN` | Nest relay không nối được ai-engine | 503 | Web rơi về bộ lọc cũ |

## 7. Kiểu web (`apps/web/src/lib/tenant/types.ts`)
`Unit` thêm `securityDeposit: number; holdingDeposit: number; highlights: string[]; inventory: UnitInventoryLine[]`.

## 8. Phạm vi file
| Được sửa/tạo | WP |
| :-- | :-- |
| `backend/prisma/schema.prisma` (chỉ §2) | WP1 |
| `backend/src/modules/{landlord,inspection,tenant,property,deposit}/**` | WP1, WP2 |
| `backend/src/modules/admin/dto/admin.dto.ts`, `admin` service tạo/sửa Host, `backend/src/modules/auth/host-roles.ts` | WP2 |
| `backend/src/modules/assistant/**` (mới) + đăng ký `app.module.ts` | WP6 |
| `apps/web/src/components/{unit,consign,host/inspection,admin,chat}/**`, `apps/web/src/app/landlord/**`, `apps/web/src/lib/{tenant,units,landlord,inspection,admin}/**` | WP3, WP6 |
| `ai-engine/**` (mới), `.gitignore` (đổi `pyproject.toml` → `/pyproject.toml`) | WP5 |
| `ai-engine/knowledge/**` | WP4 |
| Mở rộng đã duyệt sau WP7 (2026-10-07) | `backend/src/modules/{field-hosts,auth}/**` (chuẩn hoá vai), `backend/scripts/`, `components/landlord/**`, `components/host/{InspectionForm,InspectionList}`, `apps/web/src/lib/assistant/**`, `README`s |
| CẤM chạm | `src/` (template Python), `docs/guide/`, `legal/` (chỉ đọc), `lib/mock/**` ngoài việc bỏ import `PASSPORT_ITEMS` khỏi `UnitDetail` |
