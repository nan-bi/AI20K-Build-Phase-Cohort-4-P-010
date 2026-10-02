"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DEMO_USERS } from "@/lib/mock/actors";
import { fmtTime, relTime } from "@/lib/mock/format";
import { noticesFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./HostSideTools.module.css";

const HOST = DEMO_USERS.host;

export function HostSideTools() {
  const state = useMock();
  const now = useNow(30_000);
  const [bell, setBell] = useState(false);
  const [onDuty, setOnDuty] = useState(true);

  const pushes = noticesFor(state, "host", HOST.refId).slice(0, 12);
  const recent = now ? pushes.filter((n) => now - new Date(n.at).getTime() < 5 * 60_000).length : 0;

  return (
    <div className={styles.tools}>
      <button
        type="button"
        className={`${styles.duty} ${onDuty ? styles.dutyOn : ""}`}
        aria-pressed={onDuty}
        onClick={() => setOnDuty((v) => !v)}
      >
        <span className={styles.dot} />
        <span>{onDuty ? "Đang trực" : "Nghỉ ca"}</span>
      </button>

      <button
        type="button"
        className={styles.bell}
        aria-label="Thông báo"
        aria-expanded={bell}
        onClick={() => setBell(true)}
      >
        <Bell size={18} />
        <span>Thông báo</span>
        {recent > 0 && <i className={styles.badge}>{recent}</i>}
      </button>

      <Modal open={bell} onClose={() => setBell(false)} title="Thông báo" variant="center">
        <ul className={styles.list}>
          {pushes.length === 0 && <li className="muted small">Chưa có thông báo.</li>}
          {pushes.map((n) => (
            <li key={n.id} className={`${styles.item} ${styles[`tone-${n.tone ?? "info"}`] || ""}`}>
              <div>
                <b>{n.title}</b>
                <p className="small muted">{n.body}</p>
              </div>
              <span className="xs muted">{now ? `${fmtTime(n.at)} · ${relTime(n.at, now)}` : ""}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
