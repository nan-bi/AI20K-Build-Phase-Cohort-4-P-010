from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_ai_inventories as inv  # noqa: E402

ROOT = Path.cwd()
SRC = ROOT / "backend/src"
OUT = ROOT / "ai-pack/code-digest"
LIMIT = 8 * 1024
SECRETISH = re.compile(r"(?i)secret|credential|demo")
KEYWORDS = re.compile(r"(?i)secret|password|passwd|token|api[_-]?key|credential|jwt|dsn|private|service[_-]?role")
LITERAL = re.compile(r"(['\"`])([^'\"`\r\n]{8,})\1")
FLAGS = re.compile(r"(?i)\b(TODO|FIXME|HACK|mock|stub|demo|hard-?code\w*)\b")
EXPORT = re.compile(r"^export\s+(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)", re.M)
NOT_METHOD = {"if", "for", "while", "switch", "catch", "return", "constructor", "function"}
MAIN_CFG = re.compile(r"enableCors|useGlobalPipes|useGlobalFilters|useGlobalGuards|useGlobalInterceptors|helmet|setGlobalPrefix|SwaggerModule|DocumentBuilder|Throttler|cookieParser|enableVersioning|\.listen\(|trust proxy|useStaticAssets")
MODULE_CFG = re.compile(r"Module\b|APP_GUARD|APP_FILTER|APP_INTERCEPTOR|APP_PIPE|Throttler|provide:|useClass|useFactory|useValue")


REF = None  # git ref (vd origin/main); None = đọc working tree


def git(*args):
    result = subprocess.run(["git", *args], cwd=ROOT, capture_output=True)
    return result.stdout.decode("utf-8", errors="replace") if result.returncode == 0 else None


def rel_of(path):
    return path.relative_to(ROOT).as_posix()


def list_ts(folder):
    excluded = {"node_modules", ".git", ".ai-log"}
    if REF:
        names = (git("ls-tree", "-r", "--name-only", REF, rel_of(folder) + "/") or "").splitlines()
        return sorted(ROOT / n for n in names if n.endswith(".ts") and not excluded & set(n.split("/")))
    return inv.source_files(folder, {".ts"})


def is_dir(folder):
    if REF:
        return bool(git("ls-tree", "--name-only", REF, rel_of(folder) + "/"))
    return folder.is_dir()


def read_text(path, findings):
    if not REF:
        return inv.read_safe(path, findings)
    size = (git("cat-file", "-s", f"{REF}:{rel_of(path)}") or "0").strip()
    if not size.isdigit() or int(size) > inv.MAX_FILE_BYTES:
        return None
    text = git("show", f"{REF}:{rel_of(path)}")
    if text is None:
        return None
    for number, line in enumerate(text.splitlines(), 1):
        for match in inv.SECRET_VALUE.finditer(line):
            if not any(t in match.group(2).lower() for t in inv.PLACEHOLDERS):
                findings.add(f"SECRET? tại {rel_of(path)}:{number}")
    return text


def safe_line(line, limit=150):
    text = " ".join(line.strip().split())
    if KEYWORDS.search(text):
        text = LITERAL.sub(lambda m: m.group(1) + "<str>" + m.group(1), text)
    return text if len(text) <= limit else text[:limit] + "..."


def line_list(numbers, cap=8):
    shown = ",".join(str(n) for n in numbers[:cap])
    return shown + (f",+{len(numbers) - cap}" if len(numbers) > cap else "")


def method_signatures(lines):
    out = []
    pattern = re.compile(r"^  (?:public\s+)?(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>(]*>)?\(")
    for index, line in enumerate(lines):
        match = pattern.match(line)
        if not match or match.group(1) in NOT_METHOD:
            continue
        chunk = []
        for follow in lines[index : index + 8]:
            chunk.append(follow.strip())
            if follow.rstrip().endswith("{") or follow.rstrip().endswith(";"):
                break
        signature = " ".join(chunk).rstrip("{; ").strip()
        out.append((index + 1, signature if len(signature) <= 160 else signature[:160] + "..."))
    return out


