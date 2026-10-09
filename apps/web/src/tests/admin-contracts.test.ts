import { describe, expect, it } from "vitest";
import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseRegistryKey } from "@/lib/admin/api";
import { renderMarkdown } from "@/lib/legal/markdown";
import { CONTRACT_TEMPLATES, templateForKind } from "@/lib/mock/contract-templates";
import { GET } from "@/app/admin/legal/[id]/route";

const html = (md: string) => renderToStaticMarkup(createElement(Fragment, null, ...renderMarkdown(md)));

describe("Sổ hợp đồng — khoá chi tiết", () => {
  it("kind-uuid ⇒ đúng loại; uuid trần (link cũ từ trang Theo bên ký) ⇒ HĐ thuê", () => {
    const id = "4f6c1d2e-1111-4222-8333-944445555666";
    expect(parseRegistryKey(`holding-${id}`)).toEqual({ kind: "holding", id });
    expect(parseRegistryKey(`partnership-${id}`)).toEqual({ kind: "partnership", id });
    expect(parseRegistryKey(id)).toEqual({ kind: "lease", id });
  });

  it("mỗi loại trong sổ có đúng một mẫu chính", () => {
    for (const kind of ["mandate", "holding", "lease", "partnership"] as const) expect(templateForKind(kind).binds).toBe(kind);
  });
});

describe("Mẫu văn bản — tệp và hiển thị", () => {
  it("mọi mẫu trong danh mục trỏ tới tệp có thật trong legal/", () => {
    const root = resolve(process.cwd(), "..", "..");
    const missing = CONTRACT_TEMPLATES.filter((t) => !existsSync(resolve(root, t.file))).map((t) => t.file);
    expect(missing).toEqual([]);
  });

  it("route /admin/legal/[id]: trả markdown của mẫu; id ngoài danh mục ⇒ 404 (không đọc đường dẫn tự do)", async () => {
    const ok = await GET(new Request("http://x"), { params: Promise.resolve({ id: "CORE-06" }) });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toMatch(/markdown/);
    expect(await ok.text()).toMatch(/HỢP ĐỒNG THUÊ CĂN HỘ/);

    const bad = await GET(new Request("http://x"), { params: Promise.resolve({ id: "../../package.json" }) });
    expect(bad.status).toBe(404);
  });

  it("markdown: tiêu đề, danh sách, đậm/nghiêng, bảng, đường kẻ; không chèn HTML thô", () => {
    const out = html("# Tiêu đề\n**Đậm** và *nghiêng*\n\n* Mục 1\n* Mục 2\n\n---\n| A | B |\n|---|---|\n| 1 | 2 |\n\n<script>x</script>");
    expect(out).toContain("<h1>Tiêu đề</h1>");
    expect(out).toContain("<strong>Đậm</strong>");
    expect(out).toContain("<em>nghiêng</em>");
    expect(out).toContain("<ul><li>Mục 1</li><li>Mục 2</li></ul>");
    expect(out).toContain("<hr/>");
    expect(out).toContain("<th>A</th>");
    expect(out).toContain("<td>2</td>");
    expect(out).not.toContain("<script>");
  });
});
