"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlarmClock, Check, ChevronRight, MessageSquareText, X } from "lucide-react";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { STATUS_META } from "@/components/booking/status";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { hostAccept, hostClaimBooking, hostReject, sendReminder } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { dayLabel, fmtPhone, fmtTime, vnd } from "@/lib/mock/format";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { hostBookings, isOpenBooking, openTicketsFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { hostById, unitAddress, unitById, zoneById } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Host.module.css";

const HOST_ID = DEMO_USERS.host.refId!;
const SLA_MS = 180_000;
const REJECT_REASONS = ["Trùng lịch với ca khác", "Ngoài ca trực của tôi", "Đang xử lý sự cố khẩn cấp", "Lý do khác"];

type Tab = "new" | "mine" | "history";

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function DispatchBoard() {
  const state = useMock();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>("new");
  const [rejecting, setRejecting] = useState<Booking | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const host = hostById(HOST_ID)!;

  // Nhắc hẹn kép T-10m: hệ thống tự gửi khi còn ≤ 10 phút tới giờ hẹn.
  const dueReminders = now
    ? hostBookings(state, HOST_ID)
        .filter((b) => b.status === "confirmed" && !b.reminderSentAt && new Date(b.slot).getTime() - now <= 10 * 60_000 && new Date(b.slot).getTime() - now > -30 * 60_000)
        .map((b) => b.id)
        .join(",")
    : "";
  useEffect(() => {
    if (!dueReminders) return;
    for (const id of dueReminders.split(",")) sendReminder(id);
  }, [dueReminders]);

  if (!state.ready || !now) {
    return (
      <div className={styles.page}>
        <div className="skeleton" style={{ height: 96 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  const mineAll = hostBookings(state, HOST_ID);
  const openTickets = openTicketsFor(state, HOST_ID);
  const pending = mineAll.filter((b) => b.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const active = mineAll.filter((b) => (isOpenBooking(b) && b.status !== "pending") || b.status === "holding").sort((a, b) => a.slot.localeCompare(b.slot));
  const history = mineAll.filter((b) => ["leased", "completed", "no_show", "cancelled", "rejected"].includes(b.status)).sort((a, b) => b.slot.localeCompare(a.slot));
  const today = active.filter((b) => new Date(b.slot).toDateString() === new Date(now).toDateString());
  const lobbyNow = active.find((b) => b.status === "lobby");

  const mineColumns: DataTableColumn<Booking>[] = [
    {
      key: "slot",
      header: "Giờ hẹn",
      render: (b) => {
        const slotMs = new Date(b.slot).getTime();
        const soon = b.status === "confirmed" && slotMs - now <= 10 * 60_000 && slotMs - now > -900_000;
        return (
          <div>
            <b className="tnum">{fmtTime(b.slot)}</b>
            <span className="muted xs" style={{ display: "block" }}>
              {dayLabel(b.slot, now)}
            </span>
            {soon && (
              <span className="badge badge-coral xs" style={{ marginTop: 4 }}>
                <AlarmClock size={12} /> T-10 · còn {Math.max(0, Math.ceil((slotMs - now) / 60_000))} phút
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "tenant",
      header: "Khách",
      render: (b) => (
        <div>
          <b>{b.tenant.name}</b>
          <span className="muted xs" style={{ display: "block" }}>
            {b.tenant.persons} người
          </span>
        </div>
      ),
    },
    {
      key: "unit",
      header: "Căn hộ",
      render: (b) => {
        const u = unitById(b.unitId)!;
        return (
          <div>
            <span>{unitAddress(u)}</span>
            <span className="muted xs" style={{ display: "block" }}>
              {zoneById(u.zoneId).short}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (b) => {
        const meta = STATUS_META[b.status];
        return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
      },
    },
    {
      key: "next",
      header: "Việc tiếp theo",
      render: (b) => {
        const slotMs = new Date(b.slot).getTime();
        const soon = b.status === "confirmed" && slotMs - now <= 10 * 60_000 && slotMs - now > -900_000;
        if (b.status === "receiving" || b.status === "viewing") {
          return (
            <span className="small" style={{ color: "var(--kelp-700, #047857)", fontWeight: 600 }}>
              {b.receivingAt ? `Đang dẫn · từ ${fmtTime(b.receivingAt)}` : "Đang dẫn khách"}
            </span>
          );
        }
        const cta: Record<string, string> = {
          confirmed: soon ? "Xuống sảnh đón khách" : "Xem chi tiết & chuẩn bị",
          lobby: "Đón khách ngay",
          closing: "Chờ khách cọc",
          holding: "Chờ khách làm HĐ",
        };
        return <span className="small">{cta[b.status] ?? ""}</span>;
      },
    },
  ];

  const historyColumns: DataTableColumn<Booking>[] = [
    ...mineColumns.slice(0, 4),
    {
      key: "viewLog",
      header: "Nhật ký dẫn",
      render: (b) => {
        if (b.receivingAt && b.viewEndedAt) {
          return <span className="small muted">Đã dẫn {fmtTime(b.receivingAt)}–{fmtTime(b.viewEndedAt)}</span>;
        }
        if (b.receivingAt) {
          return <span className="small muted">Bắt đầu {fmtTime(b.receivingAt)}</span>;
        }
        return <span className="small muted">—</span>;
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Lịch & yêu cầu"
        description={`Chào ${host.name.split(" ").slice(-1)[0]}, ca sáng 08:30–11:30 · ca chiều 14:00–18:00. Mỗi lịch cách nhau tối thiểu 45 phút.`}
      />

      {lobbyNow && (
        <Link href={`/host/viewing/${lobbyNow.id}`} className={styles.alert}>
          <AlarmClock size={22} />
          <div>
            <b>{lobbyNow.tenant.name} đã có mặt tại sảnh</b>
            <span>Xuống đón ngay · sảnh toà {unitById(lobbyNow.unitId)!.building}</span>
          </div>
          <ChevronRight size={20} />
        </Link>
      )}

      <div className={styles.kpis}>
        <StatTile
          label="Chờ nhận"
          value={String(pending.length + openTickets.length)}
          delta={pending.length + openTickets.length > 0 ? { text: "Cần nhận ca", tone: "bad" } : { text: "Đã xử lý hết", tone: "good" }}
        />
        <StatTile label="Lịch hôm nay" value={String(today.length)} delta={{ text: "Trong ca trực", tone: "flat" }} />
        <StatTile
          label="Nhận ca trung bình"
          value={`${Math.floor(host.avgAcceptSec / 60)}′${String(host.avgAcceptSec % 60).padStart(2, "0")}″`}
          delta={{ text: "SLA 3′00″", tone: host.avgAcceptSec <= 180 ? "good" : "bad" }}
        />
        <StatTile label="Đánh giá" value={`${String(host.rating).replace(".", ",")}★`} delta={{ text: "48 lượt đánh giá", tone: "good" }} />
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Danh sách">
        <button type="button" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>
          Yêu cầu mới {pending.length + openTickets.length > 0 && <i>{pending.length + openTickets.length}</i>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>
          Lịch của tôi
        </button>
        <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
          Lịch sử
        </button>
      </div>

      {tab === "new" && (
        <div className={styles.ticketGrid}>
          {openTickets.length > 0 && (
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge badge-coral">Ticket mở ({openTickets.length})</span>
                <span className="small muted">Ai nhận trước được giao</span>
              </div>
              <div className={styles.ticketGrid}>
                {openTickets.map((b) => {
                  const u = unitById(b.unitId)!;
                  const cost = allInCost(u, { ...DEFAULT_HOUSEHOLD, persons: b.tenant.persons });
                  const offeredCount = b.dispatch?.offeredTo.length ?? 0;
                  return (
                    <article key={b.id} className={styles.ticket} style={{ borderColor: "var(--coral-400, #fb923c)" }}>
                      <div className={styles.ticketHead}>
                        <div className={styles.ticketUnit}>
                          <VerifiedPhoto unit={u} sizes="56px" stamp="none" className={styles.thumb} />
                          <div className={styles.ticketUnitText}>
                            <b className={styles.unitAddress}>{unitAddress(u)}</b>
                            <p className="muted small">
                              {zoneById(u.zoneId).short} · All-in {vnd(cost.total)}đ
                            </p>
                          </div>
                        </div>
                        <span className="badge badge-coral">Mở cho {offeredCount} Sale</span>
                      </div>

                      <div className={styles.ticketBody}>
                        <dl className={styles.meta}>
                          <div>
                            <dt>Khách</dt>
                            <dd>
                              {b.tenant.name} · {b.tenant.persons} người
                            </dd>
                          </div>
                          <div>
                            <dt>Giờ hẹn</dt>
                            <dd>
                              {fmtTime(b.slot)} · {dayLabel(b.slot, now)}
                            </dd>
                          </div>
                        </dl>
                        {b.tenant.note && <p className={styles.note}>“{b.tenant.note}”</p>}
                        <p className={styles.otpStatus}>
                          <Check size={13} /> SĐT đã xác thực OTP Zalo · {fmtPhone(b.tenant.phone)}
                        </p>
                      </div>

                      <div className={styles.ticketActions}>
                        <button
                          type="button"
                          className="btn btn-success"
                          style={{ width: "100%" }}
                          onClick={() => {
                            const res = hostClaimBooking(b.id, HOST_ID);
                            if (res.ok) {
                              toast(`Đã nhận ca. Zalo xác nhận đã gửi cho ${b.tenant.name}`, "success");
                            } else if (res.code === "taken") {
                              toast("Đã có Sale khác nhận trước");
                            } else {
                              toast(res.reason || "Không thể nhận ticket");
                            }
                          }}
                        >
                          <Check size={17} /> Nhận ticket
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {pending.length === 0 && openTickets.length === 0 && (
            <div className={styles.empty}>
              <MessageSquareText size={28} />
              <b>Chưa có yêu cầu mới</b>
              <p className="muted small">Khi khách đặt lịch, ticket hiện ở đây kèm đồng hồ 3 phút nhận việc. Thử đặt lịch bằng vai trò khách thuê, ticket sẽ xuất hiện ngay.</p>
            </div>
          )}
          {pending.map((b) => {
            const u = unitById(b.unitId)!;
            const left = SLA_MS - (now - new Date(b.createdAt).getTime());
            const over = left <= 0;
            const cost = allInCost(u, { ...DEFAULT_HOUSEHOLD, persons: b.tenant.persons });
            return (
              <article key={b.id} className={`${styles.ticket} ${over ? styles.over : ""}`}>
                <div className={styles.ticketHead}>
                  <div className={styles.ticketUnit}>
                    <VerifiedPhoto unit={u} sizes="56px" stamp="none" className={styles.thumb} />
                    <div className={styles.ticketUnitText}>
                      <b className={styles.unitAddress}>{unitAddress(u)}</b>
                      <p className="muted small">
                        {zoneById(u.zoneId).short} · All-in {vnd(cost.total)}đ
                      </p>
                    </div>
                  </div>
                  <div className={styles.ticketSla}>
                    {over ? (
                      <span className="badge badge-coral">Quá SLA 3′</span>
                    ) : (
                      <div className={styles.timerPill} title="Thời gian còn lại để nhận ca">
                        <span className={styles.ring} style={{ ["--p" as string]: `${Math.max(0, left / SLA_MS) * 100}%` }} aria-hidden />
                        <div className={styles.timerText}>
                          <span className={`num ${styles.count}`}>{mmss(left)}</span>
                          <span className={styles.timerLabel}>nhận ca</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.ticketBody}>
                  <dl className={styles.meta}>
                    <div>
                      <dt>Khách</dt>
                      <dd>
                        {b.tenant.name} · {b.tenant.persons} người
                      </dd>
                    </div>
                    <div>
                      <dt>Giờ hẹn</dt>
                      <dd>
                        {fmtTime(b.slot)} · {dayLabel(b.slot, now)}
                      </dd>
                    </div>
                  </dl>
                  {b.tenant.note && <p className={styles.note}>“{b.tenant.note}”</p>}
                  <p className={styles.otpStatus}>
                    <Check size={13} /> SĐT đã xác thực OTP Zalo · {fmtPhone(b.tenant.phone)}
                  </p>
                </div>

                <div className={styles.ticketActions}>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => {
                      setRejecting(b);
                      setReason(REJECT_REASONS[0]);
                    }}
                  >
                    <X size={16} /> Từ chối
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      hostAccept(b.id);
                      toast(`Đã nhận ca. Zalo xác nhận đã gửi cho ${b.tenant.name}`, "success");
                    }}
                  >
                    <Check size={17} /> Nhận ca
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab !== "new" && (
        <Section flush>
          <DataTable<Booking>
            columns={tab === "mine" ? mineColumns : historyColumns}
            rows={tab === "mine" ? active : history}
            rowHref={(b) => `/host/viewing/${b.id}`}
            empty={
              tab === "mine" ? (
                <div className={styles.empty}>
                  <b>Chưa có lịch nào đã nhận</b>
                  <p className="muted small">Nhận ca ở tab “Yêu cầu mới” để lịch xuất hiện ở đây.</p>
                </div>
              ) : (
                <div className={styles.empty}>
                  <b>Chưa có lịch sử</b>
                  <p className="muted small">Các ca đã xong hoặc huỷ sẽ nằm ở đây.</p>
                </div>
              )
            }
          />
        </Section>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        variant="center"
        title="Từ chối ticket"
        description="Khách sẽ nhận Zalo xin lỗi kèm gợi ý đổi giờ; ticket chuyển sang Open Pool."
        footer={
          <div className={styles.row2}>
            <button type="button" className="btn btn-quiet" onClick={() => setRejecting(null)}>
              Giữ ticket
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!rejecting) return;
                hostReject(rejecting.id, reason);
                setRejecting(null);
                toast("Đã từ chối ticket và báo khách qua Zalo");
              }}
            >
              Từ chối
            </button>
          </div>
        }
      >
        <div className={styles.reasons}>
          {REJECT_REASONS.map((r) => (
            <label key={r} className="check">
              <input type="radio" name="reject" checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
