# OPERATIONS — Deploy, runbook, rollback

## 1. Thứ tự bắt buộc
1. WP1 merge code schema ⇒ 🖐 `cd backend && npx prisma db push` (chỉ THÊM cột/bảng — Prisma không được báo mất dữ liệu; báo ⇒ DỪNG, không `--accept-data-loss`).
2. 🖐 Hai script MẶC ĐỊNH CHẠY KHÔ (không ghi DB). Chạy khô trước, xem số liệu rồi mới thêm `--apply`:
   - `npx ts-node scripts/fix-host-roles.ts` (in `DRY-RUN fixed=<n>`) ⇒ nếu hợp lý: `npx ts-node scripts/fix-host-roles.ts --apply` (in `APPLY fixed=<n>`, ghi AuditLog `HOST_ROLES_UPDATE`).
   - `npx ts-node scripts/backfill-unit-inventory.ts` (in `DRY-RUN units=<n> rows=<n>`) ⇒ nếu hợp lý: `npx ts-node scripts/backfill-unit-inventory.ts --apply` (in `APPLY units=<n> rows=<n>`; lấy mandate ACTIVE và EXIT_REQUESTED).
   Lưu output cả hai lần chạy vào `evidence/wp1/`, `evidence/wp2/`. Chỉ chạy khô là chưa ghi gì: runbook chưa xong.
3. Seed lại nếu cần dữ liệu demo sạch: `npx ts-node prisma/seed_excel_units.ts` (package.json chưa có lệnh seed — WP1 thêm `"seed:units"`) — ghi Supabase dev chung, 🖐 quyết.
4. ai-engine: `cd ai-engine && uv sync && cp .env.example .env` (🖐 điền `OPENROUTER_API_KEY`, `INTERNAL_KEY`) ⇒ `uv run uvicorn app.main:app --reload --port 8100`.
5. Backend `.env` thêm `AI_ENGINE_URL=http://localhost:8100`, `AI_ENGINE_INTERNAL_KEY=<cùng INTERNAL_KEY>`.
6. `pnpm dev` web như cũ.

## 2. Biến môi trường
| Biến | Ở đâu | Bắt buộc |
| :-- | :-- | :-- |
| `OPENROUTER_API_KEY` | ai-engine | có (thiếu ⇒ `/health` `ok:false`, `/chat` trả `LLM_UNAVAILABLE`) |
| `LLM_MODEL` | ai-engine | mặc định `openai/gpt-4o-mini` |
| `CORE_API_URL` | ai-engine | mặc định `http://localhost:4000/api/v1` |
| `INTERNAL_KEY` / `AI_ENGINE_INTERNAL_KEY` | ai-engine / backend | có |
| `AI_ENGINE_URL` | backend | thiếu ⇒ relay 503 ⇒ web fallback |

## 3. CI
- Thêm job `ai-engine` vào `.github/workflows/ci.yml`: `astral-sh/setup-uv`, `uv sync --frozen`, `uv run ruff check`, `uv run pytest` (không key). 🖐 duyệt vì sửa workflow.
- Job Python cũ (`src/`) giữ nguyên.

## 4. Rollback
| Sự cố | Làm |
| :-- | :-- |
| LLM trả lời sai/đắt | Gỡ `AI_ENGINE_URL` khỏi backend `.env` ⇒ relay 503 ⇒ web tự về bộ lọc cũ (không cần deploy web) |
| Luồng duyệt giá lỗi | Revert commit WP2; hồ sơ đang `awaiting_landlord`: 🖐 xử lý tay theo danh sách `SELECT … WHERE door_access_config->>'stage' = 'awaiting_landlord'` (Agent viết sẵn query trong `evidence/wp2/rollback.sql`, KHÔNG chạy) |
| Schema | Cột/bảng mới không phá code cũ ⇒ revert code là đủ, KHÔNG drop cột |
