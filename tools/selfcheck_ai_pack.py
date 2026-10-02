from pathlib import Path
import re

root = Path(".")
path_re = re.compile(r"(?<![\w/.-])((?:[\w.\-\[\]()@]+/)+[\w.\-\[\]()@]+\.[A-Za-z0-9]{1,6})(?![\w])")
secret_res = {
    "jwt": re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "sk-key": re.compile(r"\bsk-[A-Za-z0-9]{16,}"),
    "aws": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "conn-string": re.compile(r"(?i)\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://\S+"),
    "assign": re.compile(r"(?i)\b(?:api[_-]?key|secret|password|passwd|token|access[_-]?key)\b\s*[:=]\s*['\"][^'\"<\s]{8,}['\"]"),
    "long-token": re.compile(r"\b[A-Za-z0-9+/_-]{40,}\b"),
}

missing, total, hits = {}, 0, []
for f in sorted(Path("ai-pack").rglob("*.md")):
    scope = "sad" if "sad" in f.parts else "main"
    for n, line in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        for m in path_re.finditer(line):
            p = m.group(1)
            total += 1
            if not ((root / p).exists() or (root / "legal" / p).exists()):
                missing.setdefault((scope, f.as_posix()), []).append((n, p))
        for kind, rx in secret_res.items():
            if rx.search(line) and "SECRET? tại" not in line:
                hits.append((kind, f.as_posix(), n))

print("paths_checked", total)
for (scope, f), items in missing.items():
    print(f"[{scope}] {f}: {len(items)} missing")
    for n, p in items[:8]:
        print(f"   L{n} {p}")
print("secret_pattern_hits", len(hits))
for kind, f, n in hits[:30]:
    print(f"   {kind} {f}:{n}")
