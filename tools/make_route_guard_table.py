from pathlib import Path
import re

ROOT = Path.cwd()
MODULES = ROOT / "backend/src/modules"
OUT = ROOT / "ai-pack/ROUTE_GUARD_TABLE.md"
PREFIX = "/api/v1"  # mặc định của main.ts; có thể bị API_PREFIX ghi đè
HTTP = r"Get|Post|Put|Patch|Delete|Options|Head|All"
# Gợi ý theo module, chỉ để người duyệt; không phải sự thật trong code.
HINT = {"admin": "ops_admin", "host": "field_host", "landlord": "landlord", "account": "tenant|landlord (CHƯA RÕ)"}
BOOTSTRAP = {"auth"}  # đăng nhập/đăng ký/OTP: public thường có chủ đích, người duyệt xác nhận từng route


def decorators(lines, index):
    out = []
    i = index - 1
    while i >= 0 and lines[i].strip().startswith("@"):
        out.insert(0, lines[i].strip())
        i -= 1
    return out


def arg(decs, name):
    for d in decs:
        m = re.match(rf"@{name}\s*(?:\((.*)\))?", d)
        if m:
            return (m.group(1) or "").strip()
    return None


def routes(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    cls = next((i for i, l in enumerate(lines) if re.match(r"\s*export\s+class\s+\w+Controller\b", l)), None)
    if cls is None:
        return []
    class_decs = decorators(lines, cls)
    base = (arg(class_decs, "Controller") or "").strip("'\"`/")
    class_public = arg(class_decs, "Public") is not None
    class_roles = arg(class_decs, "Roles")
    class_guards = arg(class_decs, "UseGuards")
    rows = []
    for i in range(cls + 1, len(lines)):
        m = re.match(rf"\s*@({HTTP})\s*(?:\((.*?)\))?\s*$", lines[i])
        if not m:
            continue
        sub = (m.group(2) or "").strip().strip("'\"`/")
        decs = decorators(lines, i) + [lines[i].strip()]
        # decorator đứng sau @Get cũng thuộc cùng method
        j = i + 1
        while j < len(lines) and lines[j].strip().startswith("@"):
            decs.append(lines[j].strip())
            j += 1
        handler = "CHƯA RÕ"
        for k in range(j, min(j + 6, len(lines))):
            hm = re.match(r"\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(", lines[k])
            if hm:
                handler = hm.group(1)
                break
        method_roles = arg(decs, "Roles")
        rows.append({
            "verb": m.group(1).upper(),
            "path": "/".join(p for p in (base, sub) if p),
            "handler": handler,
            "line": i + 1,
            "public": class_public or arg(decs, "Public") is not None,
            "roles": method_roles if method_roles is not None else class_roles,
            "guards": [g for g in (class_guards, arg(decs, "UseGuards")) if g],
        })
    return rows


def status(row):
    if row["public"] and row["roles"]:
        return "PUBLIC + ROLES (xung đột: RolesGuard vẫn chạy, user rỗng -> 403)"
    if row["public"]:
        return "PUBLIC: không xác thực"
    if row["roles"]:
        return f"Đăng nhập + vai trò {row['roles']}"
    return "Đăng nhập, mọi vai trò (không @Roles)"


def main():
    files = sorted(MODULES.rglob("*.controller.ts"))
    per_module = {}
    for f in files:
        module = f.relative_to(MODULES).parts[0]
        for r in routes(f):
            r["file"] = f.relative_to(ROOT).as_posix()
            per_module.setdefault(module, []).append(r)

    total = sum(len(v) for v in per_module.values())
    pub = sum(1 for v in per_module.values() for r in v if r["public"])
    roles = sum(1 for v in per_module.values() for r in v if r["roles"])
    out = [
        "# Route–Guard Table (backend)",
        "",
        "Nguồn: `backend/src/modules/**/*.controller.ts` trên `main` `0334ebf`, sinh bằng `tools/make_route_guard_table.py`. Đường dẫn thật = `" + PREFIX + "` + path (prefix lấy từ `API_PREFIX`, mặc định `api/v1`).",
        "",
        "## Cách guard hoạt động (đã đọc code)",
        "- `app.module.ts` đăng ký toàn cục 2 `APP_GUARD`: `SupabaseAuthGuard` rồi `RolesGuard`.",
        "- `SupabaseAuthGuard`: route có `@Public()` (method hoặc class) thì bỏ qua xác thực. Ngược lại cần token (cookie `vs_access` hoặc `Authorization: Bearer`); thiếu/sai token -> `unauthorized`. Có chế độ demo: header `x-demo-role` bỏ qua xác thực nếu `AUTH_DEMO_MODE=true` và `NODE_ENV!=production`.",
        "- `RolesGuard`: không có `@Roles` thì cho qua mọi người (kể cả chưa đăng nhập nếu `@Public`). Có `@Roles` thì cần `user.role` nằm trong danh sách; riêng `field_host` phải `isHostVerified`.",
        "- `ThrottlerGuard` chỉ gắn thủ công ở `auth.controller.ts` và `otp.controller.ts`, không toàn cục.",
        "- Vai trò hợp lệ (`auth.constants.ts`): `tenant`, `landlord`, `field_host`, `ops_admin`.",
        "",
        "## Tổng kết",
        f"- Route: {total}; có `@Public`: {pub}; có `@Roles`: {roles}; còn lại cần đăng nhập nhưng không giới hạn vai trò: {total - pub - roles}.",
        f"- Checklist cần gắn (`[ ]`, public và chưa `@Roles`, không tính `auth`): {sum(1 for k, v in per_module.items() if k not in BOOTSTRAP for r in v if r['public'] and not r['roles'])}; `auth` cần xem xét (`(?)`): {sum(1 for r in per_module.get('auth', []) if r['public'] and not r['roles'])}.",
        "",
        "| Module | Route | PUBLIC | ROLES | Cần gắn @Roles |",
        "|---|---:|---:|---:|---:|",
    ]
    for module, items in sorted(per_module.items()):
        p = sum(1 for r in items if r["public"])
        ro = sum(1 for r in items if r["roles"])
        need = sum(1 for r in items if r["public"] and not r["roles"] and module not in BOOTSTRAP)
        out.append(f"| {module} | {len(items)} | {p} | {ro} | {need if module not in BOOTSTRAP else 'xem xét'} |")
    out += ["", "## Chi tiết theo module", "",
            "Cột `Gợi ý` chỉ là đề xuất theo tên module để người duyệt; KHÔNG phải sự thật trong code. `[ ]` = checklist chưa gắn guard.", ""]
    for module, items in sorted(per_module.items()):
        out.append(f"### {module}")
        out.append("")
        out.append("| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |")
        out.append("|---|---|---|---|---|---|---|---|---|---|")
        for r in items:
            todo = "[ ]" if r["public"] and not r["roles"] else "—"
            hint = HINT.get(module, "CHƯA RÕ") if todo == "[ ]" else "—"
            if todo == "[ ]" and module in BOOTSTRAP:
                todo, hint = "(?)", "auth bootstrap: public có thể đúng chủ đích, cần người xác nhận"
            guards = ", ".join(r["guards"]) or "—"
            out.append(
                f"| {todo} | {r['verb']} | `/{r['path']}` | {r['handler']} | {r['file']}:{r['line']} | "
                f"{'có' if r['public'] else 'không'} | {r['roles'] if r['roles'] else 'không'} | {guards} | {status(r)} | {hint} |"
            )
        out.append("")
    OUT.write_text("\n".join(out).replace("|", "|") + "\n", encoding="utf-8", newline="")
    print(f"routes={total} public={pub} roles={roles} modules={len(per_module)}")


if __name__ == "__main__":
    main()
