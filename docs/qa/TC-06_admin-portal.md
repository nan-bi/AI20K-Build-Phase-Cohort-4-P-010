# TC-06 — Cổng Admin (Ops Admin Portal)

| Mục | Giá trị |
|---|---|
| Kết quả | **PASS có điều kiện**: backend Admin 208/208 test pass; web typecheck/lint/build pass; web test 2 fail ngoài phạm vi Admin. Trình duyệt: 14/14 trang `/admin/*` tải được, 0 lỗi API, 0 lỗi console (mục 7) |
| Ngày chạy | 2026-10-09 |
| Commit | `4b00d24` (main) |
| Môi trường | local Windows 11, Node v24.19.0; backend `backend/.env` (`:4000`), web `pnpm dev` (`:3000`), DB Supabase cloud (chỉ đọc, trừ 1 lượt đăng nhập); trình duyệt Microsoft Edge headless qua `playwright-core` 1.56.1 |
| Tài khoản | `admin@vinstay.vn` (ops_admin demo) |
| Người chạy | Trần Thu Phương |
| Biên bản liên quan | [docs/ADMIN_PORTAL_FUNCTIONAL_RECORD.md](../ADMIN_PORTAL_FUNCTIONAL_RECORD.md) |
| Bug | [BUG-TC06-01](bugs/BUG-TC06-01.md) (Cao): xoay mã cửa ⇒ Host mất mã. Ghi nhận ngoài phạm vi: `landing-anchors.test.ts` (2 test) |
| Rà soát | Lần 1 + lần 2: Trần Thu Phương (lần 1 qua agent thẩm định độc lập), phán quyết 🔁 SỬA, chi tiết ở biên bản mục 8. Lần 3: Trần Thị Lan, Nguyễn Phương Nam, Nguyễn Khánh Duy, đang chờ. Mentor: Bùi Trung Hiếu |

## 1. Lệnh và kết quả

| # | Lệnh | Exit | Kết quả |
|---|---|---|---|
| 1 | `cd backend && npx jest src/modules/admin src/modules/field-hosts` (trước `prisma generate`) | 1 | 13 suite: 11 pass, 2 fail · 204 test: 203 pass, 1 fail |
| 2 | `cd backend && npx prisma generate` | 0 | Sinh lại Prisma client |
| 3 | `npx jest src/modules/admin src/modules/field-hosts --testTimeout=60000` | 0 | **13/13 suite, 208/208 test pass** |
| 4 | `npx jest src/modules/admin src/modules/field-hosts` (chạy lại, timeout mặc định) | 0 | **13/13 suite, 208/208 test pass**, 0 skip |
| 5 | `cd apps/web && pnpm typecheck` | 0 | `tsc --noEmit` sạch |
| 6 | `pnpm lint` | 0 | 0 error, 1 warning `@next/next/no-img-element` tại `src/components/admin/AdminInventoryDetail.tsx:189` |
| 7 | `pnpm test` | 1 | 34 file (33 pass, 1 fail) · 347 test: 345 pass, 2 fail |
| 8 | `pnpm build` | 0 | Build thành công |

## 2. Lỗi ở lần chạy 1 (đã giải thích)

`admin-flows.spec.ts` không biên dịch được:

```
src/modules/property/property.service.ts:236:9 - error TS2353: Object literal may only specify known properties, and 'inventoryItems' does not exist in type 'UnitInclude<DefaultArgs>'.
```

`schema.prisma:243` có quan hệ `inventoryItems`, nhưng Prisma client trong `node_modules` được sinh từ schema cũ. Sau lệnh 2, lỗi hết. `admin.http.spec.ts` fail 1 test ở lần 1 khi chạy song song lúc máy tải nặng; chạy riêng và ở lần 3, 4 đều pass.

**Lưu ý cho cả nhóm:** sau mỗi lần pull có đổi `backend/prisma/schema.prisma`, chạy `npx prisma generate` trước khi test.

Lượt rà soát lần 1 tự chạy lại cùng lệnh (client Prisma đã mới) và gặp một kiểu lỗi khác: lần 1 exit 1 (`Test Suites: 2 failed, 11 passed, 13 total` · `Tests: 5 failed, 203 passed, 208 total`), cả 5 test đều `Exceeded timeout of 5000 ms for a hook` (4 test "Live Supabase API" + 1 test http). Lần 2 exit 0 (13/13, 208/208); chạy `--runInBand` 2 suite đó thì 37/37 pass. Kết luận: bộ test Admin **chập chờn** vì gọi Supabase thật với timeout hook 5 giây.

