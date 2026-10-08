# SPEC-P02 — Vai Host + Thẩm định sửa giá/cọc (WP2)

## 1. Vai Host (C7)
- Tập hợp lệ: `{SALE}` hoặc `{SALE, INSPECTOR}`. Hàm duy nhất `normalizeHostRoles(input: string[]): HostRole[]` ở `backend/src/modules/auth/host-roles.ts`: bỏ trùng, `inspector` mà thiếu `sale` ⇒ ném `HOST_ROLES_INVALID` (KHÔNG tự thêm — Admin phải chọn đúng option); rỗng ⇒ ném.
- Admin tạo/sửa Host gọi `normalizeHostRoles`.
- Dữ liệu cũ: script `backend/scripts/fix-host-roles.ts` thêm `SALE` cho mọi Host có `INSPECTOR` mà thiếu `SALE`, in `fixed=<n>`, idempotent. Ghi `AuditLog` action `HOST_ROLES_UPDATE` cho từng dòng sửa.
- Guard `@HostRoles('inspector')` giữ nguyên (Sale+Thẩm định vẫn qua). `hostHome` giữ nguyên.
- **Vùng cấm:** KHÔNG xoá giá trị enum `INSPECTOR` hay đổi sang enum mới `SALE_INSPECTOR` (đụng guard, dispatch, test của 3 hồ sơ trước).

## 2. State machine ký gửi
```
draft → awaiting_host → inspecting ─┬─ fail ───────────────────────────► rejected
                                    ├─ pass & giá/cọc KHÔNG đổi ──────► approved (niêm yết ngay)
                                    └─ pass & giá/cọc ĐỔI ──► awaiting_landlord
                                                               ├─ accept  ─► approved (giá mới)
                                                               └─ decline ─► rejected (đóng hồ sơ)  [Q1 = (b), chốt]
```
- `ConsignmentStage` (`landlord.mappers.ts:65`) thêm `'awaiting_landlord'`. Suy stage: meta.stage ghi đè như cũ.
- "Đổi" = `pricing.rent !== form.askRent || pricing.securityDeposit !== (form.suggestedDeposit ?? form.askRent)`, so số nguyên sau `Math.round`.
- Khi vào `awaiting_landlord`: lưu `meta.report` (đủ facts/pricing/listing/inventory/ảnh) + `meta.pricingProposal = { rent, securityDeposit, reason, proposedAt, original }`. KHÔNG gọi `ListingPublisher`. Căn giữ `UNLISTED`. Ảnh vẫn trong bucket như hồ sơ 16.
- Nhánh decline (Q1 = b, đã chốt): `stage = 'rejected'`, `decisionNote = "Chủ nhà không đồng ý giá đề xuất"`, KHÔNG gọi `ListingPublisher`, căn giữ `UNLISTED`, mandate như nhánh `rejected` của hồ sơ 16 (không ACTIVE). Ký gửi lại cùng căn: ngoài phạm vi (hồ sơ 16 Q5).

## 3. Niêm yết (mở rộng `ListingPublisher.publish`)
Thêm tham số `agreed: { rent: number; securityDeposit: number }` và ghi trong cùng `unit.update`:
```ts
carpetAreaM2: facts.areaM2, layoutType: toLayout(facts.layout), bathrooms: facts.bathrooms,
direction: facts.direction, floorNumber: facts.floor,
managementFee: Math.round(facts.areaM2 * mgmtRate),          // cùng nguồn mgmtRate với create
baseRentPrice: agreed.rent, securityDeposit: agreed.securityDeposit,
marketAvgPrice: agreed.rent,                                   // giữ bất biến "chưa có badge" (H9)
title, highlights, description                                  // từ report.listing
```
- `floorNumber` đổi ⇒ `unitCode` KHÔNG đổi (mã đã in trong ủy quyền). Ghi chú lệch vào `report.declared` như hiện tại.
- Gọi từ: (1) submit pass không đổi giá ⇒ `agreed = form`; (2) accept ⇒ `agreed = proposal`; decline KHÔNG publish.

## 4. `POST /landlord/consignments/:id/pricing-decision`
- `@Roles('landlord')`, chủ sở hữu mandate; khác ⇒ 403 `NOT_OWNER`.
- Trong `ConsignmentMetaStore.mutate` (khoá dòng, B10): đọc lại stage TRONG khoá; khác `awaiting_landlord` ⇒ 409 `PRICING_NOT_PENDING` (chống bấm 2 lần / 2 tab).
- Ghi `meta.pricingDecision = { decision, decidedAt }`, `stage = 'approved'`, gọi publish, mandate ACTIVE + `validUntil` như nhánh pass hiện tại.
- `AuditLog` action `CONSIGNMENT_PRICING_DECISION`, `newValue: { decision, rent, securityDeposit }`.

## 5. Bảng lỗi bổ sung
| Tình huống | Mã | Hành vi |
| :-- | :-- | :-- |
| Submit thiếu `facts`/`pricing`/`listing` | `REPORT_INVALID` field tương ứng | 400 |
| `pricing.rent` ngoài [3tr, 200tr] (cùng ngưỡng chủ nhà khi ký gửi) hoặc `securityDeposit` ngoài [`holdingDepositAmount()`, 3 × rent] hoặc không phải số nguyên hữu hạn | `REPORT_INVALID` `pricing` | 400 |
| Submit fail kèm pricing | bỏ qua pricing | `rejected` như cũ |
| Inspector nộp lại khi đang `awaiting_landlord` | `REPORT_INVALID` `stage` (cũ: chỉ nộp ở `inspecting`) | 409 |

## 6. Test
| # | Ca |
| :-- | :-- |
| P2-1 | `normalizeHostRoles`: `['sale']`, `['inspector','sale']`, `['sale','sale','inspector']` hợp lệ; `['inspector']`, `[]`, `['admin']` ném |
| P2-2 | Script fix-host-roles idempotent, đếm đúng |
| P2-3 | Pass + giá/cọc không đổi ⇒ `approved`, căn AVAILABLE, `baseRentPrice` = askRent |
| P2-4 | Pass + đổi giá ⇒ `awaiting_landlord`, căn `UNLISTED`, không có `UnitMedia`, `pricingProposal` đủ trường |
| P2-5 | Pass + chỉ đổi cọc ⇒ `awaiting_landlord` |
| P2-6 | accept ⇒ giá mới ở `units` và API công khai |
| P2-7 | decline ⇒ `rejected`, căn `UNLISTED`, không `UnitMedia`, `decisionNote` đúng, không gọi publish |
| P2-8 | Gọi decision 2 lần ⇒ lần 2 409; landlord khác ⇒ 403 |
| P2-9 | Facts sửa diện tích ⇒ `managementFee` tính lại |
| P2-10 | Toàn bộ test `inspection` hồ sơ 16 vẫn xanh (cập nhật fixture thêm facts/pricing/listing, KHÔNG xoá ca) |
