from pathlib import Path
import re

root = Path(".")
specs = sorted(p.relative_to(root).as_posix() for p in (root / "backend/src").rglob("*.spec.ts"))
test_inv = Path("ai-pack/TEST_INVENTORY.md").read_text(encoding="utf-8")
print("spec_files", len(specs), "missing_in_TEST_INVENTORY", [s for s in specs if s not in test_inv])

mods = sorted(p.name for p in (root / "backend/src/modules").iterdir() if p.is_dir())
inv = Path("ai-pack/BACKEND_INVENTORY.md").read_text(encoding="utf-8")
print("modules", len(mods), "missing_in_BACKEND_INVENTORY", [m for m in mods if not re.search(rf"^\| {m} \|", inv, re.M)])
digests = {p.stem for p in Path("ai-pack/code-digest").glob("*.md")}
print("modules_without_digest", [m for m in mods + ["common", "supabase", "prisma", "main", "app.module"] if m not in digests])

ctrl = sorted((root / "backend/src/modules").rglob("*.controller.ts"))
http = sum(len(re.findall(r"^\s*@(Get|Post|Put|Patch|Delete|Options|Head|All)\b", c.read_text(encoding="utf-8"), re.M)) for c in ctrl)
table = Path("ai-pack/ROUTE_GUARD_TABLE.md").read_text(encoding="utf-8")
m = re.search(r"Route: (\d+);", table)
print("routes_in_code", http, "routes_in_table", m.group(1) if m else "CHƯA RÕ")

models = re.findall(r"^model\s+(\w+)", Path("backend/prisma/schema.prisma").read_text(encoding="utf-8"), re.M)
pm = Path("ai-pack/PRISMA_MODELS.md").read_text(encoding="utf-8")
print("prisma_models", len(models), "missing_in_PRISMA_MODELS", [x for x in models if f"### {x} " not in pm])

legal = sorted(p.relative_to("legal").as_posix() for p in Path("legal").rglob("*.md"))
li = Path("ai-pack/LEGAL_INDEX.md").read_text(encoding="utf-8")
print("legal_files", len(legal), "missing_in_LEGAL_INDEX", [x for x in legal if f"## {x}" not in li])

sad = Path("docs/SAD_v2.md").read_bytes()
total = sum(p.stat().st_size for p in Path("ai-pack/sad").glob("[0-9]*.md"))
print("sad_source_bytes", len(sad), "slices_bytes(with headers)", total)
