import type { ReactNode } from "react";

interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Bỏ padding thân — dùng khi children đã tự có khoảng cách, ví dụ DataTable. */
  flush?: boolean;
}

/** Panel viền một cấp cho một nhóm nội dung: bảng, form hoặc khối chi tiết. */
export function Section({ title, description, actions, children, flush }: SectionProps) {
  const hasHead = Boolean(title || description || actions);
  return (
    <section className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col">
      {hasHead && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>}
            {description && <p className="text-sm font-medium text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={flush ? "" : "p-5 md:p-6"}>{children}</div>
    </section>
  );
}
