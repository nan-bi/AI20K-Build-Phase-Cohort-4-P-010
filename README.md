# VinStay AI

> Chủ nhà ở nội thành mất 15–30 ngày trống phòng và phải đi 20–30 km để mở cửa cho khách xem → VinStay AI lọc căn theo chi phí All-in, điều phối Field Host nội khu đón khách và khoá căn bằng cọc VietQR, cho chủ nhà, khách thuê và đội vận hành tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Đội **P-010** — VinUni AI20K Build Phase. Repo khởi tạo từ AI20K Agent Template; template gốc vẫn còn ở `src/` (dành cho AI Engine sau này) và `docs/guide/`.

## Vấn đề

Chi tiết và số liệu ở [`AGENTS.md`](AGENTS.md) (4 nỗi đau chủ nhà, 5 nỗi đau khách thuê, 5 điểm nghẽn vận hành):

- **Chủ nhà:** trống phòng 15–30 ngày giữa hai kỳ thuê, mất 6–12 triệu/tháng; đi xa mở cửa nhưng khách bỏ hẹn; tranh chấp hư hao nội thất khi trả phòng.
- **Khách thuê:** tin đăng ảo, chi phí ẩn (phí quản lý, gửi xe, điện nước) đẩy tổng chi vượt 20–30% ngân sách, bị lừa cọc.
- **Vận hành:** rổ hàng không đồng bộ, khách và chủ nhà "cắt cầu", Field Host chờ khách no-show.

## Giải pháp

| Tính năng | Trạng thái |
|---|---|
| Catalog căn Verified + bảng **All-in Cost** + badge **"Căn hời phân khu"** (rẻ ≥ 10%) | Đã chạy (API thật) |
| Đặt lịch xem có **xác thực SĐT bằng OTP**, Field Host nhận ticket theo phân khu, đón khách ở sảnh, mở cửa bằng mã cấp trong app (không lockbox) | Đã chạy; gửi OTP Zalo/SMS chưa nối nhà cung cấp |
| **Cọc giữ chỗ 2.000.000đ qua VietQR**, First-to-Pay Wins | Đã chạy với VietQR giả lập |
| **eKYC CCCD** + Hợp đồng thuê PDF (cọc chuyển 100% vào Tiền cọc bảo đảm) | Đã chạy với eKYC giả lập |
| **Ký gửi độc quyền** → Inspector thẩm định 32 hạng mục → đạt thì tự niêm yết | Đã chạy |
| Cổng Admin: quản lý Field Host | Đã chạy; các màn Admin khác còn mock |
| Chat "VinStay AI" trang chủ | Lọc căn bằng luật trong trình duyệt — **chưa có AI agent/LLM** ([TC-02](docs/qa/TC-02_ai-apartment-qa.md)) |

## Người dùng

- **Chính:** chủ nhà ký gửi căn tại Ocean Park; khách thuê tìm căn theo ngân sách.
- **Phụ:** Field Host nội khu (vai Sale và Thẩm định), Admin vận hành.

## Kiến trúc

```
Trình duyệt ─▶ apps/web (Next.js 16, :3000) ─/api/v1/*─▶ backend (NestJS 10, :4000) ─▶ Supabase PostgreSQL + Storage
                                                                   src/ (FastAPI + LangGraph, :8000) — chưa nối
```

- Sơ đồ theo mã nguồn hiện tại: [`docs/architecture_diagram.md`](docs/architecture_diagram.md)
- Kiến trúc mục tiêu, 4 engine, ADR: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/SAD_v2.md`](docs/SAD_v2.md)
- Danh mục API: [`backend/README.md`](backend/README.md) · Route web: [`apps/web/README.md`](apps/web/README.md)

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Web | Next.js 16.3 · React 19.2 · TypeScript · Vitest (pnpm) |
| Backend | NestJS 10 · Prisma 5 · class-validator · Passport (Google) · pdfkit (npm) |
| Dữ liệu | PostgreSQL + Storage trên Supabase; schema: `backend/prisma/schema.prisma` |
| Đăng nhập | Email + mật khẩu (scrypt) và Google OAuth → JWT phiên trong cookie httpOnly; vai trò đọc từ DB |
| AI Engine (dự kiến) | FastAPI · LangGraph · OpenAI `gpt-4o-mini` — hiện là khung template |
| CI | GitHub Actions: `ruff` + `pytest` cho `src/` |

## Chạy local

Yêu cầu: Node.js, npm, pnpm, Python 3.11 (chỉ cho `src/`), một project Supabase.

```bash
# 1. Backend — :4000, Swagger http://localhost:4000/api/docs
cd backend
npm install
cp .env.example .env          # điền DATABASE_URL, DIRECT_URL, SUPABASE_*, JWT_SECRET, AES_SECRET_KEY…
npx prisma generate
npx prisma db push
npm run seed:auth -- --demo   # admin + 4 tài khoản demo (cần AUTH_DEMO_MODE=true để dùng nút 1-chạm)
npm run start:dev

