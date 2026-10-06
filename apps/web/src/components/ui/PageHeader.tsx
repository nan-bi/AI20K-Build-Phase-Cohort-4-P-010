import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}

/** Tiêu đề đầu trang cho mọi màn trong PortalShell: tên màn, mô tả một câu, hành động chính. */
export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border">
      <div className="flex flex-col items-start max-w-2xl gap-2">
        {back && (
          <Button variant="ghost" size="sm" render={<Link href={back.href} />} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground h-8 rounded-full">
            <ArrowLeft size={16} className="mr-1.5" />
            {back.label}
          </Button>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-base font-medium text-muted-foreground leading-relaxed mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
