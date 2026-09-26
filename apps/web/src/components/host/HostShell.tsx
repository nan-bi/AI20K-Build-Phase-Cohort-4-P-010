"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpenText, Bell, LogOut, Radio, Wallet, X } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtTime, relTime } from "@/lib/mock/format";
import { noticesFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { signOut } from "@/lib/mock/useRole";
import { useNow } from "@/lib/useNow";
import styles from "./HostShell.module.css";

const HOST = DEMO_USERS.host;
const TABS = [
  { href: "/host/dispatch", label: "Lịch & yêu cầu", icon: Radio },
  { href: "/host/earnings", label: "Thu nhập", icon: Wallet },
  { href: "/host/handbook", label: "Sổ tay", icon: BookOpenText },
];

/** Khung ứng dụng Field Host: mobile-first, thanh điều hướng đáy, chuông thông báo đẩy. */
export function HostShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const state = useMock();
  const now = useNow(30_000);
  const [bell, setBell] = useState(false);
  const [onDuty, setOnDuty] = useState(true);

  const pushes = noticesFor(state, "host", HOST.refId).slice(0, 12);
  const pending = state.bookings.filter((b) => b.hostId === HOST.refId && b.status === "pending").length;
  const recent = now ? pushes.filter((n) => now - new Date(n.at).getTime() < 5 * 60_000).length : 0;

  return (
    <div className={styles.frame}>
      <div className={styles.app}>
        <header className={styles.top}>
          <div className={styles.who}>
            <LogoMark size={30} inverse />
            <div>
              <strong>{HOST.name}</strong>
              <span>Field Host · Sapphire 1 &amp; 2</span>
            </div>
          </div>
          <div className={styles.topRight}>
            <button type="button" className={`${styles.duty} ${onDuty ? styles.on : ""}`} aria-pressed={onDuty} onClick={() => setOnDuty((v) => !v)}>
              <span /> {onDuty ? "Đang trực" : "Nghỉ ca"}
            </button>
            <button type="button" className={styles.bell} aria-label="Thông báo" aria-expanded={bell} onClick={() => setBell((v) => !v)}>
              <Bell size={20} />
              {recent > 0 && <i>{recent}</i>}
            </button>
            <button
              type="button"
              className={styles.bell}
              aria-label="Đăng xuất"
              onClick={() => {
                signOut();
                router.push("/login?as=host");
                router.refresh();
              }}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        {bell && (
          <div className={styles.sheet} role="dialog" aria-label="Thông báo">
            <div className={styles.sheetHead}>
              <strong>Thông báo</strong>
              <button type="button" className="icon-btn" aria-label="Đóng" onClick={() => setBell(false)}>
                <X size={18} />
              </button>
            </div>
            <ul>
              {pushes.length === 0 && <li className="muted small">Chưa có thông báo.</li>}
              {pushes.map((n) => (
                <li key={n.id} className={styles[`tone-${n.tone ?? "info"}`]}>
                  <div>
                    <b>{n.title}</b>
                    <p className="small muted">{n.body}</p>
                  </div>
                  <span className="xs muted">{now ? `${fmtTime(n.at)} · ${relTime(n.at, now)}` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <main className={styles.content}>{children}</main>

        <nav className={styles.tabs} aria-label="Điều hướng Field Host">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === "/host/dispatch" && pathname.startsWith("/host/viewing"));
            return (
              <Link key={href} href={href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}>
                <Icon size={21} />
                <span>{label}</span>
                {href === "/host/dispatch" && pending > 0 && <i>{pending}</i>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
