"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronUp, FlaskConical, RotateCcw } from "lucide-react";
import { DEMO_USERS, ROLE_LABEL, type Role } from "@/lib/mock/auth";
import { resetDemo } from "@/lib/mock/actions";
import { signInAs, signOut, useRole } from "@/lib/mock/useRole";
import { toast } from "@/components/ui/Toast";
import styles from "./DemoDock.module.css";

const ROLES: Role[] = ["tenant", "landlord", "host", "admin"];

/**
 * Bảng điều khiển demo (nổi góc màn hình): đổi vai trò tức thì và đặt lại dữ liệu.
 * Không thuộc sản phẩm thật — chỉ có ở bản MVP mock để trình diễn xuyên suốt 4 vai trò.
 */
export function DemoDock() {
  const role = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (pathname === "/login") return null;
  const lifted = pathname.startsWith("/host");
  const onDetail = pathname.startsWith("/units/");

  const switchTo = (r: Role) => {
    signInAs(r);
    setOpen(false);
    router.push(DEMO_USERS[r].home);
    router.refresh();
  };

  return (
    <div ref={root} className={`${styles.dock} ${lifted ? styles.lifted : ""} ${onDetail ? styles.onDetail : ""} no-print`}>
      {open && (
        <div className={styles.menu} role="menu" aria-label="Chuyển vai trò demo">
          <p className={styles.menuHead}>Xem thử với vai trò</p>
          {ROLES.map((r) => (
            <button key={r} type="button" role="menuitemradio" aria-checked={role === r} className={styles.item} onClick={() => switchTo(r)}>
              <span className={styles.itemText}>
                <strong>{ROLE_LABEL[r]}</strong>
                <span>{DEMO_USERS[r].name}</span>
              </span>
              {role === r && <Check size={16} />}
            </button>
          ))}
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              signOut();
              setOpen(false);
              router.push("/");
              router.refresh();
            }}
          >
            <span className={styles.itemText}>
              <strong>Khách vãng lai</strong>
              <span>Chưa đăng nhập · nhắn 1 lần</span>
            </span>
            {role === null && <Check size={16} />}
          </button>
          <hr className="divider" />
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              resetDemo();
              setOpen(false);
              toast("Đã đặt lại dữ liệu demo", "success");
            }}
          >
            <RotateCcw size={15} />
            <span className={styles.itemText}>
              <strong>Đặt lại dữ liệu demo</strong>
              <span>Lịch hẹn, thông báo, cọc, chat</span>
            </span>
          </button>
        </div>
      )}
      <button type="button" className={styles.pill} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <FlaskConical size={15} />
        <span>Demo · {role ? ROLE_LABEL[role] : "Khách vãng lai"}</span>
        <ChevronUp size={14} className={open ? styles.flip : ""} />
      </button>
    </div>
  );
}
