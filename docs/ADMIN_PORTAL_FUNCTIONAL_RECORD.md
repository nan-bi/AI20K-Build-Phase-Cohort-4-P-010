# BIÊN BẢN CHỨC NĂNG — CỔNG ADMIN (OPS ADMIN PORTAL)

| Mục | Nội dung |
| :-- | :-- |
| Dự án | VinStay AI — Team P-010 (VinUni AI20K Build Phase) |
| Phạm vi | Cổng Admin: `apps/web/src/app/admin/*` (14 trang) + API `backend/src/modules/admin`, `backend/src/modules/field-hosts` |
| Ngày lập | 2026-10-09 |
| Commit đo | `4b00d24` (main) |
| Môi trường đo | local (`:4000` + `:3000`) và bản deploy `https://ai-20-k-build-phase-cohort-4-p-010.vercel.app` |
| Người lập | Trần Thu Phương |
| Vai trò truy cập | `ops_admin` (`@Roles('ops_admin')` trên cả hai controller; phiên = cookie httpOnly do backend ký) |
| Tài liệu gốc | `AGENTS.md` (4 nỗi đau Chủ nhà + 5 điểm nghẽn vận hành), `docs/UI_FLOW_SPEC.md` mục Admin, `docs/SAD_v2.md` |
| Swagger | `http://localhost:4000/api/docs` → nhóm "10. Admin Portal & Quản trị vận hành" |
| Báo cáo QA kèm theo | [docs/qa/TC-06_admin-portal.md](qa/TC-06_admin-portal.md) · bug [BUG-TC06-01](qa/bugs/BUG-TC06-01.md) |
| Phiên bản biên bản | v2: đã sửa theo rà soát lần 1 và lần 2 (mục 8); chờ rà soát lần 3 |

---

## 1. Mục đích

Admin là nơi **cấu hình luật chơi và giám sát vận hành**. Các tác vụ thực địa (đón khách, mở cửa, thẩm định) vẫn do Field Host làm. Mỗi chức năng dưới đây đều phải bám một nỗi đau hoặc điểm nghẽn trong `AGENTS.md`; chức năng nào không bám được thì không đưa vào MVP.

## 2. Bảng chức năng

Cột "Bám" tham chiếu `AGENTS.md`: **CN** = nỗi đau Chủ nhà, **VH** = điểm nghẽn vận hành. Cột "UI" ghi mức nối giao diện, đã kiểm bằng grep và bằng trình duyệt: ✅ có màn, gọi API thật và chạy được · ⚠️ có màn nhưng thiếu một phần · ❌ chỉ có API, chưa có điều khiển trên UI · ⛔ backend chủ động từ chối (501/503).

