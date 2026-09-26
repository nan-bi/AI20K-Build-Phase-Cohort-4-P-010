"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlarmClock, Check, ChevronRight, MessageSquareText, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { STATUS_META } from "@/components/booking/status";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { hostAccept, hostReject, sendReminder } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { dayLabel, fmtPhone, fmtTime, vnd } from "@/lib/mock/format";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { hostBookings, isOpenBooking } from "@/lib/mock/selectors";
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
      <div className={styles.stack}>
        <div className="skeleton" style={{ height: 96 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  const mineAll = hostBookings(state, HOST_ID);
  const pending = mineAll.filter((b) => b.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const active = mineAll.filter((b) => isOpenBooking(b) && b.status !== "pending" || ["holding", "signed"].includes(b.status)).sort((a, b) => a.slot.localeCompare(b.slot));
  const history = mineAll.filter((b) => ["leased", "completed", "no_show", "cancelled", "rejected"].includes(b.status)).sort((a, b) => b.slot.localeCompare(a.slot));
  const today = active.filter((b) => new Date(b.slot).toDateString() === new Date(now).toDateString());
  const lobbyNow = active.find((b) => b.status === "lobby");

  const list = tab === "mine" ? active : history;

  return (
    <div className={styles.stack}>
      <section className={styles.greet}>
        <h1>Chào {host.name.split(" ").slice(-1)[0]}, chúc ca trực thuận lợi</h1>
        <p className="muted small">Ca sáng 08:30–11:30 · ca chiều 14:00–18:00. Mỗi lịch cách nhau tối thiểu 45 phút.</p>
        <dl className={styles.kpis}>
          <div>
            <dt>Chờ nhận</dt>
            <dd className={`num ${pending.length ? styles.hot : ""}`}>{pending.length}</dd>
          </div>
          <div>
            <dt>Lịch hôm nay</dt>
            <dd className="num">{today.length}</dd>
          </div>
          <div>
            <dt>Nhận ca TB</dt>
            <dd className="num">{Math.floor(host.avgAcceptSec / 60)}′{String(host.avgAcceptSec % 60).padStart(2, "0")}″</dd>
          </div>
          <div>
            <dt>Đánh giá</dt>
            <dd className="num">{String(host.rating).replace(".", ",")}★</dd>
          </div>
        </dl>
      </section>

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

      <div className={styles.seg} role="tablist" aria-label="Danh sách">
        <button type="button" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>
          Yêu cầu mới {pending.length > 0 && <i>{pending.length}</i>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>
          Lịch của tôi
        </button>
        <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
          Lịch sử
        </button>
      </div>

      {tab === "new" && (
        <div className={styles.stack}>
          {pending.length === 0 && (
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
                <div className={styles.sla}>
                  {over ? (
                    <span className="badge badge-coral">Quá SLA · Open Pool 500m</span>
                  ) : (
                    <>
                      <span className={styles.ring} style={{ ["--p" as string]: `${Math.max(0, left / SLA_MS) * 100}%` }} aria-hidden />
                      <span className={`num ${styles.count}`}>{mmss(left)}</span>
                      <span className="muted xs">để nhận ca</span>
                    </>
                  )}
                </div>
                <div className={styles.ticketBody}>
                  <div className={styles.ticketUnit}>
                    <VerifiedPhoto unit={u} sizes="72px" stamp="none" className={styles.thumb} />
                    <div>
                      <b>{unitAddress(u)}</b>
                      <p className="muted small">
                        {zoneById(u.zoneId).short} · All-in {vnd(cost.total)}đ
                      </p>
                    </div>
                  </div>
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
                  <p className="muted xs">
                    <Check size={12} style={{ verticalAlign: "-1px" }} /> SĐT đã xác thực OTP Zalo · {fmtPhone(b.tenant.phone)}
                  </p>
                  <div className={styles.row2}>
                    <button type="button" className="btn btn-quiet" onClick={() => { setRejecting(b); setReason(REJECT_REASONS[0]); }}>
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab !== "new" && (
        <ul className={styles.stack}>
          {list.length === 0 && (
            <li className={styles.empty}>
              <b>{tab === "mine" ? "Chưa có lịch nào đã nhận" : "Chưa có lịch sử"}</b>
              <p className="muted small">{tab === "mine" ? "Nhận ca ở tab “Yêu cầu mới” để lịch xuất hiện ở đây." : "Các ca đã xong hoặc huỷ sẽ nằm ở đây."}</p>
            </li>
          )}
          {list.map((b) => {
            const u = unitById(b.unitId)!;
            const meta = STATUS_META[b.status];
            const slotMs = new Date(b.slot).getTime();
            const soon = b.status === "confirmed" && slotMs - now <= 10 * 60_000 && slotMs - now > -900_000;
            const cta: Record<string, string> = {
              confirmed: soon ? "Xuống sảnh đón khách" : "Xem chi tiết & chuẩn bị",
              lobby: "Đón khách ngay",
              receiving: "Tiếp tục: lên phòng",
              viewing: "Tiếp tục: kết quả xem",
              closing: "Tiếp tục: thu cọc",
              holding: "Xác minh CCCD & ký",
              signed: "Ký hợp đồng thuê",
            };
            return (
              <li key={b.id}>
                <Link href={`/host/viewing/${b.id}`} className={`${styles.item} ${b.status === "lobby" ? styles.pulse : ""}`}>
                  <div className={styles.time}>
                    <b className="num">{fmtTime(b.slot)}</b>
                    <span className="muted xs">{dayLabel(b.slot, now)}</span>
                  </div>
                  <div className={styles.itemMain}>
                    <b>{b.tenant.name}</b>
                    <p className="muted small">{unitAddress(u)}</p>
                    <div className={styles.itemFoot}>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                      {soon && (
                        <span className="badge badge-coral">
                          <AlarmClock size={12} /> T-10 · còn {Math.max(0, Math.ceil((slotMs - now) / 60_000))} phút
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemCta}>
                    {cta[b.status] && <span>{cta[b.status]}</span>}
                    <ChevronRight size={18} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        variant="sheet"
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
