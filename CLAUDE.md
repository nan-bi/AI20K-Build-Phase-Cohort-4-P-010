# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Team P-010 (VinUni AI20K Build Phase) is building **VinStay AI**, a rental and operations platform for apartments at Vinhomes Ocean Park (Gia Lâm, Hà Nội). The repo began from the AI20K agent template, so `README.md` describes the template and not the product. Most docs, code comments and commit messages are in Vietnamese.

**Read `AGENTS.md` before proposing any feature, screen, DB table or AI prompt.** It is the "always on" product charter: 4 landlord pain points, 5 tenant pain points and 5 operations/Field Host bottlenecks. Its guardrail says that any proposal that doesn't address one of these pain points is out of MVP scope. Hard constraints from it that are easy to violate:
- AI does computation, filtering, CCCD (ID card) OCR and incident triage. Field Hosts (humans holding resident RFID elevator cards) do the on-site work.
- Do not use door lockboxes, IoT smart-lock integrations or QR codes posted in lobbies. Door codes are released in-app when the Host confirms the viewing.
- Asset-light model: the platform only *refers* outside handymen and never does repairs itself.
- The 2,000,000 VNĐ holding deposit (paid by VietQR, locks the unit in `holding` for 24h) is converted **in full** into the Security Deposit when the lease is signed. It is **never** deducted from the first month's rent.

## Commands

**Python side** (`src/`) — 3.11 with a virtualenv at `.venv` (`pip install -r requirements.txt`):

```bash
make run          # uvicorn src.main:app --reload on :8000 (Swagger at /docs)
make test         # pytest tests/ -v
make lint         # ruff check src/ tests/
make format       # ruff format src/ tests/
pytest tests/test_api/test_routes.py::test_name -v   # single test
```

CI (`.github/workflows/ci.yml`) runs `ruff check` and then `pytest` with `APP_ENV=test OPENAI_API_KEY=test-key`, so tests must not need a real LLM key. Use the `mock_llm` fixture in `tests/conftest.py`. The `client` fixture is an httpx `AsyncClient` over the ASGI app. Ruff uses a line length of 120 and the rules E, F, I, N, W and UP (E501 is ignored). This CI job only covers `src/`, not `apps/web`.

**NestJS backend** (`backend/`) — npm, xem `backend/README.md` (Supabase project, `.env`, `prisma db push`, `npm run seed:auth`):

```bash
cd backend
npm run start:dev   # :4000, Swagger /api/docs
npm test            # jest (Prisma/Supabase giả)
```

**Next.js side** (`apps/web/`) — pnpm, UI 4 cổng. **Hiện chạy hoàn toàn bằng dữ liệu mock** (đăng nhập demo bằng cookie `vs_role`, store localStorage, không cần backend — xem `apps/web/README.md`); mã gọi backend NestJS còn giữ lại để khôi phục:

```bash
cd apps/web
pnpm dev            # localhost:3000, cần backend đang chạy (BACKEND_URL)
pnpm build lint typecheck test
```

## Architecture: what exists vs. what is designed

The backend is split across two independent apps, matching `docs/SAD.md`'s multi-service design but with the Core Service's stack swapped:

- **`backend/`** — NestJS + Prisma + Supabase, nơi duy nhất xử lý đăng nhập/phân quyền/dữ liệu (SAD v2). `backend/prisma/schema.prisma` là nguồn chân lý của database (`database/schema.sql` và schema Prisma cũ của `apps/web` đã bị thay thế). Auth: `backend/src/modules/auth` (email+mật khẩu, Google PKCE, đăng ký, Field Host nhập RFID theo lời mời của Admin, OTP Zalo xác thực SĐT — không phải phương thức đăng nhập). Phiên = cookie httpOnly do backend set; vai trò đọc từ DB. Các controller nghiệp vụ hiện vẫn `@Public()` (chưa gắn `@Roles`).
- **`apps/web/`** — Next.js (App Router), **bản MVP mock hiện không gọi backend** (xem `apps/web/README.md`; luồng đăng nhập backend bên dưới là thiết kế cũ, đang tạm dừng); chỉ có UI 4 cổng + `src/proxy.ts` chặn trang theo phiên + rewrite `/api/v1/*` sang backend.
- **`src/`** — still the original Python/FastAPI+LangGraph AI20K template skeleton, reserved for the future AI Engine service (Matchmaker/OCR/Dispatcher per SAD §5.2). A FastAPI app (`src/main.py`, router mounted at `/api/v1`) calls a compiled LangGraph `agent` (`src/agents/graph.py`: `analyze` → conditional → `respond`). State is a `total=False` TypedDict (`src/agents/state.py`). Nodes return partial-state dicts. Settings come from `src/config.py` (pydantic-settings, `.env`, cached `get_settings()`). The LLM client is `src/services/llm.py` (OpenAI, `gpt-4o-mini` by default). The nodes and tools are still placeholders — nothing VinStay-specific has been built here.

**The target design lives in docs.** Treat these as the spec when implementing:
- `docs/SAD.md` is the architecture: C4 diagrams, the 4 AI Engine modules (AI Matchmaker with an All-in Cost filter and a "Căn hời" badge at ≥10% savings, CCCD OCR with a <85% confidence fallback to manual entry, a 3-tier Dispatcher, and a VietQR-webhook Conflict Resolver), the appointment state machine, the ERD, API contracts (§8), SLAs and ADRs. Its ERD/ADRs describe a larger, more aspirational schema than either `database/schema.sql` or the current `apps/web/prisma/schema.prisma` actually implement (e.g. `mandate_contracts`, `fee_configs`, `payout_records` don't exist in either yet) — treat SAD as directional, not as ground truth for what's built.
- `docs/PRD.md`, `docs/UI_FLOW_SPEC.md` and `docs/BRIEF.md` cover requirements and screen flows for the 4 roles: Tenant, Landlord, Field Host and Admin.
- `docs/prototyte.html` (the filename is misspelled) is a standalone HTML/Tailwind/vanilla JS prototype with a role switcher. `docs/PROTOTYPE_GUIDE.md` is its demo script, but it still gives the old path `presentation/prototype.html`.
- `legal/` holds the contract and policy templates (exclusive mandate, deposit, privacy under Decree 13/2023, BQL building rules, escrow). `legal/tenant/` holds the tenant-facing set. Keep product behavior consistent with these documents.

Other directories: `tech data/` holds ad-hoc scraping scripts (`caodata/data*.py`) and committed Chrome profiles. Don't treat it as application code. `docs/guide/` is the template's Technical Guidebook and is owned by upstream book maintainers (CODEOWNERS). Avoid editing it.

## Repo conventions

- **AI usage logging is graded.** `.claude/settings.json` runs `scripts/log_hook.py` on every prompt and writes to `.ai-log/session.jsonl`. A pre-push hook uploads the log. Don't remove or bypass these hooks.
- `WORKLOG.md` (daily per-member task tables) and `JOURNAL.md` are Demo Day deliverables that the team updates by hand. Follow the existing table format when asked to add entries.
- `pyproject.toml` and `.python-version` are gitignored (local uv artifacts). `requirements.txt` is the source of truth for dependencies.