| # | Chức năng | Màn hình | API (`/api/v1/admin/...`) | Bám | UI | Luật nghiệp vụ / ràng buộc |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| F1 | **Dashboard BI**: phễu 6 giai đoạn (giai đoạn 1–2 chưa có nguồn, trả `null`), bản đồ nhiệt lấp đầy **theo từng tòa**, tỷ lệ no-show | `/admin/dashboard` | `GET bi-funnel` | CN1, VH3 | ✅ | Chỉ đọc. Số liệu tính từ DB (lúc đo: 64 căn) |
| F2 | **Rổ hàng độc quyền**: danh sách căn, lọc trạng thái **phía client** (`available/holding/rented/unlisted/maintenance`), chi tiết căn | `/admin/inventory`, `/admin/inventory/[id]` | `GET exclusive-inventory`, `GET exclusive-inventory/:id` | VH1 | ✅ | Chỉ đọc. API chi tiết **không** trả nhật ký xem phòng |
| F3 | **Thời hạn khóa căn theo từng căn** | `/admin/inventory/[id]` | `POST exclusive-inventory/:id/hold-hours` | CN1 | ✅ | Số nguyên 12–72 giờ; `null` = về mặc định (48 giờ, hoặc `FeeConfig.hold_hours_default` nếu có); 409 nếu căn không còn `AVAILABLE`; bắt buộc lý do; audit `UNIT_HOLD_HOURS_UPDATED` |
| F4 | **Duyệt / từ chối hồ sơ ký gửi** thủ công | — | `POST consignments/:id/approve`, `POST consignments/:id/reject` | VH1 | ⛔ | Trả **501 Not Implemented** (`admin.service.ts:22-32`); riêng `reject` thiếu `note` bị ValidationPipe trả 400 trước. Luồng đã thay bằng: Host Thẩm định đạt ⇒ căn tự niêm yết, không qua Admin |
| F5 | **Chấm dứt ủy quyền độc quyền** (đếm ngược thoát 15 ngày) | `/admin/inventory` (terminate) | `POST mandates/:id/terminate`, `POST contracts/:id/complete-exit` | VH1 | ⚠️ | `terminate`: mandate phải ở `EXIT_REQUESTED` và đã báo trước đủ 15 ngày; 409 nếu căn `HOLDING` hoặc có hợp đồng thuê hiệu lực; bắt buộc lý do; có audit. `complete-exit`: `:id` là **mandate id** dù route nằm dưới `contracts/`, lý do cố định trong code; chưa có nút |
| F6 | **Giám sát điều phối SLA 3 tầng** (Field Host gần nhất → Open Pool 500m sau 3 phút → Area Lead) | `/admin/dashboard`, `/admin/bookings` | `GET dispatch-sla`, `GET dispatch-sla/summary` | VH5 | ✅ | Cảnh báo đỏ khi ticket `OFFERED` quá hạn. Màn hiển thị tầng đã lưu; tầng thực tế được tính lại lúc Host đọc bảng (`dispatch/ticket-tier.ts`) |
| F7 | **Leo thang ticket** lên tầng kế tiếp | — | `POST dispatch/:ticketId/escalate` | VH5 | ❌ | Tối đa tầng 3 (vượt ⇒ 409); bắt buộc lý do; audit `DISPATCH_ESCALATED`. Dashboard chỉ hiện cảnh báo ticket `ESCALATED` (`AdminDashboard.tsx:146`) |
| F8 | **Điều phối tay** lịch hẹn sang Host khác | `/admin/bookings` | `POST bookings/:id/reassign` (`:id` = id Viewing) | VH5, VH3 | ✅ | Bắt buộc `hostId` + lý do; audit `DISPATCH_REASSIGNED` |
| F9 | **Giám sát cọc giữ chỗ 2.000.000 VNĐ** (VietQR) + duyệt/từ chối UNC thủ công | — | `GET deposits`, `POST deposits/:id/resolve-unc` | CN1 | ❌ | "First-to-Pay Wins". 409 khi: cọc không ở `UNC_PENDING_REVIEW`; căn không ở trạng thái hợp lệ (`AVAILABLE`, hoặc `HOLDING` của chính khoản cọc còn hạn); có cọc cạnh tranh; UNC quá 30 phút. `REJECT` không kiểm căn. Chính sách "cọc 2M chuyển 100% thành Security Deposit, không trừ tháng đầu" nằm ở `deposit/deposit-terms.ts:80`, không thuộc endpoint này |
| F10 | **Ghi nhận yêu cầu hủy cọc giữ chỗ** | — | `POST contracts/:id/void-hold` | CN1 | ❌ | **Chỉ ghi audit `DEPOSIT_VOID_REQUESTED`, không đổi trạng thái cọc.** `:id` = id holding deposit; chỉ nhận cọc `PAID_HOLDING` (khác ⇒ 409). Chỉ 2 lý do `landlord_breach`, `force_majeure`; bắt buộc ghi chú |
| F11 | **Sổ hợp đồng hợp nhất 4 loại** (ký gửi, cọc giữ chỗ, thuê, đối tác Host) + chi tiết + gói chứng cứ | `/admin/contracts`, `/admin/contracts/[key]` | `GET contract-registry`, `GET contract-registry/:kind/:id`, `GET contracts`, `GET contracts/:id` | CN3 | ✅ | `kind` ∈ `mandate \| holding \| lease \| partnership`; sai ⇒ 400 |
| F12 | **Thư viện mẫu văn bản pháp lý** | `/admin/contracts/templates`, `.../[id]` | `GET contract-templates`, `GET contract-templates/:id` | CN3 | ⚠️ | Web đọc **dữ liệu tĩnh** `@/lib/mock/contract-templates`, hook API không được dùng. API backend cũng là danh sách cứng 4 mẫu, chưa có mẫu đối tác Host. Tải file qua `/admin/legal/[id]` |
| F13 | **Danh bạ các bên ký** | `/admin/contracts/parties`, `.../[key]` | `GET contract-parties`, `GET contract-parties/:id` | CN3 | ⚠️ | **API giải mã và trả SĐT dạng rõ** (và số CCCD ở `contracts/:id`). Chỉ trang danh sách bên ký che SĐT; trang chi tiết bên ký và chi tiết hợp đồng hiện SĐT rõ; email hiện rõ ở mọi nơi. Xem 6.11 |
| F14 | **Nhắc gia hạn** hợp đồng sắp hết hạn | `/admin/contracts/[key]` | `POST contracts/:id/remind-renewal` | CN1 | ⛔ | Luôn trả **503 `notification_provider_unavailable`** (`admin.service.ts:101-108`) vì chưa có kênh gửi; nút trên UI chỉ hiện thông báo lỗi |
| F15 | **Quản lý mã khóa cửa** (chỉ metadata): xem, xoay, thu hồi | — | `GET door-keys`, `POST door-keys/:id/rotate`, `POST door-keys/:id/revoke` | CN2 | ❌ | Không trả mã dạng rõ; không Lockbox, không IoT; bắt buộc lý do (`KeyReasonDto`). **Lỗi:** `rotate` lưu mã mới thiếu tiền tố `aes:` ⇒ Host không lấy được mã cửa sau khi xoay ([BUG-TC06-01](qa/bugs/BUG-TC06-01.md)) |
| F16 | **Quản lý Field Host**: danh sách + lọc (tên/email/SĐT/vai/phân khu/trạng thái), hồ sơ, thêm, sửa, khóa mềm | `/admin/hosts`, `/admin/hosts/[id]` | `GET/POST admin/field-hosts`, `GET admin/field-hosts/zones`, `GET/PATCH/DELETE admin/field-hosts/:id` | VH4, VH5 | ✅ | Host **do Admin tạo**, không tự đăng ký. Vai chỉ nhận `sale` hoặc `sale + inspector`; `inspector` đơn ⇒ 400 `HOST_ROLES_INVALID`. Email không sửa được (`@IsEmpty`). Xóa = khóa mềm (409 `host_has_active_tickets` nếu còn ticket), giữ lịch sử ca và hoa hồng |
| F17 | **Dynamic Commission & Incentive Engine**: xem, sửa tham số, nhật ký thay đổi | `/admin/commission` | `GET commission-engine`, `POST commission-engine/config`, `GET commission-engine/audit` | VH4 | ⚠️ | Khoảng cho phép ở mục 3; ngoài khoảng ⇒ 400; bắt buộc lý do; audit `FEE_CONFIG_UPDATED`; nhật ký 30 lần gần nhất. **UI chỉ cho sửa 5/10 tham số** (xem 6.12) |
| F18 | **Chính sách Security Deposit** | `/admin/settings` | `GET/POST settings/deposit-policy` | CN3 | ✅ | Mặc định 0.5× – 4.0× giá thuê tháng. Ràng buộc: min ∈ [0.1, 2.0]; max ∈ [1.0, 10.0] và ≥ min; mặc định ∈ [min, max]. Lý do **không bắt buộc ở API** (chỉ UI chặn); có audit |
| F19 | **Bảng kê thu nhập Host theo tuần ISO** + xuất CSV + quét bổ sung | `/admin/commission` | `GET payouts`, `GET payouts.csv`, `POST payouts/sweep` | VH4 | ⚠️ | Quét idempotent theo `transRef`, audit `PAYOUT_SWEEP`. API CSV có audit `PAYOUT_CSV_EXPORT`, nhưng nút "Xuất CSV" trên UI **tự dựng file ở trình duyệt** (`AdminCommission.tsx:113`) nên không sinh audit |

