import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Facade } from "@/components/brand/Facade";

interface AsideCopy {
  caption: string;
  lit: number;
}

const ASIDE_COPY: Record<"default" | "internal", AsideCopy> = {
  default: {
    caption: "Tìm căn thật, biết trước mọi chi phí hàng tháng, xem nhà có Field Host đón tại sảnh.",
    lit: 17,
  },
  internal: {
    caption: "Khu vực nội bộ VinStay",
    lit: 4,
  },
};

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "internal" cho admin: panel trái chỉ Logo + lời nhắc khu nội bộ, Facade mờ. */
  aside?: "default" | "internal";
}

/** Khung hai cột cho các màn đăng nhập/đăng ký: panel trái thương hiệu, panel phải là form. */
export function AuthLayout({ title, description, children, footer, aside = "default" }: AuthLayoutProps) {
  const copy = ASIDE_COPY[aside];
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      <aside className="hidden md:flex flex-col justify-between w-[40%] max-w-[480px] bg-zinc-950 p-12 text-zinc-50 relative overflow-hidden shrink-0">
        <div className="z-10 relative">
          <Logo inverse />
        </div>
        
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 mix-blend-screen overflow-hidden">
          <div className="w-[150%] h-[150%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <Facade className="w-full h-auto text-zinc-50 opacity-20" lit={copy.lit} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-transparent to-transparent" />
        </div>
        
        <p className="z-10 relative text-lg font-medium text-zinc-300 max-w-sm">
          {copy.caption}
        </p>
      </aside>
      
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-24 min-h-[100dvh]">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          <div className="md:hidden flex justify-center mb-4">
            <Logo />
          </div>
          
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
          </div>
          
          <div className="flex flex-col gap-6">{children}</div>
          
          {footer && <div className="mt-8 pt-8 border-t border-border text-sm text-center text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
