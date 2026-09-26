"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

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
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[variant]}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      {open && (
        <div className={styles.panel}>
          {(title || !hideClose) && (
            <header className={styles.head}>
              <div>
                {title && <h2 className={styles.title}>{title}</h2>}
                {description && <p className={`muted small ${styles.desc}`}>{description}</p>}
              </div>
              {!hideClose && (
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
                  <X size={20} />
                </button>
              )}
            </header>
          )}
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.foot}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