def dto_classes(lines):
    result = []
    current = None
    pending = []
    for line in lines:
        stripped = line.strip()
        cls = re.match(r"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)", stripped)
        if cls:
            current = (cls.group(1), [])
            result.append(current)
            pending = []
            continue
        if current is None:
            continue
        if stripped.startswith("@"):
            name = re.match(r"@(\w+)\s*(?:\((.*)\))?", stripped)
            if name:
                keep_args = name.group(2) and not name.group(1).startswith("Api")
                pending.append(name.group(1) + ("(" + name.group(2)[:40] + ")" if keep_args else ""))
            continue
        prop = re.match(r"(?:readonly\s+)?(\w+)([?!]?)\s*:\s*([^;=]+)", stripped)
        if prop and not stripped.startswith(("//", "*", "}")):
            current[1].append(f"{prop.group(1)}{prop.group(2)}: {prop.group(3).strip()} [{', '.join(pending) or '-'}]")
            pending = []
    return result


def analyze_service(path, lines, text):
    out = []
    methods = method_signatures(lines)
    out.append("- Public method: " + ("; ".join(f"L{n} `{s}`" for n, s in methods) if methods else "CHƯA RÕ/không thấy"))
    calls = {}
    for number, line in enumerate(lines, 1):
        for m in re.finditer(r"\b(?:this\.prisma|tx)\.(\w+)\.(\w+)\(", line):
            if not m.group(1).startswith("$"):
                calls.setdefault(f"{m.group(1)}.{m.group(2)}", []).append(number)
    if calls:
        out.append("- Prisma: " + "; ".join(f"{k} (L{line_list(v)})" for k, v in sorted(calls.items())))
    tx = [n for n, line in enumerate(lines, 1) if "$transaction" in line]
    raw = [n for n, line in enumerate(lines, 1) if re.search(r"\$(queryRaw|executeRaw)", line)]
    out.append("- $transaction: " + (f"CÓ (L{line_list(tx)})" if tx else "KHÔNG"))
    if raw:
        out.append(f"- Raw SQL: L{line_list(raw)}")
    throws = {}
    for number, line in enumerate(lines, 1):
        for m in re.finditer(r"throw\s+new\s+(\w+)", line):
            throws.setdefault(m.group(1), []).append(number)
    if throws:
        out.append("- Throw: " + "; ".join(f"{k} x{len(v)} (L{line_list(v, 5)})" for k, v in sorted(throws.items())))
    ext = []
    for number, line in enumerate(lines, 1):
        for m in re.finditer(r"\bfetch\(|\baxios\b|\bsupabase\w*\.(\w+)|\bhttpService\.\w+|\bnew\s+(?:OAuth2Client|Resend|Twilio)\b", line):
            ext.append(f"{m.group(0).strip('(')}@L{number}")
    if ext:
        out.append("- Gọi ngoài: " + ", ".join(sorted(set(ext), key=ext.index)[:12]))
    imports = sorted({m.group(1) for m in re.finditer(r"from\s+['\"]([^.'\"][^'\"]*)['\"]", text) if not m.group(1).startswith("@nestjs/")})
    if imports:
        out.append("- Import thư viện ngoài (ngoài @nestjs): " + ", ".join(imports))
    flagged = [(n, line) for n, line in enumerate(lines, 1) if FLAGS.search(line)]
    if flagged:
        out.append("- Dấu mock/TODO: " + " | ".join(f"L{n}: {safe_line(line, 110)}" for n, line in flagged[:12]) + (f" (+{len(flagged) - 12} dòng)" if len(flagged) > 12 else ""))
    return out


