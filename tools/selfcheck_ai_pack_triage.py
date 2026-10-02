from pathlib import Path
import re

kinds = {}
odd = []
rx = re.compile(r"\b[A-Za-z0-9+/_-]{40,}\b")
for f in sorted(Path("ai-pack").rglob("*.md")):
    for n, line in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        for m in rx.finditer(line):
            tok = m.group(0)
            ident = bool(re.fullmatch(r"[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)+", tok)) and tok.upper() == tok or "_" in tok or "-" in tok
            high_entropy = len(set(tok)) > 24 and re.search(r"[A-Z]", tok) and re.search(r"[a-z]", tok) and re.search(r"\d", tok) and "_" not in tok and "-" not in tok
            label = "high-entropy" if high_entropy else "identifier/filename-like"
            kinds[label] = kinds.get(label, 0) + 1
            if high_entropy:
                odd.append(f"{f.as_posix()}:{n}")
print(kinds)
print("high-entropy locations:", odd[:20])

missing = []
for line in Path("ai-pack/code-digest/app.module.md").read_text(encoding="utf-8").splitlines():
    m = re.search(r"(\./[\w./-]+)", line)
    if m:
        base = Path("backend/src") / m.group(1)
        if not base.with_suffix(".ts").exists():
            missing.append(m.group(1))
print("app.module relative imports without .ts file:", missing)
print("backend/prisma/schema.prisma exists:", Path("backend/prisma/schema.prisma").exists())
