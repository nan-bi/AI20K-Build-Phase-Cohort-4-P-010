"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useCrumbLabels, useRegisterCrumb } from "@/lib/ui/crumbs";

export interface Crumb {
  href: string;
  label: string;
}

/**
 * Dựng chuỗi crumb từ đường dẫn: gốc cổng → từng đoạn. Nhãn lấy theo thứ tự
 * nhãn trang đăng ký (tên thật) → `labels` tĩnh theo đường dẫn → menu của cổng → "Chi tiết" (đoạn động).
 * Thuần, export để test.
 */
export function buildCrumbs(
  pathname: string,
  opts: { root: Crumb; labels: Record<string, string>; registered?: Record<string, string> },
): Crumb[] {
  const segs = pathname.split("/").filter(Boolean);
  // Gốc cổng luôn là đoạn đầu (/admin, /landlord, /host); `root.href` chỉ là nơi bấm vào (trang chủ của cổng).
  const rootSegs = 1;
  const crumbs: Crumb[] = [opts.root];
  for (let i = rootSegs; i < segs.length; i++) {
    const href = "/" + segs.slice(0, i + 1).join("/");
    // Gốc đã trỏ tới trang chủ của cổng (mục menu đầu) — không lặp lại ở crumb kế tiếp (trùng key và dư chữ).
    if (href === opts.root.href) continue;
    const label = opts.registered?.[href] ?? opts.labels[href];
    // Đoạn động (id/mã) chưa có nhãn ⇒ "Chi tiết"; đoạn tĩnh lạ ⇒ bỏ qua thay vì hiện slug thô.
    crumbs.push({ href, label: label ?? (i === segs.length - 1 ? "Chi tiết" : "") });
  }
  return crumbs.filter((c) => c.label);
}

/** Đặt nhãn breadcrumb cho trang hiện tại. Dùng trong trang chi tiết khi đã có tên thật. */
export function CrumbLabel({ label }: { label: string | null | undefined }) {
  const pathname = usePathname();
  useRegisterCrumb(pathname, label);
  return null;
}

export function Breadcrumbs({ root, labels }: { root: Crumb; labels: Record<string, string> }) {
  const pathname = usePathname();
  const registered = useCrumbLabels();
  const crumbs = buildCrumbs(pathname, { root, labels, registered });
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Vị trí hiện tại" className="mb-4 -mt-1">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />}
              {last ? (
                <span aria-current="page" className="font-semibold text-foreground truncate max-w-[40ch]">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="inline-flex items-center gap-1 hover:text-foreground hover:underline underline-offset-4 truncate">
                  {i === 0 && <Home size={13} aria-hidden />}
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