def digest_for_files(title, files, findings):
    files_sec, ctrl_sec, svc_sec, dto_sec, other_sec = [], [], [], [], []
    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        text = read_text(path, findings)
        if text is None:
            files_sec.append(f"- {rel}: CHƯA RÕ (>200KB)")
            continue
        lines = text.splitlines()
        files_sec.append(f"- {rel} ({len(lines)} dòng)")
        name = path.name
        if name.endswith(".spec.ts"):
            continue
        if SECRETISH.search(name):
            names = sorted(set(EXPORT.findall(text)))
            other_sec.append(f"- {name} (chỉ tên export): " + (", ".join(names) or "không có"))
            continue
        if "controller" in name.lower():
            for route in inv.controller_routes(path, text):
                ctrl_sec.append(f"- {route}")
        elif ".dto." in name or "/dto/" in rel or "entity" in name.lower():
            for cls, fields in dto_classes(lines):
                dto_sec.append(f"- {cls}: " + ("; ".join(fields) if fields else "không có field"))
        elif "service" in name.lower() or "@Injectable" in text:
            svc_sec.append(f"#### {name}")
            svc_sec.extend(analyze_service(path, lines, text))
        else:
            names = sorted(set(EXPORT.findall(text)))
            flagged = [(n, line) for n, line in enumerate(lines, 1) if FLAGS.search(line)]
            extra = (" | mock/TODO: " + " | ".join(f"L{n}: {safe_line(line, 90)}" for n, line in flagged[:4])) if flagged else ""
            other_sec.append(f"- {name} (export): " + (", ".join(names[:15]) or "không có") + extra)
    return [
        (f"# Digest: {title}", []),
        ("## Files", files_sec),
        ("## Controller (route -> handler; guard)", ctrl_sec or ["- không có"]),
        ("## Service", svc_sec or ["- không có"]),
        ("## DTO (field: kiểu [validator])", dto_sec or ["- không có"]),
        ("## File khác", other_sec or ["- không có"]),
    ]


def render(sections):
    def size(secs):
        return len("\n".join(h + "\n" + "\n".join(b) for h, b in secs).encode("utf-8"))

    sections = [(h, list(b)) for h, b in sections]
    cut = 0
    while size(sections) > LIMIT - 120:
        for _, body in reversed(sections[1:]):
            if len(body) > 1:
                body.pop()
                cut += 1
                break
        else:
            break
    text = "\n".join(h + "\n" + "\n".join(b) for h, b in sections)
    return text + (f"\n\n(đã cắt {cut} dòng)" if cut else "") + "\n"


def digest_main(path, findings):
    text = read_text(path, findings) or ""
    lines = text.splitlines()
    pattern = MAIN_CFG if path.name == "main.ts" else MODULE_CFG
    cfg = [f"- L{n}: {safe_line(line)}" for n, line in enumerate(lines, 1) if pattern.search(line)]
    return [(f"# Digest: {path.name}", []), ("## Files", [f"- {path.relative_to(ROOT).as_posix()} ({len(lines)} dòng)"]), ("## Cấu hình", cfg or ["- không thấy"])]


def targets():
    if REF:
        names = (git("ls-tree", "-d", "--name-only", REF, "backend/src/modules/") or "").splitlines()
        mods = sorted(n.rsplit("/", 1)[-1] for n in names)
    else:
        mods = sorted(p.name for p in (SRC / "modules").iterdir() if p.is_dir())
    return mods + ["common", "supabase", "prisma", "main", "app.module"]


def main():
    global REF
    args = []
    for arg in sys.argv[1:]:
        if arg.startswith("--ref="):
            REF = arg[6:]
        else:
            args.append(arg)
    wanted = args or targets()
    findings = set()
    OUT.mkdir(parents=True, exist_ok=True)
    for name in wanted:
        if name in {"main", "app.module"}:
            sections = digest_main(SRC / f"{name}.ts", findings)
        else:
            folder = SRC / ("modules/" + name if is_dir(SRC / "modules" / name) else name)
            if not is_dir(folder):
                print(f"{name}: CHƯA RÕ (không có thư mục)")
                continue
            sections = digest_for_files(name, list_ts(folder), findings)
        data = render(sections)
        (OUT / f"{name}.md").write_text(data, encoding="utf-8", newline="")
        print(f"{name}.md {len(data.encode('utf-8'))}B")
    inv.flush_findings(findings)
    print(f"secret_locations={len(findings)}")


if __name__ == "__main__":
    main()
