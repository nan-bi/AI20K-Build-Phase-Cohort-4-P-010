# SPEC-P01 — Dữ liệu căn (WP1)

## 1. Luồng dữ liệu
```
Chủ khai (form ký gửi) ──► meta.form (JSON mandate, như cũ) + cột units khi tạo căn UNLISTED
Inspector xác nhận/sửa (facts, pricing, listing, inventory) ──► meta.report
Niêm yết (ListingPublisher) ──► units.* + unit_inventory_items  ◄── UI + ai-engine chỉ đọc ở đây (B1)
```

## 2. Tạo căn khi ký gửi (`landlord-consignment.service.ts` `create`)
BẮT BUỘC ghi vào `units` ngay lúc tạo: `bathrooms`, `direction`, `title`, `highlights`, `description`, `securityDeposit = dto.suggestedDeposit ?? null`, `minLeaseMonths` theo `leaseTerm` (`mid` → 6, `long` → 12, `fixed` → 12, không có → 6), `furnishing` theo `furnished` (`true` → FULL, `false` → EMPTY, null → giữ mặc định).
- Lý do ghi sớm: căn ở trạng thái `UNLISTED`, không công khai; niêm yết chỉ ghi đè bằng bản Inspector đã xác nhận.
- `meta.form` vẫn ghi đủ như cũ (màn thẩm định đọc "chủ khai gì").
- CẤM bỏ `marketAvgPrice: dto.askRent` (H9) — ngoài phạm vi.

## 3. Nội thất khi niêm yết (`listing-publisher.service.ts` `publish`)
Trong cùng giao dịch, sau `unit.update`:
```ts
await tx.unitInventoryItem.deleteMany({ where: { unitId } });
await tx.unitInventoryItem.createMany({ data: report.inventory.filter(l => l.present).map(l => ({
  unitId, code: l.code, groupCode: l.group, name: l.name, qty: l.qty ?? 1,
  spec: l.spec?.trim().slice(0, 120) || null, condition: l.condition ?? null })) });
```
- `groupLabel` cho API lấy từ hằng nhóm của catalog (I = "Phòng khách & sinh hoạt chung", …) — thêm `INSPECTION_GROUPS` vào `inspection.catalog.ts` nếu chưa có, CẤM viết lại nhãn ở mapper.
- Backfill căn đã niêm yết trước hồ sơ này: script `backend/scripts/backfill-unit-inventory.ts` đọc `meta.report.inventory` của mandate `ACTIVE`, idempotent (upsert theo `unitId+code`), in `units=<n> rows=<n>`. Căn seed không có report ⇒ 0 dòng, UI hiện trạng thái rỗng (SPEC-P03 §4).

