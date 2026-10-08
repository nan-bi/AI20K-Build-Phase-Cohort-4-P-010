Worker · thi công · Sonnet · Bước 0 skip · hiểu việc: phạm vi = seed nội thất DEMO định danh + công khai conditionPct/code + UI ảnh/độ mới + ai-engine/prompt/eval; xong khi jest/tsc/web/ai xanh + chạy khô OK + bộ đo mới từng đỏ; cấm schema/legal/--apply/db push/commit.
Handoff: (không có file) · Base: working tree · Head: working tree (không commit)

Lệnh (exit):
- backend `npx jest src/modules/property src/modules/tenant` 0 · tests 74→75 pass (+6 ca fix4, P1-5 sửa), 0 skip
- backend `npx tsc --noEmit -p .` = 7 lỗi (bằng nền ≤7)
- backend `npm run seed:unit-inventory` (chạy khô, DB đọc được) 0 · `DRY-RUN units=62 rows=1832` (62 căn đều FULL, 27–32 món)
- web `pnpm test` 0 · 301→302 pass; `pnpm typecheck` 0; `pnpm lint` 0 (1 warning img cũ AdminInventoryDetail); `pnpm build` 0; next-env.d.ts đã khôi phục (git diff rỗng)
- ai-engine `uv run ruff check .` 0; `uv run pytest` 0 · 60→61 pass
- `grep -cP '[\x08\x0c\x0b]'` trên file sửa = 0

Bộ đo mới từng ĐỎ (evidence/fix4/):
- red-no-hash.txt: thay hash bằng seed cố định ⇒ ">=10 bộ khác nhau" ĐỎ (exit 1)
- red-compensation.txt: mapper thêm `compensation` ⇒ P1-5 ĐỎ (exit 1)
- web-red-chip.txt: bỏ chuỗi "Mới ~X%" ⇒ test render fix4 ĐỎ; ai-red.txt: bỏ conditionPct ở _inventory ⇒ test mới ĐỎ
- Xanh: jest-green.txt, web-test/typecheck/lint/build.txt, ai-ruff/pytest.txt, dryrun.txt
- Phát hiện nhỏ: detectListingTextViolation báo nhầm "money" với spec "Gỗ óc chó, 2 ngăn kéo" và "Thẻ từ cư dân" (đã đổi từ ngữ; có test quét cả SPEC_POOL). Không sửa detector (ngoài phạm vi).

Mẫu chạy khô (5 căn): unit | furnishing | món | độ mới TB
VHOP-BE-STU-2012 | FULL | 28 | 73
VHOP-BE3-0202 | FULL | 32 | 77
VHOP-BE3-0804 | FULL | 30 | 78
VHOP-ZR1-1603 | FULL | 30 | 74
VHOP-S1.02-0502 | FULL | 31 | 75

File đã đụng: backend/{package.json,README.md,scripts/seed-unit-inventory.ts,src/modules/property/unit-inventory-seed.ts,src/modules/property/unit-data.spec.ts,src/modules/tenant/tenant.mappers.ts,tenant.types.ts}; apps/web/{README.md,public/inventory/README.md,src/components/unit/{InventoryRow.tsx,UnitSections.tsx},src/lib/tenant/types.ts,src/tests/{tenant-adapters,unit-detail-render}.test.ts}; ai-engine/{app/tools/_common.py,app/prompts/system.vi.md,eval/cases.jsonl(+3 ca furn_5..7),tests/test_core_api_envelope.py}; planning/18_*/specs/{00-ARCHITECTURE,01-CONTRACTS,SPEC-P01-Unit-Data}.md.
Bảng phân công: seed/mapper/UI/ai = 🟠 → Sonnet (tự làm, không ủy quyền).

KHÔNG làm: không --apply/db push/ghi Supabase; không commit; không chạy `uv run python -m app.eval` (cần key thật) nên 3 ca eval mới chưa chạy thật; không bỏ ảnh vào public/inventory (chủ tịch tự bỏ); không sửa schema.prisma (comment cột condition "1–5" ở schema vẫn cũ, cần sửa riêng — cấm trong phạm vi).
Lưu ý: DB có 62 căn (không phải 55), tất cả FULL nên chưa kiểm BASIC/EMPTY trên dữ liệu thật (đã có test thuần).
Câu hỏi cho chủ tịch: chạy `npm run seed:unit-inventory -- --apply` khi đồng ý.
