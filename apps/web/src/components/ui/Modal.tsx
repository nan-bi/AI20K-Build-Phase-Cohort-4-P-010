"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** "sheet" = trượt từ dưới lên trên mobile (vẫn là hộp thoại giữa màn hình trên desktop). */
  variant?: "center" | "sheet" | "wide";
  children: ReactNode;
  footer?: ReactNode;
  hideClose?: boolean;
}

/** Hộp thoại dựa trên <dialog> gốc: tự bẫy focus, đóng bằng Esc và trả focus về nút mở. */
export function Modal({ open, onClose, title, description, variant = "center", children, footer, hideClose }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      document.body.style.overflow = 'hidden';
    }
    if (!open && dlg.open) {
      dlg.close();
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  let widthClass = "max-w-md";
  if (variant === "wide") widthClass = "max-w-4xl w-[95vw]";
  if (variant === "sheet") widthClass = "max-w-xl w-[95vw] md:w-full";

  return (
    <dialog
      ref={ref}
      className={`
        backdrop:bg-background/80 backdrop:backdrop-blur-sm
        bg-transparent p-0 m-0 w-full h-full max-w-none max-h-none
        fixed inset-0 z-50 hidden open:flex items-center justify-center
        open:animate-in open:fade-in-0 duration-200
        ${variant === "sheet" ? "items-end sm:items-center" : "items-center"}
      `}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      {open && (
        <div 
          className={`
            bg-card text-foreground shadow-xl 
            flex flex-col overflow-hidden w-full relative
            ${widthClass}
            ${variant === "sheet" 
              ? "rounded-t-3xl sm:rounded-3xl max-h-[90vh] min-h-[50vh] sm:min-h-0 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95" 
              : "rounded-3xl m-4 max-h-[90vh] animate-in zoom-in-95"
            }
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || !hideClose) && (
            <header className="flex items-start justify-between p-6 border-b border-border/50 shrink-0 sticky top-0 bg-card/95 backdrop-blur z-10">
              <div className="flex flex-col gap-1 pr-6">
                {title && <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>}
                {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
              </div>
              {!hideClose && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  aria-label="Đóng" 
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted -mr-2 -mt-2 shrink-0"
                >
                  <X size={20} />
                </Button>
              )}
            </header>
          )}
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
            {children}
          </div>
          
          {footer && (
            <footer className="p-6 border-t border-border/50 bg-muted/20 shrink-0 mt-auto sticky bottom-0 z-10">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
