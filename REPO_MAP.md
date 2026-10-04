# REPO MAP

## 1. Tổng quan
Repo chứa các thành phần của VinStay AI: giao diện web, backend API và AI service.
Web dùng Next.js/React; backend dùng NestJS/Prisma; AI service dùng Python/FastAPI cùng LangGraph/LangChain.
Các mô tả ứng dụng được xác nhận từ README của web/backend; README ở root tự mô tả là AI20K Agent Template.
`docs/SAD_v2.md` có tiêu đề về mục đích, phạm vi, phân hệ, kiến trúc và luồng end-to-end; nội dung chi tiết không được đọc trong khảo sát này.

## 2. Cách chạy
- AI service: `uvicorn src.main:app --reload --port 8000`; test/lint: `make test`, `make lint`.
- Root Docker: `docker compose up`.
- Backend: từ `backend/`, `npm run start:dev`; build/test: `npm run build`, `npm test`.
- Web: từ `apps/web/`, `pnpm dev`; build/lint/typecheck/test: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- Backend database: `npx prisma generate`, `npx prisma db push`, `npx prisma db seed`.

## 3. Cây thư mục rút gọn
```text
P-010/
├── .agents/
│   ├── hooks.json (0.3 KB; 16 dòng)
│   ├── rules/
│   │   └── ai-log-hook.md (2.8 KB; 43 dòng)
│   └── workflows/
│       └── log.md (1.5 KB; 36 dòng)
├── .ai-log/
│   ├── .gitkeep
│   ├── archive/
│   │   ├── 2026-09-20.jsonl
│   │   ├── 2026-09-22.jsonl
│   │   ├── 2026-09-23.jsonl
│   │   ├── 2026-09-24.jsonl
│   │   └── 2026-09-25.jsonl
│   └── session.jsonl
├── .claude/
│   └── settings.json (0.3 KB; 15 dòng)
├── .codex/
│   └── hooks.json (0.6 KB; 29 dòng)
├── .cursor/
│   └── hooks.json (0.3 KB; 15 dòng)
├── .gemini/
│   └── settings.json (0.9 KB; 42 dòng)
├── .github/
│   ├── CODEOWNERS
│   ├── hooks/
│   │   └── hooks.json (0.6 KB; 21 dòng)
│   ├── PULL_REQUEST_TEMPLATE.md (0.8 KB; 22 dòng)
│   └── workflows/
│       └── ci.yml (0.6 KB; 32 dòng)
├── .pytest_cache/
│   ├── .gitignore
│   ├── CACHEDIR.TAG
│   ├── README.md (0.3 KB; 8 dòng)
│   └── v/
│       └── cache/
│           └── nodeids
├── apps/
│   └── web/
│       ├── .env.example
│       ├── .gitignore
│       ├── AGENTS.md (0.7 KB; 9 dòng)
│       ├── CLAUDE.md (0.0 KB; 1 dòng)
│       ├── eslint.config.mjs
│       ├── next-env.d.ts (0.3 KB; 7 dòng)
│       ├── next.config.ts (0.6 KB; 14 dòng)
│       ├── package.json (0.7 KB; 30 dòng)
│       ├── pnpm-lock.yaml (158.8 KB; 4720 dòng)
│       ├── pnpm-workspace.yaml (0.1 KB; 3 dòng)
│       ├── public/
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── units/
│       │   │   └── ... (20 thư mục con chưa mở)
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── README.md (4.4 KB; 44 dòng)
│       ├── src/
│       │   ├── app/
│       │   │   └── ... (11 thư mục con chưa mở)
│       │   │   ├── error.tsx
│       │   │   ├── favicon.ico
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── not-found.module.css
│       │   │   ├── not-found.tsx
│       │   ├── components/
│       │   │   └── ... (20 thư mục con chưa mở)
│       │   ├── lib/
│       │   │   └── ... (2 thư mục con chưa mở)
│       │   │   ├── useNow.ts (1.4 KB; 53 dòng)
│       │   ├── proxy.ts (1.0 KB; 21 dòng)
│       │   └── tests/
│       │       ├── auth.test.ts (1.9 KB; 43 dòng)
│       │       ├── authmock.test.ts (4.3 KB; 88 dòng)
│       │       ├── consign.test.ts (11.4 KB; 288 dòng)
│       │       ├── contract-parties.test.ts (7.6 KB; 191 dòng)
│       │       ├── contract-templates.test.ts (6.9 KB; 170 dòng)
│       │       ├── contracts.test.ts (18.9 KB; 421 dòng)
│       │       ├── copy.test.ts (5.2 KB; 134 dòng)
│       │       ├── deal.test.ts (11.5 KB; 350 dòng)
│       │       ├── dispatch.test.ts (10.4 KB; 334 dòng)
│       │       ├── flow.test.ts (11.3 KB; 249 dòng)
│       │       ├── host-roles.test.ts (3.6 KB; 99 dòng)
│       │       ├── inventory.test.ts (2.9 KB; 85 dòng)
│       │       ├── legal-sync.test.ts (22.4 KB; 601 dòng)
│       │       ├── mock.test.ts (11.5 KB; 264 dòng)
│       │       └── portal-nav.test.ts (3.0 KB; 77 dòng)
│       ├── tsconfig.json (0.7 KB; 34 dòng)
│       ├── tsconfig.tsbuildinfo
│       └── vitest.config.ts (0.3 KB; 14 dòng)
├── backend/
│   ├── .env.example
│   ├── BACKEND_SHOW.html
│   ├── docker-compose.yml (0.7 KB; 30 dòng)
│   ├── nest-cli.json (0.1 KB; 5 dòng)
│   ├── package-lock.json (359.5 KB; bỏ qua >200KB)
│   ├── package.json (2.6 KB; 85 dòng)
│   ├── prisma/
│   │   ├── legacy/
│   │   │   └── drop_web_schema.sql (1.3 KB; 16 dòng)
│   │   ├── schema.prisma
│   │   └── seed.ts (8.9 KB; 274 dòng)
│   ├── README.md (19.6 KB; 263 dòng)
│   ├── scripts/
│   │   ├── auth-helpers.ts (4.1 KB; 103 dòng)
│   │   ├── create-admin.ts (0.9 KB; 23 dòng)
│   │   └── seed-auth.ts (3.3 KB; 82 dòng)
│   ├── src/
│   │   ├── app.module.ts (2.7 KB; 81 dòng)
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts (0.3 KB; 11 dòng)
│   │   │   │   ├── public.decorator.ts (0.2 KB; 4 dòng)
│   │   │   │   └── roles.decorator.ts (0.2 KB; 4 dòng)
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts (2.2 KB; 68 dòng)
│   │   │   ├── guards/
│   │   │   │   ├── guards.spec.ts (5.6 KB; 125 dòng)
│   │   │   │   ├── roles.guard.ts (1.3 KB; 37 dòng)
│   │   │   │   └── supabase-auth.guard.ts (2.4 KB; 60 dòng)
│   │   │   └── interceptors/
│   │   │       ├── logging.interceptor.ts (0.8 KB; 28 dòng)
│   │   │       └── transform.interceptor.ts (0.7 KB; 30 dòng)
│   │   ├── main.ts (4.7 KB; 99 dòng)
│   │   ├── modules/
│   │   │   ├── admin/
│   │   │   │   └── ... (1 thư mục con chưa mở)
│   │   │   │   ├── admin.controller.ts (2.3 KB; 61 dòng)
│   │   │   │   ├── admin.module.ts (0.3 KB; 10 dòng)
│   │   │   │   ├── admin.service.ts (12.5 KB; 355 dòng)
│   │   │   ├── audit/
│   │   │   │   ├── audit.module.ts (0.2 KB; 9 dòng)
│   │   │   │   └── audit.service.ts (1.8 KB; 64 dòng)
│   │   │   ├── auth/
│   │   │   │   └── ... (7 thư mục con chưa mở)
│   │   │   │   ├── auth-audit.service.ts (1.3 KB; 39 dòng)
│   │   │   │   ├── auth.constants.ts (2.1 KB; 54 dòng)
│   │   │   │   ├── auth.controller.ts (7.8 KB; 176 dòng)
│   │   │   │   ├── auth.errors.ts (3.5 KB; 52 dòng)
│   │   │   │   ├── auth.http.spec.ts (27.0 KB; 507 dòng)
│   │   │   │   ├── auth.module.ts (2.8 KB; 62 dòng)
│   │   │   │   ├── auth.service.spec.ts (28.1 KB; 521 dòng)
│   │   │   │   ├── auth.service.ts (17.0 KB; 371 dòng)
│   │   │   ├── demo-accounts.ts (0.8 KB; 15 dòng)
│   │   │   ├── secrets.ts (1.6 KB; 34 dòng)
│   │   │   ├── booking/
│   │   │   │   └── ... (1 thư mục con chưa mở)
│   │   │   │   ├── booking.controller.ts (1.9 KB; 48 dòng)
│   │   │   │   ├── booking.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── booking.service.ts (6.3 KB; 179 dòng)
│   │   │   ├── contract/
│   │   │   │   └── ... (1 thư mục con chưa mở)
│   │   │   │   ├── contract.controller.ts (1.7 KB; 41 dòng)
│   │   │   │   ├── contract.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── contract.service.ts (7.1 KB; 199 dòng)
│   │   │   ├── deposit/
│   │   │   │   └── ... (1 thư mục con chưa mở)
│   │   │   │   ├── deposit.controller.ts (1.5 KB; 38 dòng)
│   │   │   │   ├── deposit.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── deposit.service.ts (8.2 KB; 235 dòng)
│   │   │   ├── dispatch/
│   │   │   │   └── ... (1 thư mục con chưa mở)
│   │   │   │   ├── dispatch.controller.ts (2.0 KB; 49 dòng)
│   │   │   │   ├── dispatch.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── dispatch.service.ts (5.9 KB; 176 dòng)
│   │   │   ├── handover/
│   │   │   │   └── ... (1 thư mục con chưa mở)
│   │   │   │   ├── handover.controller.ts (1.2 KB; 28 dòng)
│   │   │   │   ├── handover.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── handover.service.ts (3.9 KB; 117 dòng)
│   │   │   ├── identity/
│   │   │   │   ├── identity.controller.ts (0.9 KB; 21 dòng)
│   │   │   │   ├── identity.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── identity.service.ts (4.6 KB; 132 dòng)
│   │   │   ├── landlord/
│   │   │   │   ├── landlord.controller.ts (1.8 KB; 42 dòng)
│   │   │   │   ├── landlord.module.ts (0.3 KB; 10 dòng)
│   │   │   │   └── landlord.service.ts (6.0 KB; 180 dòng)
│   │   │   ├── matchmaker/
│   │   │   │   ├── matchmaker.controller.ts (0.9 KB; 21 dòng)
│   │   │   │   ├── matchmaker.module.ts (0.4 KB; 12 dòng)
│   │   │   │   └── matchmaker.service.ts (3.1 KB; 76 dòng)
│   │   │   └── property/
│   │   │       ├── property.controller.ts (1.8 KB; 43 dòng)
│   │   │       ├── property.module.ts (0.3 KB; 10 dòng)
│   │   │       └── property.service.ts (8.6 KB; 262 dòng)
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts (0.2 KB; 9 dòng)
│   │   │   └── prisma.service.ts (1.0 KB; 32 dòng)
│   │   ├── supabase/
│   │   │   ├── supabase.module.ts (0.2 KB; 9 dòng)
│   │   │   └── supabase.service.ts (4.6 KB; 125 dòng)
│   │   └── testing/
│   │       └── silence-logs.ts (0.2 KB; 4 dòng)
│   ├── tsconfig.build.json (0.2 KB; 12 dòng)
│   ├── tsconfig.build.tsbuildinfo
│   ├── tsconfig.json (0.7 KB; 26 dòng)
│   └── tsconfig.tsbuildinfo
├── database/ [1 file: .sql=1; mẫu: schema.sql]
├── docs/
│   ├── architecture_diagram.md (1.0 KB; 38 dòng)
│   ├── BRIEF.md (9.8 KB; 79 dòng)
│   ├── FINANCIAL_AND_REVENUE_MODEL.md (28.8 KB; 300 dòng)
│   ├── guide/
│   │   ├── anti-patterns/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── common-mistakes.md (2.4 KB; 97 dòng)
│   │   ├── architecture/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── system-design.md (1.8 KB; 71 dòng)
│   │   ├── bmad/
│   │   │   ├── _index.md (0.8 KB; 11 dòng)
│   │   │   └── overview.md (1.8 KB; 62 dòng)
│   │   ├── book-media/
│   │   │   └── free-accounts/
│   │   │       ├── cohere.jpg
│   │   │       ├── gemini.jpg
│   │   │       ├── groq.jpg
│   │   │       ├── huggingface.jpg
│   │   │       ├── langsmith.jpg
│   │   │       ├── mistral.jpg
│   │   │       ├── render.jpg
│   │   │       └── vercel.jpg
│   │   ├── chapter-01.md (6.8 KB; 111 dòng)
│   │   ├── chapter-02.md (35.1 KB; 653 dòng)
│   │   ├── chapter-03.md (40.4 KB; 686 dòng)
│   │   ├── chapter-04.md (56.1 KB; 1392 dòng)
│   │   ├── chapter-05.md (32.9 KB; 967 dòng)
│   │   ├── chapter-06.md (35.3 KB; 1151 dòng)
│   │   ├── chapter-07.md (29.4 KB; 761 dòng)
│   │   ├── chapter-08.md (32.9 KB; 893 dòng)
│   │   ├── chapter-09.md (23.3 KB; 506 dòng)
│   │   ├── chapter-10.md (18.5 KB; 351 dòng)
│   │   ├── code-style/
│   │   │   ├── _index.md (0.6 KB; 11 dòng)
│   │   │   └── python.md (1.9 KB; 83 dòng)
│   │   ├── cost-management.md (7.0 KB; 203 dòng)
│   │   ├── deliverables/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── checklist.md (2.7 KB; 75 dòng)
│   │   ├── devops/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── docker-cicd.md (1.7 KB; 81 dòng)
│   │   ├── free-accounts.md (18.8 KB; 351 dòng)
│   │   ├── langgraph/
│   │   │   ├── _index.md (0.8 KB; 13 dòng)
│   │   │   ├── nodes-and-edges.md (2.4 KB; 102 dòng)
│   │   │   ├── state.md (1.6 KB; 61 dòng)
│   │   │   └── tools.md (1.9 KB; 80 dòng)
│   │   ├── patterns/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── rag-pattern.md (2.0 KB; 85 dòng)
│   │   ├── resources/
│   │   │   ├── _index.md (0.6 KB; 11 dòng)
│   │   │   └── recommended-courses.md (5.9 KB; 124 dòng)
│   │   ├── setup/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── quick-start.md (2.6 KB; 87 dòng)
│   │   ├── testing/
│   │   │   ├── _index.md (0.7 KB; 11 dòng)
│   │   │   └── writing-tests.md (1.9 KB; 91 dòng)
│   │   └── troubleshooting.md (8.3 KB; 316 dòng)
│   ├── HOLDING_DEPOSIT_TEMPLATE.md (5.7 KB; 73 dòng)
│   ├── PRD.md (48.9 KB; 383 dòng)
│   ├── PROJECT_CHARTER.md (18.2 KB; 192 dòng)
│   ├── PROMPT_LOG.md (9.9 KB; 221 dòng)
│   ├── PROTOTYPE_GUIDE.md (10.5 KB; 110 dòng)
│   ├── prototyte.html
│   ├── SAD_v2.md (80.9 KB; 1145 dòng)
│   └── UI_FLOW_SPEC.md (31.7 KB; 344 dòng)
├── eval/
│   └── results/
│       └── report.md (0.9 KB; 46 dòng)
├── legal/
│   ├── 00_UNIVERSAL_ELECTRONIC_SIGNING_PROTOCOL.md (14.8 KB; 132 dòng)
│   ├── 01_APPENDIX_ASSET_HANDOVER_AUTHORIZATION.md (24.5 KB; 166 dòng)
│   ├── 01_EXCLUSIVE_RENTAL_MANDATE.md (21.2 KB; 152 dòng)
│   ├── 02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md (24.6 KB; 182 dòng)
│   ├── 03_PRIVACY_POLICY_AND_DATA_CONSENT.md (5.2 KB; 55 dòng)
│   ├── 04_BQL_REGULATIONS_AND_LIABILITY.md (9.4 KB; 70 dòng)
│   ├── 05_HANDYMAN_REFERRAL_DISCLAIMER.md (4.2 KB; 44 dòng)
│   ├── 06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md (50.7 KB; 342 dòng)
│   ├── 07_ESCROW_AND_DEPOSIT_CUSTODY_POLICY.md (15.2 KB; 146 dòng)
│   ├── 08_FIELD_HOST_PARTNERSHIP_AND_VIEWING_PROTOCOL.md (34.9 KB; 248 dòng)
│   ├── admin/
│   │   ├── 01_SYSTEM_ADMINISTRATION_AND_BI_OCCUPANCY_HEATMAP.md (16.1 KB; 147 dòng)
│   │   ├── 02_EXCLUSIVE_INVENTORY_AND_15_DAY_EXIT_MONITORING.md (14.7 KB; 133 dòng)
│   │   ├── 03_DYNAMIC_COMMISSION_ENGINE_AND_AUDIT_TRAIL.md (14.6 KB; 137 dòng)
│   │   ├── 04_AUTO_DISPATCH_SLA_AND_FIELD_ESCALATION.md (11.8 KB; 114 dòng)
│   │   ├── 05_NAMED_ESCROW_ACCOUNT_AND_SETTLEMENT_PROTOCOL.md (15.3 KB; 132 dòng)
│   │   ├── 06_DATA_PRIVACY_SECURITY_AND_AI_GOVERNANCE.md (16.3 KB; 145 dòng)
│   │   └── README.md (8.2 KB; 46 dòng)
│   ├── host/
│   │   ├── 01_FIELD_HOST_PARTNERSHIP_AND_SLA_AGREEMENT.md (12.5 KB; 114 dòng)
│   │   ├── 02_DYNAMIC_COMMISSION_AND_INCENTIVE_POLICY.md (14.3 KB; 135 dòng)
│   │   ├── 03_LOBBY_RECEPTION_AND_RFID_CARD_PROTOCOL.md (19.1 KB; 162 dòng)
│   │   ├── 04_DOUBLE_REMINDER_AND_ANTI_NOSHOW_PROTOCOL.md (13.8 KB; 127 dòng)
│   │   ├── 05_CODE_OF_CONDUCT_AND_NON_CIRCUMVENTION.md (13.1 KB; 126 dòng)
│   │   ├── 06_DIGITAL_HANDOVER_AND_HOST_PERFORMANCE_RATING.md (15.8 KB; 150 dòng)
│   │   └── README.md (7.8 KB; 47 dòng)
│   ├── landlord/
│   │   ├── 01_EXCLUSIVE_RENTAL_MANDATE_AGREEMENT.md (11.4 KB; 102 dòng)
│   │   ├── 02_SMART_LOCK_AND_KEY_CUSTODY_PROTOCOL.md (12.6 KB; 116 dòng)
│   │   ├── 03_DIGITAL_HANDOVER_PASSPORT_AND_ASSET_BASELINE.md (12.9 KB; 98 dòng)
│   │   ├── 04_SECURITY_DEPOSIT_AND_VIOLATION_DEDUCTION_POLICY.md (12.4 KB; 97 dòng)
│   │   ├── 05_ASSET_LIGHT_MAINTENANCE_AND_HANDYMAN_DISCLAIMER.md (11.2 KB; 85 dòng)
│   │   ├── 06_CHECKOUT_SETTLEMENT_AND_FAST_ESCROW_RELEASE.md (11.4 KB; 107 dòng)
│   │   └── README.md (9.3 KB; 46 dòng)
│   ├── README.md (12.4 KB; 64 dòng)
│   └── tenant/
│       ├── 01_TERMS_OF_SEARCH_AND_BOOKING.md (7.2 KB; 83 dòng)
│       ├── 02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md (7.4 KB; 73 dòng)
│       ├── 03_DATA_PRIVACY_AND_OCR_CONSENT.md (8.4 KB; 91 dòng)
│       ├── 04_DIGITAL_APARTMENT_LEASE_AGREEMENT.md (11.4 KB; 133 dòng)
│       ├── 05_TRIPARTITE_ESCROW_AGREEMENT.md (9.4 KB; 101 dòng)
│       ├── 06_HANDOVER_STAY_AND_SETTLEMENT_PROTOCOL.md (10.2 KB; 122 dòng)
│       └── README.md (4.1 KB; 17 dòng)
├── P-010/
├── presentation/
│   ├── PITCH_DECK_GATE_1.md (21.8 KB; 226 dòng)
│   ├── prototype.html
│   ├── README.md (0.8 KB; 26 dòng)
│   └── SAD_ARCHITECTURE_SLIDE.html
├── scripts/
│   ├── _pyrun.cmd
│   ├── _pyrun.sh
│   ├── log_antigravity.py (20.1 KB; 540 dòng)
│   ├── log_hook.py (6.6 KB; 190 dòng)
│   ├── log_manual.py (3.7 KB; 113 dòng)
│   ├── setup.sh
│   ├── setup_hooks.ps1
│   ├── setup_hooks.sh
│   └── submit_log.py (6.0 KB; 168 dòng)
├── src/
│   ├── __init__.py (0.0 KB; 0 dòng)
│   ├── agents/
│   │   ├── __init__.py (0.0 KB; 0 dòng)
│   │   ├── graph.py (0.7 KB; 29 dòng)
│   │   ├── nodes/
│   │   │   ├── __init__.py (0.0 KB; 0 dòng)
│   │   │   └── example_node.py (0.7 KB; 26 dòng)
│   │   ├── state.py (0.4 KB; 18 dòng)
│   │   └── tools/
│   │       ├── __init__.py (0.0 KB; 0 dòng)
│   │       └── example_tool.py (2.2 KB; 71 dòng)
│   ├── api/
│   │   ├── __init__.py (0.0 KB; 0 dòng)
│   │   └── routes.py (0.8 KB; 25 dòng)
│   ├── config.py (1.0 KB; 37 dòng)
│   ├── main.py (0.9 KB; 39 dòng)
│   ├── models/
│   │   ├── __init__.py (0.0 KB; 0 dòng)
│   │   └── schemas.py (0.3 KB; 10 dòng)
│   └── services/
│       ├── __init__.py (0.0 KB; 0 dòng)
│       └── llm.py (0.3 KB; 12 dòng)
├── tech data/ [1875 file: .baf=3, .baj=3, .bf=3, .binarypb=34, .css=2, .dat=3, .db-journal=11, .db-wal=3, .gif=2, .html=4, .journal=3, .jpg=180, .js=10, .json=266, .model=1, .old=78, .pb=9, .pma=4, .png=212, .py=4, .tflite=10, .txt=2, .xlsx=1, [không đuôi]=1027; mẫu: caodata\chrome_debug_profile\component_crx_cache\metadata.json, caodata\chrome_debug_profile\Crashpad\metadata, caodata\chrome_debug_profile\Crashpad\settings.dat]
├── tests/
│   ├── __init__.py (0.0 KB; 0 dòng)
│   ├── conftest.py (0.7 KB; 29 dòng)
│   ├── test_agents/
│   │   ├── __init__.py (0.0 KB; 0 dòng)
│   │   └── test_graph.py (0.4 KB; 16 dòng)
│   └── test_api/
│       ├── __init__.py (0.0 KB; 0 dòng)
│       └── test_routes.py (0.6 KB; 21 dòng)
├── tools/
│   └── make_tree.py (5.5 KB; 155 dòng)
└── [22 file: .example=1, .md=11, .toml=1, .txt=2, .yml=1, [không đuôi]=6; mẫu: .dockerignore, .env, .env.example]
```