**Đã tắt có chủ đích (vùng cấm):**
- `GET/POST settings/landlord-fee` (phí dịch vụ ký gửi chủ nhà) đang comment trong `admin.controller.ts:244-255`; hệ thống dùng mặc định 5% (`DEFAULT_SERVICE_FEE_PERCENT`). Muốn bật lại phải bỏ comment cùng `LandlordFeeSettings.tsx` và 2 dòng trong `admin.http.spec.ts`.
- F4: không bật lại duyệt tay khi luồng thẩm định tự niêm yết còn hiệu lực.

## 3. Tham số biến phí được phép chỉnh (F17)

Nguồn: `backend/src/modules/admin/admin-fee.service.ts:22-33`. Cột "UI" cho biết tham số có ô nhập trên `/admin/commission` hay không.

| Khóa | Khoảng cho phép | Đơn vị | UI |
| :-- | :-- | :-- | :-- |
| `host_base_viewing_fee` | 30.000 – 100.000 | VNĐ/lượt | ✅ |
| `host_deal_commission` | 200.000 – 1.000.000 | VNĐ/cọc | ✅ |
| `host_rating_multiplier_5star` | 1.1 – 1.5 | hệ số | ✅ |
| `host_peak_hour_multiplier` | 1.1 – 1.5 | hệ số | ❌ |
| `host_campaign_bonus` | 0 – 1.000.000 | VNĐ/deal | ✅ |
| `host_inspection_fee` | 50.000 – 500.000 | VNĐ/ca | ✅ |
| `host_slow_inventory_bonus` | 100.000 – 500.000 | VNĐ | ❌ |
| `host_handover_inspection_fee` | 50.000 – 100.000 | VNĐ/ca | ❌ |
| `host_peak_hour_start` | 0 – 23 (số nguyên) | giờ | ❌ |
| `host_peak_hour_end` | 1 – 24 (số nguyên) | giờ | ❌ |