## 3. Test web fail (ngoài phạm vi Admin)

```
FAIL  src/tests/landing-anchors.test.ts > anchor tiếng Anh kebab-case (B2) > mọi /#x trong SITE_NAV có id="x" trong Landing.tsx
FAIL  src/tests/landing-anchors.test.ts > điểm vào trợ lý duy nhất (B3) > không còn #ai-tro-ly; href="#top" chỉ ở nút "Lên đầu trang" của footer
AssertionError: expected [ { …(2) } ] to deeply equal []
```

Trang Landing không thuộc Cổng Admin. Test Admin phía web (`admin-contracts.test.ts`) pass.

## 4. Kiểm tra tĩnh mức nối UI (grep `apps/web/src`)

| Endpoint | File gọi | Kết luận |
|---|---|---|
| `bi-funnel`, `dispatch-sla`, `exclusive-inventory` | `AdminDashboard.tsx`, `AdminInventory*.tsx` | Có màn |
| `hold-hours`, `terminate`, `reassign`, `remind-renewal`, `commission-engine`, `deposit-policy`, `payouts/sweep` | `AdminInventoryDetail.tsx`, `AdminInventory.tsx`, `AdminBookings.tsx`, `AdminContractDetail.tsx`, `AdminCommission.tsx`, `AdminSettings.tsx` | Có màn |
| `resolve-unc`, `door-keys` | không có | Chưa có màn |
| `void-hold`, `complete-exit` | chỉ `lib/admin/api.ts` | Có hàm client, không màn nào gọi |
| `escalate` | `AdminDashboard.tsx` (chỉ hiển thị trạng thái) | Không có nút |
| `payouts.csv` | không có; CSV dựng ở client (`AdminCommission.tsx:113`) | Không có audit xuất CSV |
| `contract-templates` (danh sách) | `AdminContractTemplates.tsx` đọc `@/lib/mock/contract-templates` | Dữ liệu tĩnh |
| `consignments/:id/approve\|reject` | không có (Admin); backend trả 501 | Đã ngừng có chủ đích |

## 5. Chưa kiểm chứng và lý do

| Phần | Lý do | Giao cho |
|---|---|---|
| Thao tác GHI trên UI Admin (lưu tham số, giao ca, khóa Host, đổi giờ khóa căn...) | Lượt duyệt ở mục 7 chỉ xem; thao tác ghi làm đổi dữ liệu DB dùng chung | Nguyễn Phương Nam |
| Bố cục mobile của trang Admin | Chỉ chụp ở 1440×900 | Nguyễn Phương Nam |
| Đối chiếu tham số biến phí / chính sách cọc với `legal/` và mô hình tài chính | Cần người nắm tài liệu pháp lý | Nguyễn Khánh Duy |
| Xác nhận từng dòng F1–F19 với code backend (rà soát lần 3) | Lần 1 do agent độc lập làm; cần người thứ hai trong nhóm xác nhận | Trần Thị Lan |

## 6. Dữ liệu test cần dọn

Mọi lệnh ở mục 1 chỉ đọc DB. Lượt duyệt trình duyệt (mục 7) gửi đúng một request ghi là `POST /api/v1/auth/login`.

| Bảng | ID | Người tạo | Ghi chú |
|---|---|---|---|
| `auth_audit_log` | (chưa tra ID) | Lượt duyệt TC-06 | 1 sự kiện đăng nhập thành công của `admin@vinstay.vn`, tối 2026-10-09. Log hợp lệ, không bắt buộc xoá |

## 7. Duyệt giao diện trên trình duyệt — 2026-10-09

Script [`admin-ui.mjs`](evidence/TC-06/admin-ui.mjs) mở Edge headless ở 1440×900. Script chỉ điều hướng và chụp ảnh, không bấm nút ghi, và ghi lại mọi request `/api/v1/*` không phải GET. Với trang chi tiết, script lấy link đầu tiên trên trang danh sách.

### 7.1 Chưa đăng nhập

| Kiểm | Kết quả |
|---|---|
| Mở `/admin/dashboard`, `/admin/hosts` | Chuyển về `/admin/login?next=%2Fadmin%2F...` ✅ |
| `GET /api/v1/admin/bi-funnel` không cookie | 401 ✅ |
| `GET /api/v1/admin/field-hosts` không cookie | 401 ✅ |