## 4. Bảng thư mục
| Thư mục | Mục đích (1 dòng) | Độ chắc chắn | Ghi chú |
|---|---|---|---|
| `.agents/` | Cấu hình hook, rule và workflow của agent. | Cao | Có `hooks.json`, `rules/`, `workflows/`. |
| `.agents/rules/` | Chứa rule cho agent. | Cao | Tên file `ai-log-hook.md`. |
| `.agents/workflows/` | Chứa workflow cho agent. | Cao | Tên file `log.md`. |
| `.ai-log/` | Lưu log phiên và archive. | Cao | Có `session.jsonl`, `archive/`. |
| `.ai-log/archive/` | Lưu các file log đã lưu trữ. | Cao | Chỉ dựa trên tên/thư mục. |
| `.claude/` | Cấu hình Claude. | Cao | Có `settings.json`. |
| `.codex/` | Cấu hình Codex. | Cao | Có `hooks.json`. |
| `.cursor/` | Cấu hình Cursor. | Cao | Có `hooks.json`. |
| `.gemini/` | Cấu hình Gemini. | Cao | Có `settings.json`. |
| `.github/` | Cấu hình GitHub, hook và CI workflow. | Cao | Có `hooks/`, `workflows/`, `CODEOWNERS`. |
| `.github/hooks/` | Cấu hình hook GitHub. | Cao | Có `hooks.json`. |
| `.github/workflows/` | Chứa workflow CI. | Cao | Có `ci.yml`. |
| `.pytest_cache/` | Bộ đệm pytest. | Cao | Suy từ tên thư mục và `nodeids`. |
| `apps/` | Nhóm ứng dụng giao diện. | Thấp | Chỉ có `web/` ở cấp hai. |
| `apps/web/` | Web app Next.js/React. | Cao | README và package manifest xác nhận. |
| `backend/` | API backend NestJS/Prisma. | Cao | README và package manifest xác nhận. |
| `backend/prisma/` | Schema, seed và nội dung legacy của Prisma. | Cao | Có `schema.prisma`, `seed.ts`, `legacy/`. |
| `backend/scripts/` | Script quản trị và seed auth. | Cao | Suy từ tên file. |
| `backend/src/` | Mã nguồn backend. | Cao | Có `main.ts`, `modules/`, `common/`. |
| `database/` | Chứa schema SQL. | Cao | Có `schema.sql`. |
| `docs/` | Tài liệu dự án, đặc tả và hướng dẫn. | Cao | Suy từ tên file. |
| `docs/guide/` | Technical Guidebook và các chủ đề hướng dẫn. | Cao | Có chapter và thư mục chủ đề. |
| `eval/` | Kết quả đánh giá. | Cao | Có `results/`. |
| `eval/results/` | Chứa báo cáo kết quả. | Cao | Có `report.md`. |
| `legal/` | Tài liệu pháp lý và thỏa thuận. | Cao | Suy từ tên thư mục/tệp; không đọc nội dung. |
| `legal/admin/` | Tài liệu pháp lý theo vai trò Admin. | Cao | Tên thư mục và tên file. |
| `legal/host/` | Tài liệu pháp lý theo vai trò Host. | Cao | Tên thư mục và tên file. |
| `legal/landlord/` | Tài liệu pháp lý theo vai trò Landlord. | Cao | Tên thư mục và tên file. |
| `legal/tenant/` | Tài liệu pháp lý theo vai trò Tenant. | Cao | Tên thư mục và tên file. |
| `P-010/` | CHƯA RÕ. | Thấp | Cây hiện không thể hiện file con. |
| `presentation/` | Prototype và tài liệu thuyết trình. | Cao | Có `prototype.html`, pitch deck, slide. |
| `scripts/` | Script setup và ghi/gửi log. | Cao | Suy từ tên file. |
| `src/` | AI service Python/FastAPI. | Cao | README và manifest; có `main.py`. |
| `src/agents/` | Agent, state, node và tool mẫu. | Cao | Suy từ tên file/thư mục. |
| `src/api/` | API routes. | Cao | Có `routes.py`. |
| `src/models/` | Schema model. | Cao | Có `schemas.py`. |
| `src/services/` | Dịch vụ tích hợp LLM. | Cao | Có `llm.py`. |
| `tech data/` | Thư mục dữ liệu; chỉ thống kê metadata. | Cao | Cây ghi 1.875 file. |
| `tests/` | Kiểm thử Python. | Cao | Có `test_agents/`, `test_api/`. |
| `tests/test_agents/` | Kiểm thử agent. | Cao | Có `test_graph.py`. |
| `tests/test_api/` | Kiểm thử API. | Cao | Có `test_routes.py`. |
| `tools/` | Công cụ tạo cây repo. | Cao | Có `make_tree.py`. |

