"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { STATUS_META } from "@/components/booking/status";
import { adminReassign } from "@/lib/mock/actions";
import { dayLabel, fmtTime, maskPhone } from "@/lib/mock/format";
import { useMock } from "@/lib/mock/store";
import { HOSTS, hostById, unitAddress, unitById } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

const SLA_MS = 180_000;
type Filter = "today" | "open" | "all";

export function AdminBookings() {
  const state = useMock();
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>("open");
  const [pick, setPick] = useState<Record<string, string>>({});
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 360 }} />;

  const all = [...state.bookings].sort((a, b) => a.slot.localeCompare(b.slot));
  const list = all.filter((b) => (filter === "all" ? true : filter === "today" ? dayLabel(b.slot, now) === "Hôm nay" : ["pending", "confirmed", "lobby", "receiving", "viewing", "closing"].includes(b.status)));
  const breaches = all.filter((b) => b.status === "pending" && now - new Date(b.createdAt).getTime() > SLA_MS).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Điều phối lịch xem</h1>
          <p className="muted">Auto-Dispatch 3 tầng: Host gần nhất (SLA 3 phút) → Open Pool 500m → Area Lead. Ticket quá hạn hiện màu đỏ để can thiệp tay.</p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {(
          [
            ["open", "Đang xử lý"],
            ["today", "Hôm nay"],
            ["all", "Tất cả"],
          ] as [Filter, string][]
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>
      {breaches > 0 && (
        <p className={styles.warnText}>
          <AlertTriangle size={16} /> {breaches} ticket quá SLA 3 phút cần điều phối
        </p>
      )}

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableScroll}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th scope="col">Giờ hẹn</th>
                <th scope="col">Căn hộ</th>
                <th scope="col">Khách</th>
                <th scope="col">Field Host</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">SLA nhận ca</th>
                <th scope="col">Điều phối</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const wait = now - new Date(b.createdAt).getTime();
                const over = b.status === "pending" && wait > SLA_MS;
                const took = b.confirmedAt ? Math.round((new Date(b.confirmedAt).getTime() - new Date(b.createdAt).getTime()) / 1000) : null;
                return (
                  <tr key={b.id} style={over ? { background: "#fff7f5" } : undefined}>
                    <td>
                      <b className="tnum">{fmtTime(b.slot)}</b>
                      <span className="muted xs" style={{ display: "block" }}>
                        {dayLabel(b.slot, now)}
                      </span>
                    </td>
                    <td>
                      {unitAddress(unitById(b.unitId)!)}
                      <span className="muted xs" style={{ display: "block" }}>
                        {b.ref}
                      </span>
                    </td>
                    <td>
                      {b.tenant.name}
                      <span className="muted xs" style={{ display: "block" }}>
                        {maskPhone(b.tenant.phone)}
                      </span>
                    </td>
                    <td>{hostById(b.hostId)?.name}</td>
                    <td>
                      <span className={`badge ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span>
                    </td>
                    <td>
                      {b.status === "pending" ? (
                        over ? (
                          <span className={styles.warnText}>
                            <AlertTriangle size={14} aria-label="Quá SLA" /> Quá {Math.floor(wait / 60_000)} phút
                          </span>
                        ) : (
                          <span className="muted tnum">Còn {Math.max(0, Math.ceil((SLA_MS - wait) / 1000))} giây</span>
                        )
                      ) : took !== null ? (
                        <span className={took <= 180 ? styles.okText : styles.warnText}>
                          {took <= 180 ? <CheckCircle2 size={14} aria-label="Đạt" /> : <AlertTriangle size={14} aria-label="Vượt" />} {took} giây
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {b.status === "pending" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <select className="select" style={{ minHeight: 36, minWidth: 140 }} value={pick[b.id] ?? ""} onChange={(e) => setPick({ ...pick, [b.id]: e.target.value })} aria-label={`Giao ticket ${b.ref} cho Host`}>
                            <option value="">Giao cho…</option>
                            {HOSTS.filter((h) => h.status !== "off_duty" && h.id !== b.hostId).map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            disabled={!pick[b.id]}
                            onClick={() => {
                              adminReassign(b.id, pick[b.id]);
                              toast(`Đã giao ticket ${b.ref} cho ${hostById(pick[b.id])?.name}`, "success");
                            }}
                          >
                            Giao
                          </button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    Không có lịch nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
