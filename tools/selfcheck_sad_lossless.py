from pathlib import Path
import re

raw = Path("docs/SAD_v2.md").read_bytes()
print("source_crlf", raw.count(b"\r\n"), "source_lf_only", raw.count(b"\n") - raw.count(b"\r\n"))
src = raw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")

parts = []
for p in sorted(Path("ai-pack/sad").glob("[0-9]*.md")):
    t = p.read_bytes().decode("utf-8")
    first, _, rest = t.partition("\n")
    assert first.startswith("<!-- nguồn: docs/SAD_v2.md"), p.name
    parts.append(rest)
joined = "".join(parts).replace("\r\n", "\n")
print("slices", len(parts), "joined_equals_source_normalized", joined == src)
if joined != src:
    i = next((k for k, (a, b) in enumerate(zip(joined, src)) if a != b), min(len(joined), len(src)))
    print("first_diff_at", i, "len_joined", len(joined), "len_src", len(src))