## 5. Thư mục dữ liệu / hợp đồng
- `tech data/` — 1.875 file; đuôi: `.baf` (3), `.baj` (3), `.bf` (3), `.binarypb` (34), `.css` (2), `.dat` (3), `.db-journal` (11), `.db-wal` (3), `.gif` (2), `.html` (4), `.journal` (3), `.jpg` (180), `.js` (10), `.json` (266), `.model` (1), `.old` (78), `.pb` (9), `.pma` (4), `.png` (212), `.py` (4), `.tflite` (10), `.txt` (2), `.xlsx` (1), không đuôi (1.027); mẫu: `caodata\chrome_debug_profile\component_crx_cache\metadata.json`, `caodata\chrome_debug_profile\Crashpad\metadata`, `caodata\chrome_debug_profile\Crashpad\settings.dat`.
- `database/` — 1 file; đuôi: `.sql` (1); mẫu: `schema.sql`.
- `legal/` — 39 file; đuôi: `.md` (39); mẫu: `00_UNIVERSAL_ELECTRONIC_SIGNING_PROTOCOL.md`, `01_APPENDIX_ASSET_HANDOVER_AUTHORIZATION.md`, `01_EXCLUSIVE_RENTAL_MANDATE.md`.

## 6. Điểm vào & luồng chính
- `src/main.py` — file điểm vào Python/FastAPI, tồn tại.
- `backend/src/main.ts` — file điểm vào NestJS, tồn tại.
- `apps/web/src/app/layout.tsx` — file layout App Router, tồn tại.
- `apps/web/src/app/(chatbot)/page.tsx` — trang trong route group chatbot, tồn tại.

## 7. Những điều CHƯA RÕ
- `P-010/` hiện không có nội dung hiển thị trong cây; mục đích chưa xác định.
- Chưa xác định môi trường thực tế đang chạy AI service, NestJS backend hay web mock; chỉ có hướng dẫn và cấu hình trong repo.
- Chưa xác định nơi triển khai thực tế và backend nào đang được dùng ở môi trường đó.