Cặp `peak_hour_start`/`peak_hour_end` được kiểm tra chéo (giờ bắt đầu < giờ kết thúc), **nhưng chỉ khi khóa còn lại đã có trong `FeeConfig`** (`admin-fee.service.ts:75-76`).

## 4. Phân quyền & bảo mật

| Yêu cầu | Hiện trạng |
| :-- | :-- |
| Chỉ vai `ops_admin` vào được `/admin/*` và `/api/v1/admin/*` | `@Roles('ops_admin')` ở cấp controller (`admin.controller.ts:33`, `field-hosts.controller.ts:14`), không có `@Public` nào trong 2 file; guard toàn cục Auth rồi Roles. `src/proxy.ts` chặn trang theo phiên. Đã thử trên trình duyệt: chưa đăng nhập ⇒ chuyển về `/admin/login`, API trả 401 (cả local và deploy) |
| Thao tác ghi có lý do + audit | Lý do bắt buộc ở API: F3, F5 (`terminate`), F7, F8, F10, F15, F17. **F18 không bắt buộc ở API.** Audit nghiệp vụ ghi vào `audit_logs`, sự kiện xác thực vào `auth_audit_log`. `AuditService.log` **nuốt lỗi** (best-effort), riêng field-hosts ghi audit trong transaction. Xuất CSV trên UI (F19) không có audit |
| Không lộ mã cửa | Không trả plaintext ở list/rotate/revoke. Định dạng lưu sau `rotate` sai (thiếu `aes:`), xem F15 |
| PII | Lưu mã hóa AES-256-GCM. **API Admin giải mã và trả SĐT rõ** (và CCCD ở chi tiết hợp đồng); UI chỉ che ở danh sách bên ký. Cần chốt theo NĐ 13/2023 (6.11) |
| Field Host & thẻ RFID | Không tự đăng ký, do Admin tạo. DTO đang dùng (`field-hosts/dto/field-hosts.dto.ts`) không nhận số thẻ RFID, service không ghi. Còn sót: cột `field_hosts.rfid_card_number` (`schema.prisma:422`) và 2 lớp DTO không ai dùng có `rfidCardNumber` ở `admin/dto/admin.dto.ts:20-77` (6.8) |

## 5. Kết quả kiểm chứng (đo ngày 2026-10-09, commit `4b00d24`)

Chi tiết lệnh, output: [docs/qa/TC-06_admin-portal.md](qa/TC-06_admin-portal.md); ảnh chụp: [docs/qa/evidence/TC-06/](qa/evidence/TC-06/).

