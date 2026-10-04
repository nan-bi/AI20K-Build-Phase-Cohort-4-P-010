"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { hostApi, refreshHost, useHostBoard } from "@/lib/host/api";
import { hostErrorText } from "@/lib/host/logic";
import { DEMO_USERS } from "@/lib/mock/actors";
import { fmtTime, relTime } from "@/lib/mock/format";
import { noticesFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./HostSideTools.module.css";

const HOST = DEMO_USERS.host;

export function HostSideTools({ sale }: { sale: boolean }) {
  const state = useMock();
  const now = useNow(30_000);
  const board = useHostBoard(sale);
  const [bell, setBell] = useState(false);
  const [busy, setBusy] = useState(false);

  // Chuông thông báo: vẫn là dữ liệu mô phỏng (thông báo Zalo/push chưa có backend) — hồ sơ 15 non-goal.
  const pushes = noticesFor(state, "host", HOST.refId).slice(0, 12);
  const recent = now ? pushes.filter((n) => now - new Date(n.at).getTime() < 5 * 60_000).length : 0;

  const duty = board.state.status === "ready" ? board.state.data.dutyStatus : null;
  const guiding = duty === "BUSY_VIEWING";
  const onDuty = duty === "ONLINE_AVAILABLE" || guiding;

  async function toggle() {
    if (!duty || guiding || busy) return;
    setBusy(true);
    const res = await hostApi.setDuty(onDuty ? "OFF_DUTY" : "ONLINE_AVAILABLE");
    setBusy(false);
    if (!res.ok) toast(hostErrorText(res));
    refreshHost();
  }

  return (
    <div className={styles.tools}>
      {sale && (
        <button
          type="button"
          className={`${styles.duty} ${onDuty ? styles.dutyOn : ""}`}
          aria-pressed={onDuty}
          disabled={!duty || guiding || busy}
          title={guiding ? "Đang dẫn khách — chưa tắt trực được" : undefined}
          onClick={() => void toggle()}
        >
          <span className={styles.dot} />
          <span>{!duty ? "Đang tải…" : guiding ? "Đang dẫn khách" : onDuty ? "Đang trực" : "Nghỉ ca"}</span>
        </button>
      )}

      <button type="button" className={styles.bell} aria-label="Thông báo (demo)" aria-expanded={bell} onClick={() => setBell(true)}>
        <Bell size={18} />
        <span>Thông báo · demo</span>
        {recent > 0 && <i className={styles.badge}>{recent}</i>}
      </button>

      <Modal open={bell} onClose={() => setBell(false)} title="Thông báo (demo)" variant="center">
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