# 2. Web — http://localhost:3000 (gọi backend qua BACKEND_URL, mặc định http://localhost:4000)
cd apps/web
pnpm install
pnpm dev

# 3. (Tuỳ chọn) AI service — :8000
python3.11 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
make run
```

Biến demo hữu ích trong `backend/.env` (chỉ dev, bị chặn khi `NODE_ENV=production`): `AUTH_DEMO_MODE`, `OTP_ECHO_DEV_CODE`, `DEMO_TOOLS`. Seed catalog căn: `npm run seed:catalog`.

## Kiểm thử

| Phần | Lệnh |
|---|---|
| Backend | `cd backend && npm test` |
| Web | `cd apps/web && pnpm lint && pnpm typecheck && pnpm test` |
| AI service | `make lint && make test` |
| Smoke backend (cần backend đang chạy) | `npm run smoke:tenant`, `smoke:sale-auth`, `smoke:host-viewing`, `smoke:inspection` |

Kiểm thử thủ công TC-01 → TC-05 và danh sách bug: [`docs/qa/tonghop.md`](docs/qa/tonghop.md).

## Cấu trúc thư mục

```
apps/web/        Next.js — 4 cổng Khách thuê / Chủ nhà / Field Host / Admin
backend/         NestJS + Prisma — toàn bộ đăng nhập, phân quyền, dữ liệu
  prisma/        schema.prisma (nguồn chân lý DB), seed
src/             FastAPI + LangGraph — khung cho AI Engine (chưa nối)
docs/            PRD, SAD_v2, UI_FLOW_SPEC, architecture_diagram, qa/ (báo cáo test)
legal/           Mẫu hợp đồng, chính sách (uỷ quyền, cọc, Nghị định 13/2023)
presentation/    Pitch deck, prototype, slide kiến trúc
planning/        Bộ SPEC theo từng đợt
eval/            Bằng chứng đánh giá
scripts/         Hook ghi log AI + tiện ích dữ liệu
```

## Deliverables Demo Day

| # | Deliverable | Vị trí |
|---|---|---|
| 1 | Source code | `apps/web/`, `backend/`, `src/` |
| 2 | README | file này |
| 3 | Architecture diagram | [`docs/architecture_diagram.md`](docs/architecture_diagram.md) |
| 4 | AI logs | `.ai-log/` (tự gửi ở `git push`, xem mục dưới) |
| 5 | Live URL | chưa deploy |
| 6 | Video demo | chưa có (dự kiến `presentation/`) |
| 7 | Pitch deck | [`presentation/PITCH_DECK_GATE_1.md`](presentation/PITCH_DECK_GATE_1.md) |
| 8 | Development journal | [`JOURNAL.md`](JOURNAL.md) |
| 9 | Worklog | [`WORKLOG.md`](WORKLOG.md) |
| 10 | Evaluation evidence | [`eval/results/report.md`](eval/results/report.md), [`docs/qa/`](docs/qa/) |

## AI usage logging

Hook ghi mỗi prompt vào `.ai-log/session.jsonl`; `pre-push` hook gửi log lên grading server rồi chuyển vào `.ai-log/archive/`.

1. Cài hook một lần sau khi clone: `bash scripts/setup_hooks.sh` (hoặc `powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1`).
2. Điền `AI_LOG_SERVER` và `AI_LOG_API_KEY` (key cá nhân từ [dashboard Phoenix](https://phoenix.note.transformerlabs.ai/api-keys)) vào **`.env` ở thư mục gốc** — `scripts/submit_log.py` chỉ đọc file này. Thiếu thì hook báo `AI_LOG_SERVER not set` và bỏ qua.
3. Gửi tay khi cần: `bash scripts/_pyrun.sh scripts/submit_log.py`. Công cụ không có hook: `bash scripts/_pyrun.sh scripts/log_manual.py --tool chatgpt --prompt "…"`.

Hook có sẵn cho Claude Code (`.claude/settings.json`), Cursor, Codex CLI, Gemini CLI, GitHub Copilot và Antigravity.

## Nhóm

Theo tên tác giả commit trong git (vai trò và mã học viên: xem `WORKLOG.md`):

| Thành viên (tên trong commit) | Tên viết tắt trong WORKLOG |
|---|---|
| Tran Thu Phuong | Phương |
| Nguyen Khanh Duy | Duy |
| NamDev / NguyenPhuongNam-VNUA | Nam (namnp) |
| Trần Thị Lan / nan-bi | lan (nan-bi) |

## License

[MIT](LICENSE)