| Hạng mục | Lệnh / cách đo | Kết quả |
| :-- | :-- | :-- |
| Backend Admin + Field Host | `cd backend && npx prisma generate && npx jest src/modules/admin src/modules/field-hosts` | **208 test**. Kết quả đổi theo lần chạy (xem ghi chú): khi pass là 13/13 suite, 208/208 test, 0 skip |
| Web typecheck | `cd apps/web && pnpm typecheck` | exit 0 |
| Web lint | `pnpm lint` | exit 0; 1 warning `no-img-element` ở `AdminInventoryDetail.tsx:189` |
| Web build | `pnpm build` | exit 0 |
| Web test | `pnpm test` | 347 test: 345 pass, 2 fail ở `landing-anchors.test.ts` (trang Landing, **không thuộc Admin**) |
| Trình duyệt, local | Edge headless, `admin@vinstay.vn`, chỉ xem | 14/14 trang tải được, 0 API lỗi, 0 lỗi console |
| Trình duyệt, deploy Vercel | như trên | 14/14 trang tải được khi đi chậm (7 giây/trang). Đi nhanh thì `GET /auth/session` trả **429**, bị đẩy về login ở 2 trang. Bản deploy **khác `main`** (xem 6.13) |

Ghi chú đo backend: 4 lần chạy song song cho các kết quả 13/13 pass; 2 suite fail (lỗi TS2353 khi Prisma client local cũ hơn `schema.prisma`); 2 suite fail với 5 test vượt timeout hook 5 giây (4 test "Live Supabase API" + 1 test http). Chạy lại, hoặc chạy `--runInBand`, thì pass hết. Kết luận: logic Admin không có test đỏ, nhưng bộ test **chập chờn (flaky)** vì gọi Supabase thật với timeout 5 giây. Sau mỗi lần pull có đổi schema, phải chạy `npx prisma generate`.

## 6. Điểm chưa khớp / cần chốt

| # | Vấn đề | Bằng chứng | Đề xuất | Người xử lý |
| :-- | :-- | :-- | :-- | :-- |
| 6.1 | API có ở backend nhưng **chưa có điều khiển trên UI**: F7, F9, F10, F15, `complete-exit` của F5 | Grep `apps/web/src`; duyệt trình duyệt | Ghi là "có API, chưa có màn". Ưu tiên F9 (CN1) nếu kịp trước Demo Day | Nguyễn Phương Nam |
| 6.2 | F4 trả 501; Swagger vẫn mô tả như chức năng đang chạy | `admin.service.ts:22-32`, `admin.controller.ts:91,97` | Giữ 501. Đánh dấu `deprecated` + `@ApiResponse(501)` trong Swagger; thêm test http kiểm 501 | Trần Thị Lan |
| 6.3 | `docs/UI_FLOW_SPEC.md` ghi khóa căn **7 ngày** (dòng 60, 61, 145, 148, 154, 155, 173); `AGENTS.md` và code dùng **mặc định 48h, 12–72h, chỉnh từng căn** | `admin-inventory.service.ts:9-10` | Biên bản theo `AGENTS.md`. Sửa UI_FLOW_SPEC | Nguyễn Khánh Duy |
| 6.4 | Biên bản thẩm định **32 hạng mục** | Form bắt buộc đúng 32 hạng mục chuẩn + tối đa 10 phát sinh (`apps/web/src/lib/inspection/logic.ts:239`) | **Đã khớp**, đóng | — |
| 6.5 | `CLAUDE.md` còn ghi "cổng Admin chưa nối" | `CLAUDE.md`, đoạn Next.js side | Cập nhật: từ PR #25 phần lớn màn Admin đọc API thật, trừ F12 và các mục ở 6.1 | Nguyễn Phương Nam |
| 6.6 | Swagger ghi "128 căn hộ", "no-show 3.8%", "Heatmap Sapphire 1 & 2" | `admin.controller.ts:51,60`; DB lúc đo có 64 căn; heatmap gom theo mọi tòa (`admin-bi.service.ts:75-84`) | Sửa mô tả Swagger | Trần Thị Lan |
| 6.7 | Xuất CSV (F19) dựng ở trình duyệt nên mất audit | `AdminCommission.tsx:113` | Chuyển nút sang gọi `GET payouts.csv` để có audit | Nguyễn Phương Nam |
| 6.8 | Sót dấu vết RFID: cột `rfid_card_number`, 2 lớp DTO không dùng | `schema.prisma:422`; `admin/dto/admin.dto.ts:20-77` | Chưa xóa cột trước Demo Day (xóa cột là thao tác phá dữ liệu, cần cả nhóm duyệt; phải đếm dòng có giá trị trước). Đánh dấu `/// deprecated`, xóa 2 lớp DTO thừa | Nguyễn Khánh Duy + Trần Thị Lan |
| 6.9 | F12 đọc dữ liệu tĩnh; API chỉ có 4 mẫu cứng | `AdminContractTemplates.tsx:11`; `admin.service.ts:110-117` | Đối chiếu với `legal/`, bổ sung mẫu đối tác Host, rồi nối API | Nguyễn Khánh Duy |
| 6.10 | 2 test web `landing-anchors.test.ts` fail (ngoài phạm vi Admin) | `pnpm test` | Người phụ trách Landing xử lý | Nguyễn Phương Nam |
| 6.11 | **PII:** API Admin trả SĐT (và CCCD) đã giải mã; UI chỉ che ở danh sách | `admin.service.ts:75-80,150-153`; `AdminContractPartyDetail.tsx:51`; `AdminContractDetail.tsx:73,82` | Chốt: Admin có cần xem SĐT/CCCD rõ không. Nếu không thì che ngay ở API; nếu có thì ghi audit mỗi lần xem (như `IDENTITY_READ`) | Nguyễn Khánh Duy + Trần Thị Lan |
| 6.12 | UI Biến phí chỉ sửa được 5/10 tham số (mục 3) | Ảnh [`admin_commission.png`](qa/evidence/TC-06/local/admin_commission.png); grep | Bổ sung 5 ô còn lại, hoặc ghi rõ là chỉnh qua API | Nguyễn Phương Nam |
| 6.13 | **Bản deploy Vercel khác `main`** (tiêu đề "Hợp đồng thuê", mẫu `tpl-01`), và `GET /auth/session` trả 429 khi chuyển trang nhanh | TC-06 mục 8 | Deploy lại từ `main` trước Demo Day; xem lại ngưỡng rate-limit của `/auth/session` | Nguyễn Phương Nam |
| 6.14 | **Lỗi F15:** xoay mã cửa làm mất mã của Host | [BUG-TC06-01](qa/bugs/BUG-TC06-01.md) | Sửa 1 dòng `admin-key.service.ts:45` (bọc `withAesPrefix`) + test dùng crypto thật | Trần Thị Lan |
| 6.15 | F14 nhắc gia hạn luôn 503; F10 chỉ ghi audit, không hủy cọc thật | `admin.service.ts:101-108`; `admin-deposit.service.ts:176-199` | Ghi rõ trong demo là "chưa hoạt động"; không trình diễn 2 nút này | Trần Thu Phương |
| 6.16 | Bộ test Admin chập chờn do timeout hook 5 giây khi gọi Supabase thật | Mục 5 | Tăng timeout riêng cho nhóm "Live Supabase API" hoặc tách khỏi `npm test` mặc định | Trần Thị Lan |

