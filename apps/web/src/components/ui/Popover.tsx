"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Popover.module.css";

interface PopoverChipProps {
  icon?: ReactNode;
  label: string;
  /** Chip đã có giá trị → tô đậm. */
  active?: boolean;
  title: string;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  /** Mở panel lên trên (dùng cho khung chat ở đáy màn hình). */
  placement?: "top" | "bottom";
}

/** Chip bộ lọc có panel nổi; trên mobile panel trở thành bottom sheet. */
export function PopoverChip({ icon, label, active, title, children, align = "start", placement = "bottom" }: PopoverChipProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={`${styles.chip} ${active ? styles.active : ""}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={14} className={styles.caret} />
      </button>
      {open && (
        <>
          <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden />
          <div id={id} role="dialog" aria-label={title} className={`${styles.panel} ${align === "end" ? styles.end : ""} ${placement === "top" ? styles.top : ""}`}>
            <div className={styles.panelHead}>{title}</div>
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}