## 4. Validator text công khai (`backend/src/modules/property/listing-text.ts`)
```ts
export function assertListingText(field: 'title'|'highlights'|'description', value: string): void // ném LISTING_TEXT_FORBIDDEN
```
Chặn (sau khi bỏ dấu, gộp khoảng trắng):
| reason | Quy tắc |
| :-- | :-- |
| `phone` | ≥ 9 chữ số liên tiếp sau khi bỏ `.`, `-`, khoảng trắng, hoặc `0[35789]\d{8}`, `\+84` |
| `url` | `https?://`, `www.`, `zalo.me`, `fb.com`, `facebook.com`, `t.me` |
| `money` | số + `tr`/`triệu`/`k`/`đ`/`vnd`/`m` (vd `8tr5`, `7 triệu`, `500k`); số ≥ 100000 |
- Không chặn: số tầng, diện tích có `m2`/`m²`, "2PN", "1 WC", năm.
- Áp ở: tạo ký gửi (§4.1 contract), submit thẩm định (`listing`) và `spec`/tên dòng X của nội thất (field `inventory.<i>.spec|name`).
- **Quy tắc chống lách (sau thẩm định WP7, F1)** — backend `listing-text.ts` và client `apps/web/src/lib/units/listing-text.ts` dùng CÙNG logic + cùng bảng mẫu `listing-text.cases.ts`: chuẩn hoá NFKC; bỏ zero-width/ký tự điều khiển; chữ số Unicode → ASCII; ký tự không phải chữ/số giữa các số là phân cách; từ chỉ chữ số (không, một…) tính là chữ số, ≥ 8 từ liền ⇒ chặn; chặn `@`, zalo (kể cả `z a l o`), facebook/messenger/telegram/viber/whatsapp/gmail, link rút gọn, domain `.com/.vn/.net/.me/.org/.io/.xyz` viết liền; tiền: `$`/usd, số + tr/triệu/k/củ/nghìn/tỷ, tiền viết bằng chữ, nhóm "5 000 000", số ≥ 100000. `m` sau số chỉ là tiền khi số < 1000 và 30 ký tự trước không có từ khoảng cách/kích thước (cách, gần, xa, cao, rộng, dài, vòng, sát, bán kính, đi bộ). Sửa quy tắc ⇒ sửa CẢ HAI bản và bảng mẫu.
- **Vùng cấm:** KHÔNG tự xoá phần vi phạm rồi lưu (người nhập phải biết text bị từ chối); KHÔNG dùng LLM để kiểm.

## 5. Seed
`backend/prisma/seed_excel_units.ts`: `description` gốc chứa SĐT (vd `LH em 0979841233`) và giá lệch (`8tr5` vs 8.000.000). BẮT BUỘC: seed chạy `assertListingText`; dòng vi phạm ⇒ `description = null`, `title` sinh từ trường cấu trúc (`"{layoutLabel} {area}m² · {zoneName}"`). CẤM sửa tay 55 dòng JSON.

## 6. Test (jest, `backend/src/modules/{landlord,inspection,property}`)
| # | Ca |
| :-- | :-- |
| P1-1 | Tạo ký gửi ghi `bathrooms/direction/title/highlights/description/securityDeposit/minLeaseMonths` vào `units` |
| P1-2 | `direction` ngoài 8 giá trị ⇒ 400 |
| P1-3 | `assertListingText`: 6 mẫu vi phạm (`0979841233`, `0979 841 233`, `+84 97…`, `zalo.me/x`, `8tr5`, `7 triệu`) ném đúng `reason`; 5 mẫu hợp lệ (`Tầng 12`, `45m²`, `2PN 2WC`, `View hồ`, `Năm 2024`) qua |
| P1-4 | Niêm yết ghi đúng số dòng `present=true`; lần 2 không nhân đôi |
| P1-5 | API chi tiết căn: `inventory` có `code` + `conditionPct` (độ mới %, công khai theo chủ tịch 2026-10-07), KHÔNG có `compensation`/`photoIds`; list trả `inventory: []` |
| P1-6 | `securityDeposit` null ⇒ API trả `baseRentPrice` |
| P1-7 | `holdingDeposit` API = giá trị `holdingDepositAmount()`; grep `2000000` trong `modules/deposit/*.ts` (trừ spec) chỉ còn ở `deposit-amount.ts` |
| P1-8 | Backfill chạy 2 lần cho cùng số dòng |

## 3b. Seed nội thất DEMO (fix4, 2026-10-07)
Căn seed Excel không qua thẩm định ⇒ `backend/src/modules/property/unit-inventory-seed.ts` + `npm run seed:unit-inventory` (chạy khô mặc định; `--apply` ghi; `--overwrite` ghi đè căn đã có dòng, mặc định bỏ qua). Định danh theo hash `unitCode`; FULL ~85–100% / BASIC ~35–55% / EMPTY 0 trong 32 hạng mục; `condition` nguyên 30–98. DỮ LIỆU DEMO: căn thật ghi đè bằng thẩm định thật. Ảnh minh hoạ: `apps/web/public/inventory/<code>.jpg`.