## 7. Phân công thực hiện biên bản

Trần Thu Phương lập biên bản (phần phức tạp nhất) và tự làm rà soát lần 1, lần 2. Rà soát lần 3 chia cho Trần Thị Lan, Nguyễn Phương Nam, Nguyễn Khánh Duy, mỗi người một mảng, độ phức tạp tương đương nhau. Người rà soát lần 3 phải **tự chạy lại lệnh** của mảng mình, không chỉ đọc biên bản.

| Vòng | Người | Phạm vi | Việc phải làm | Xong khi | Trạng thái |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Lập | **Trần Thu Phương** | Toàn bộ mục 1–6 | Đối chiếu 19 chức năng với code; đo test backend + web; lập danh sách điểm chưa khớp; cập nhật `docs/qa` | Biên bản v1 + [TC-06](qa/TC-06_admin-portal.md) có số đo thật | ✅ 2026-10-09 |
| Rà soát lần 1 | **Trần Thu Phương** | Backend: mục 2 (API, luật), 3, 4, 5 | Giao một agent thẩm định **độc lập** (chỉ đọc, không dùng ngữ cảnh người lập) đối chiếu F1–F19 với code; tự đo lại các điểm SAI; sửa biên bản lên v2 | Mục 8.1 có phán quyết đủ 19 dòng; biên bản v2 | ✅ 2026-10-09 |
| Rà soát lần 2 | **Trần Thu Phương** | Giao diện + môi trường thật: cột "Màn hình", "UI", mục 5 | Duyệt 14 trang `/admin/*` trên trình duyệt (local + deploy Vercel, chỉ xem); chạy lại TC-01 → TC-05; đưa ảnh chụp và log vào `docs/qa/evidence/` | Mục 8.3 có số đo; [TC-06](qa/TC-06_admin-portal.md) mục 7–8 | ✅ 2026-10-09 |
| Rà soát lần 3 | **Trần Thị Lan** | Backend | Tự chạy `npx prisma generate && npx jest src/modules/admin src/modules/field-hosts`; xác nhận hoặc bác từng dòng mục 8.1 (cột "Lần 3"); xử lý 6.2, 6.6, 6.14, 6.16; cùng Duy chốt 6.8, 6.11 | Mỗi dòng 8.1 có ✅/❌ của Lan; ký mục 9 | ⬜ Chờ |
| Rà soát lần 3 | **Nguyễn Phương Nam** | Giao diện Admin | Thử 1 thao tác ghi mỗi màn (F3, F5, F8, F16, F17, F18, F19-sweep) trên dữ liệu test, ghi ID vào TC-06 mục 6; kiểm bố cục mobile; xử lý 6.5, 6.7, 6.10, 6.12, 6.13 | Mỗi thao tác ghi có kết quả + ID dữ liệu test; deploy khớp `main`; ký mục 9 | ⬜ Chờ |
| Rà soát lần 3 | **Nguyễn Khánh Duy** | Chính sách & pháp lý: mục 3, F9, F10, F12, F13, F18, cột "Bám" | Đối chiếu tham số mục 3 và chính sách cọc 0.5×–4.0× với `docs/FINANCIAL_AND_REVENUE_MODEL.md` và `legal/`; kiểm câu "cọc 2M chuyển 100% thành Security Deposit, không trừ tháng đầu" khớp `legal/`; kiểm cột "Bám" với `AGENTS.md`; xử lý 6.3, 6.9; cùng Lan chốt 6.8, 6.11 | Không còn dòng lệch (hoặc ghi rõ dòng lệch); UI_FLOW_SPEC hết "7 ngày"; ký mục 9 | ⬜ Chờ |