### 7.2 Đã đăng nhập `ops_admin`

| Trang | HTTP | Tiêu đề (h1) | API ≥400 | Lỗi console | Ghi chú quan sát từ ảnh chụp |
|---|---|---|---|---|---|
| `/admin/dashboard` | 200 | Tổng quan vận hành | 0 | 0 | Rổ hàng **64 căn** (2 đã thuê, 3 giữ căn, 55 trống); no-show "—" (chưa có ca kết thúc). Không có số "128 căn"/"3.8%" như mô tả Swagger. Cảnh báo "4 ticket quá hạn SLA" chỉ có nút "Điều phối", không có nút leo thang |
| `/admin/inventory` | 200 | Căn hộ và ký gửi | 0 | 0 | Tab Rổ hàng (64), Chờ thẩm định (4), Thoát ủy quyền (0) |
| `/admin/inventory/[id]` (`VHOP-BE-STU-1212`) | 200 | VHOP-BE-STU-1212 | 0 | 0 | "Thời gian khoá căn: 48 giờ (mặc định)"; căn `UNLISTED` nên không cho chỉnh (đúng luật 409). Hồ sơ chủ nhà hiện **họ tên + email dạng rõ** |
| `/admin/bookings` | 200 | Điều phối lịch xem | 0 | 0 | 4 ticket quá hạn 1341–4614 phút, vẫn ghi "Tầng điều phối 1/2"; mỗi dòng có chọn Host + lý do + "Giao ca" (F8) |
| `/admin/contracts` | 200 | Sổ hợp đồng | 0 | 0 | — |
| `/admin/contracts/[key]` (`mandate-…`) | 200 | UQ-2026-BE-STU-8DFC2D | 0 | 0 | — |
| `/admin/contracts/parties` | 200 | Theo bên ký | 0 | 0 | — |
| `/admin/contracts/parties/[id]` | 200 | Nguyễn Văn Minh (Chủ nhà Ký gửi) | 0 | 0 | **Email hiển thị dạng rõ**; điện thoại "—" |
| `/admin/contracts/templates` | 200 | Mẫu hợp đồng | 0 | 0 | Dữ liệu tĩnh (xem mục 4) |
| `/admin/contracts/templates/[id]` (`CORE-01`) | 200 | HĐ ký gửi quản lý cho thuê độc quyền | 0 | 0 | — |
| `/admin/hosts` | 200 | Danh sách Field Host | 0 | 0 | 3 Host (3 Sale, 2 Thẩm định); bảng tràn ngang ở 1440px (cột "Thu nhập" bị cắt) |
| `/admin/hosts/[id]` | 200 | Field Host Demo | 0 | 0 | — |
| `/admin/commission` | 200 | Biến phí Field Host | 0 | 0 | Form chỉ có **5/10 tham số** (xem 7.3); bảng kê tuần 2026-W41; nút "Cập nhật thu nhập" (sweep) và "Xuất CSV"; nhật ký "Chưa có thay đổi nào" |
| `/admin/settings` | 200 | Cài đặt | 0 | 0 | Deposit Policy 0.5 / 1 / 4, bắt buộc lý do, có mô phỏng; nêu rõ cọc 2.000.000đ chuyển 100% thành cọc bảo đảm, không trừ tiền thuê tháng đầu ✅ |

Request ghi phát sinh trong cả lượt duyệt: chỉ `POST /api/v1/auth/login`.

### 7.3 Phát hiện từ lượt duyệt

