import { readFile } from "node:fs/promises";
import path from "node:path";
import { templateById } from "@/lib/mock/contract-templates";

/**
 * Trả nội dung một mẫu văn bản pháp lý theo id trong danh mục (không nhận đường dẫn tự do ⇒ không đọc được file ngoài `legal/`).
 * Nằm dưới `/admin` nên `proxy.ts` đã chặn theo phiên Admin.
 * Ưu tiên bản PDF cùng tên nếu có (vd. `legal/06_...pdf` cạnh `legal/06_...md`) — đổi sang PDF chỉ cần thả file vào `legal/`.
 * Thư mục gốc chứa `legal/`: biến môi trường `LEGAL_ROOT`, mặc định là root repo (cwd của `pnpm dev` là `apps/web`).
 */
const ROOT = process.env.LEGAL_ROOT ?? path.resolve(process.cwd(), "..", "..");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = templateById(decodeURIComponent(id));
  if (!template) return new Response("Không tìm thấy mẫu văn bản.", { status: 404 });

  const md = path.join(ROOT, template.file);
  const pdf = md.replace(/\.md$/i, ".pdf");
  for (const [file, type] of [
    [pdf, "application/pdf"],
    [md, "text/markdown; charset=utf-8"],
  ] as const) {
    try {
      const body = await readFile(file);
      return new Response(new Uint8Array(body), {
        headers: { "content-type": type, "cache-control": "private, max-age=60", "x-legal-file": path.basename(file) },
      });
    } catch {
      // thử định dạng kế tiếp
    }
  }
  return new Response(`Chưa có tệp ${template.file} trên máy chủ.`, { status: 404 });
}