Thứ tự lần 3: Lan trước, vì backend là nguồn chân lý; Nam và Duy làm song song sau đó. Phương tổng hợp ý kiến, ra bản cuối, trình Mentor Bùi Trung Hiếu.

## 8. Kết quả rà soát

### 8.0 Rà soát lần 1 — Trần Thu Phương (2026-10-09)

Phương giao một agent thẩm định **độc lập** (chỉ đọc, không dùng ngữ cảnh của người lập, tự chạy lại jest, theo `AGENTS.md` mục K). Phán quyết: **🔁 SỬA** mục 2, 3, 4, 5. Phương tự đo lại trên code các điểm SAI quan trọng (F13, F14, F15, F16, F18), xác nhận đúng, và sửa biên bản lên v2. Cột "Đo lại (lần 1)" ghi những dòng Phương đã tự kiểm; các dòng còn lại theo kết quả agent, chờ lần 3 xác nhận.

### 8.1 Phán quyết từng chức năng

| # | Phán quyết lần 1 | Điểm sai ở bản v1 | Đo lại (lần 1) | Lần 3 (Lan) |
| :-- | :-- | :-- | :-- | :-- |
| F1 | Đúng một phần | Giai đoạn 1–2 của phễu luôn `null`; heatmap theo mọi tòa, không riêng Sapphire | — | |
| F2 | Đúng một phần | Lọc ở client, có thêm `MAINTENANCE`; chi tiết không có nhật ký xem phòng | — | |
| F3 | Đúng | — | — | |
| F4 | Đúng một phần | `reject` thiếu `note` trả 400, không phải 501 | — | |
| F5 | Đúng một phần | `complete-exit` dùng mandate id, không nhận lý do | — | |
| F6 | Đúng | — | — | |
| F7 | Đúng | — | — | |
| F8 | Đúng | — | — | |
| F9 | Đúng một phần | Điều kiện 409 rộng hơn và khác "căn không còn AVAILABLE" | — | |
| F10 | Đúng một phần | Không hủy cọc thật, chỉ ghi audit | — | |
| F11 | Đúng | — | — | |
| F12 | Đúng | API cũng là danh sách cứng 4 mẫu | — | |
| F13 | **Sai** | API trả SĐT/CCCD rõ; chi tiết hiện rõ | ✅ Phương | |
| F14 | **Sai** | Luôn 503, UI không chạy được (v1 ghi ✅) | ✅ Phương | |
| F15 | **Sai** | Mã lưu thiếu `aes:` ⇒ lỗi chức năng | ✅ Phương | |
| F16 | **Sai** | Không có vai `inspector` đơn | ✅ Phương | |
| F17 | Đúng | — | — | |
| F18 | Đúng một phần | Thiếu max ≥ 1.0; lý do không bắt buộc ở API | ✅ Phương | |
| F19 | Đúng | — | — | |