| # | Phát hiện | Bằng chứng | Mức độ đề xuất |
|---|---|---|---|
| U1 | Form Biến phí chỉ cho sửa 5 khóa: `host_base_viewing_fee`, `host_deal_commission`, `host_rating_multiplier_5star`, `host_campaign_bonus`, `host_inspection_fee`. 5 khóa còn lại (`host_peak_hour_multiplier`, `host_slow_inventory_bonus`, `host_handover_inspection_fee`, `host_peak_hour_start`, `host_peak_hour_end`) chỉ sửa được qua API | Ảnh [`admin_commission.png`](evidence/TC-06/local/admin_commission.png); grep `apps/web/src/components/admin`: 5 khóa sau không xuất hiện | Trung bình (VH4) |
| U2 | Email chủ nhà/bên ký hiển thị dạng rõ ở chi tiết căn và chi tiết bên ký, trong khi biên bản v1 ghi "không hiển thị PII dạng rõ". SĐT của bên ký này trống ("—"); theo code, trang chi tiết sẽ hiện SĐT rõ nếu có (biên bản 6.11) | Ảnh [`admin_inventory__detail_.png`](evidence/TC-06/local/admin_inventory__detail_.png), [`admin_contracts_parties__detail_.png`](evidence/TC-06/local/admin_contracts_parties__detail_.png) | Cần chốt: email có thuộc phạm vi che theo NĐ 13/2023 không |
| U3 | Màn Điều phối hiển thị "Tầng điều phối 1/2" cho ticket quá hạn hàng nghìn phút. Tầng thực tế được tính lại lúc đọc (`backend/src/modules/dispatch/ticket-tier.ts`, dùng ở `host-board.service.ts:62`), nên Host khác vẫn nhận được trong pool. Đây là lệch hiển thị, chưa phải lỗi điều phối | Ảnh [`admin_bookings.png`](evidence/TC-06/local/admin_bookings.png) | Thấp |
| U4 | Bảng Field Host tràn ngang ở 1440px | Ảnh [`admin_hosts.png`](evidence/TC-06/local/admin_hosts.png) | Thấp |
| U5 | Số liệu Dashboard tính từ DB (64 căn), xác nhận câu "128 căn hộ", "no-show 3.8%" trong Swagger là mô tả cũ | Ảnh [`admin_dashboard.png`](evidence/TC-06/local/admin_dashboard.png) | Thấp (sửa mô tả) |

Ảnh chụp và `summary.json`: [evidence/TC-06/local/](evidence/TC-06/local/).

## 8. Duyệt bản deploy Vercel — 2026-10-09

URL `https://ai-20-k-build-phase-cohort-4-p-010.vercel.app`, cùng script và tài khoản, chỉ xem. Request ghi duy nhất: `POST /api/v1/auth/login` (mỗi lượt một lần, tổng 2 lần).

| Kiểm | Lượt nhanh (1,5 giây/trang) | Lượt chậm (7 giây/trang) |
|---|---|---|
| Chưa đăng nhập: `/admin/*` ⇒ login; API `bi-funnel`, `field-hosts` | Chuyển về login ✅; 401/401 ✅ | Chuyển về login ✅ |
| 14 trang sau đăng nhập | 9 trang đúng; `/admin/hosts`, `/admin/commission` **bị đẩy về `/admin/login`**; `/admin/settings` gặp `429 GET /api/v1/auth/session`; 2 trang chi tiết hợp đồng/bên ký không tìm thấy link | **14/14 tải được**; 1 lần `429 GET /api/v1/auth/session` ở chi tiết hợp đồng (trang vẫn hiển thị) |

| # | Phát hiện | Bằng chứng | Mức độ đề xuất |
|---|---|---|---|
| D1 | `GET /auth/session` bị giới hạn tần suất (429). Khi bị 429, phiên bị coi là chưa đăng nhập và người dùng bị đẩy về login | Lượt nhanh: 2 trang bị đẩy về login; lượt chậm vẫn còn 1 lần 429 | Trung bình: Admin chuyển trang nhanh trong lúc demo có thể bị đăng xuất giả |
| D2 | **Bản deploy chạy code khác `main`**: h1 `/admin/contracts` là "Hợp đồng thuê" (main: "Sổ hợp đồng"); mẫu văn bản dùng id `tpl-01` (main: `CORE-01`); h1 `/admin/contracts/templates` là "Danh mục mẫu văn bản" (main: "Mẫu hợp đồng") | So h1 giữa mục 7.2 và lượt deploy; trang chủ trả header `Age: 74487` (cache khoảng 20,7 giờ) | Trung bình: demo trên deploy sẽ không phản ánh `main` |
| D3 | Dữ liệu deploy có Host `Host_test` (`ca7e1852-…`) | Trang `/admin/hosts/[id]` lượt chậm | Thấp: dữ liệu test cần dọn trước Demo Day |

Ảnh chụp và `summary.json`: [evidence/TC-06/deploy-fast/](evidence/TC-06/deploy-fast/), [evidence/TC-06/deploy-slow/](evidence/TC-06/deploy-slow/).