### 8.2 Các cách phá đã thử (lần 1)

| Cách phá | Kết quả |
| :-- | :-- |
| Route có trong controller nhưng service ném mã khác | Phá được: F14 (503), F4 `reject` (400), F10 (không làm gì ngoài audit) |
| Guard toàn cục hoặc `@Public` ghi đè `@Roles` | Không phá được |
| Nhật ký 30 lần lấy sai bảng | Không phá được (`audit_logs`, lọc `FEE_CONFIG_UPDATED`) |
| Định dạng mã cửa sau khi xoay khác định dạng Host đọc | **Phá được** (F15) |
| API giải mã PII rồi để UI tự che | **Phá được** (F13) |
| Vai Host `inspector` đơn | **Phá được** (F16) |
| Lý do bắt buộc chỉ ở UI | **Phá được** (F18) |
| Audit có chắc chắn được ghi | **Phá được** (`AuditService.log` nuốt lỗi) |

Ghi nhận thêm để Duy xem: chính sách cọc chỉ có `deposit_min_ratio` được dùng ngoài Admin (`landlord-consignment.service.ts:115`); `max`/`default` chưa được áp ở đâu.

### 8.3 Rà soát lần 2 — Trần Thu Phương (2026-10-09)

| Hạng mục | Kết quả | Bằng chứng |
| :-- | :-- | :-- |
| Trình duyệt local, tài khoản `ops_admin`, chỉ xem | 14/14 trang `/admin/*` tải được, 0 API lỗi, 0 lỗi console; chưa đăng nhập ⇒ về `/admin/login`, API 401 | [TC-06 mục 7](qa/TC-06_admin-portal.md), [ảnh local](qa/evidence/TC-06/local/) |
| Trình duyệt deploy Vercel | 14/14 trang khi đi chậm; `GET /auth/session` trả 429 khi chuyển trang nhanh; bản deploy khác `main` | [TC-06 mục 8](qa/TC-06_admin-portal.md), [ảnh deploy](qa/evidence/TC-06/) |
| Phát hiện từ giao diện | UI Biến phí chỉ sửa 5/10 tham số (6.12); email bên ký hiện rõ (6.11); tầng điều phối hiển thị theo giá trị lưu (F6) | TC-06 mục 7.3 |
| Chạy lại TC-01 → TC-05 | TC-04 66/66 Pass (2 bug 🔴 cũ đã sửa); TC-03 Pass; TC-01 Fail (BUG-TC01-01 còn, thêm BUG-TC01-02); TC-02 bị chặn (AI Engine không chạy); TC-05 Pass ở lớp relay | [tonghop.md mục 7](qa/tonghop.md) |

Phán quyết lần 2: **🔁 SỬA**. Các điểm đã đưa vào mục 2, 5, 6 của biên bản v2.

## 9. Xác nhận

| Vai trò | Họ tên | Ngày | Chữ ký |
| :-- | :-- | :-- | :-- |
| Người lập biên bản | Trần Thu Phương | 2026-10-09 | |
| Người rà soát lần 1 (backend, qua agent thẩm định độc lập) | Trần Thu Phương | 2026-10-09 | |
| Người rà soát lần 2 (giao diện, môi trường thật, TC-01 → TC-05) | Trần Thu Phương | 2026-10-09 | |
| Người rà soát lần 3 (backend) | Trần Thị Lan | | |
| Người rà soát lần 3 (giao diện Admin) | Nguyễn Phương Nam | | |
| Người rà soát lần 3 (chính sách & pháp lý) | Nguyễn Khánh Duy | | |
| Mentor / Giảng viên | Bùi Trung Hiếu | | |
