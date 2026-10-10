"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/apiClient";
import { AlarmClock, Check, ChevronRight, MessageSquareText, X } from "lucide-react";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { UnitPhoto } from "@/components/landlord/UnitPhoto";
import { requestPhoneVerify } from "./PhoneVerifyGate";
import { STATUS_META } from "@/components/booking/status";
import { useSession } from "@/lib/auth/client";
import { hostApi, refreshHost, useHostBoard, viewingKey } from "@/lib/host/api";
import { primeApiData } from "@/lib/query/useApiQuery";
import type { HostViewingDetail } from "@/lib/host/types";
import { hostErrorText, isReminderWindow, nextAction, shouldAutoRemind, slaLeftMs, STALE_CODES } from "@/lib/host/logic";
import type { HostViewingSummary, TicketCard } from "@/lib/host/types";
import { dayLabel, fmtTime, vnd } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import styles from "./Host.module.css";

const SLA_MS = 180_000;
const REJECT_REASONS = ["Trùng lịch với ca khác", "Ngoài ca trực của tôi", "Đang xử lý sự cố khẩn cấp", "Lý do khác"];
const TIER_LABEL = { ZONE_POOL: "Open Pool phân khu", WIDE_POOL: "Mở cho mọi Sale" } as const;

/** Mã ca đã tự nhắc T-10 trong phiên trình duyệt này (mỗi ca đúng một lần). */
const reminded = new Set<string>();

type Tab = "new" | "mine" | "history";

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const unitLine = (u: TicketCard["unit"]) => `${u.building} · Tầng ${u.floor} · ${u.code.slice(-2)}`;

export function DispatchBoard() {
  const query = useHostBoard();
  const session = useSession();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>("new");
  const [rejecting, setRejecting] = useState<TicketCard | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const board = query.state.status === "ready" ? query.state.data : null;

  // Nhắc hẹn kép T-10m: tự gọi backend ĐÚNG MỘT LẦN cho mỗi ca trong phiên trình duyệt.
  const due = board && now ? board.schedule.filter((s) => shouldAutoRemind(s, now, reminded)).map((s) => s.ref) : [];
  const dueKey = due.join(",");
  useEffect(() => {
    if (!dueKey) return;
    for (const ref of dueKey.split(",")) {
      reminded.add(ref);
      void hostApi.remind(ref).then((res) => {
        if (res.ok) refreshHost(ref);
        // too_early / bad_status: bỏ qua, ca không còn ở trạng thái cần nhắc.
      });
    }
  }, [dueKey]);

  async function act(key: string, run: () => Promise<ApiResponse<unknown>>, okText: string) {
    setBusy(key);
    const res = await run();
    setBusy(null);
    if (res.code === "phone_not_verified") {
      requestPhoneVerify(() => void act(key, run, okText));
      return;
    }
    if (res.ok) {
      toast(okText, "success");
    } else {
      toast(hostErrorText(res));
    }
    // accept/claim trả luôn ca mới: ghi vào cache để mở ca là có ngay, không đợi gọi lại.
    const next = res.ok ? (res.data as Partial<HostViewingDetail> | undefined) : undefined;
    if (next?.ref) primeApiData(viewingKey(next.ref), next as HostViewingDetail);
    if (res.ok || STALE_CODES.has(res.code ?? "")) refreshHost();
  }

  if (query.state.status === "loading" || !now) {
    return (
      <div className={styles.page}>
        <div className="skeleton" style={{ height: 96 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }
  if (query.state.status === "error" || !board) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <b>Không tải được bảng lịch</b>
          <p className="muted small">{query.state.status === "error" ? query.state.message : ""}</p>
          <button type="button" className="btn btn-primary" onClick={query.reload}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const { requests, schedule, history, lobbyNow, kpis } = board;
  const firstName = (session.user?.fullName ?? "").trim().split(/\s+/).slice(-1)[0] || "bạn";
  const lobbyCase = lobbyNow ? schedule.find((s) => s.ref === lobbyNow) : undefined;

  const mineColumns: DataTableColumn<HostViewingSummary>[] = [
    {
      key: "slot",
      header: "Giờ hẹn",
      render: (b) => {
        const slotMs = Date.parse(b.slot);
        return (
          <div>
            <b className="tnum">{fmtTime(b.slot)}</b>
            <span className="muted xs" style={{ display: "block" }}>
              {dayLabel(b.slot, now)}
            </span>
            {isReminderWindow(b, now) && (
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
            {b.tenant.partySize} người
          </span>
        </div>
      ),
    },
    {
      key: "unit",
      header: "Căn hộ",
      render: (b) => (
        <div>
          <span>{unitLine(b.unit)}</span>
          <span className="muted xs" style={{ display: "block" }}>
            {b.unit.zone}
          </span>
        </div>
      ),
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
        const text = nextAction(b, now);
        if (b.status === "receiving" || b.status === "viewing") {
          return (
            <span className="small" style={{ color: "var(--kelp-700, #047857)", fontWeight: 600 }}>
              {b.receivingAt ? `${text} · từ ${fmtTime(b.receivingAt)}` : text}
            </span>
          );
        }
        return <span className="small">{text}</span>;
      },
    },
  ];

  const historyColumns: DataTableColumn<HostViewingSummary>[] = [
    ...mineColumns.slice(0, 4),
    {
      key: "viewLog",
      header: "Nhật ký dẫn",
      render: (b) => {
        if (b.receivingAt && b.viewEndedAt) {
          return <span className="small muted">Đã dẫn {fmtTime(b.receivingAt)}–{fmtTime(b.viewEndedAt)}</span>;
        }
        if (b.receivingAt) return <span className="small muted">Bắt đầu {fmtTime(b.receivingAt)}</span>;
        return <span className="small muted">{b.closedReason ?? "—"}</span>;
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Lịch & yêu cầu"
        description={`Chào ${firstName}, ca sáng 08:30–11:30 · ca chiều 14:30–17:30. Mỗi lịch cách nhau tối thiểu 45 phút.`}
      />

      {lobbyCase && (
        <Link href={`/host/viewing/${lobbyCase.ref}`} className={styles.alert}>
          <AlarmClock size={22} />
          <div>
            <b>{lobbyCase.tenant.name} đã có mặt tại sảnh</b>
            <span>Xuống đón ngay · sảnh toà {lobbyCase.unit.building}</span>
          </div>
          <ChevronRight size={20} />
        </Link>
      )}

      <div className={styles.kpis}>
        <StatTile
          label="Chờ nhận"
          value={String(kpis.pending)}
          delta={kpis.pending > 0 ? { text: "Cần nhận ca", tone: "bad" } : { text: "Đã xử lý hết", tone: "good" }}
        />
        <StatTile label="Lịch hôm nay" value={String(kpis.today)} delta={{ text: "Trong ca trực", tone: "flat" }} />
        <StatTile
          label="Nhận ca trung bình"
          value={kpis.avgAcceptSeconds == null ? "—" : `${Math.floor(kpis.avgAcceptSeconds / 60)}′${String(kpis.avgAcceptSeconds % 60).padStart(2, "0")}″`}
          delta={{ text: "SLA 3′00″", tone: kpis.avgAcceptSeconds == null || kpis.avgAcceptSeconds <= 180 ? "good" : "bad" }}
        />
        <StatTile
          label="Đánh giá"
          value={`${String(kpis.rating).replace(".", ",")}★`}
          delta={{ text: `${kpis.ratedCount} lượt đánh giá (30 ngày)`, tone: "good" }}
        />
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Danh sách">
        <button type="button" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>
          Yêu cầu mới {requests.length > 0 && <i>{requests.length}</i>}
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
          {requests.length === 0 && (
            <div className={styles.empty}>
              <MessageSquareText size={28} />
              <b>Chưa có yêu cầu mới</b>
              <p className="muted small">
                Khi khách đặt lịch trong phân khu của bạn, ticket hiện ở đây kèm đồng hồ 3 phút nhận việc. Bảng tự cập nhật mỗi 15 giây.
              </p>
            </div>
          )}
          {requests.map((t) => {
            const assigned = t.tier === "ASSIGNED";
            const left = assigned && t.slaEndsAt ? slaLeftMs(t.slaEndsAt, board.serverTime, now, board.receivedAt) : 0;
            const over = assigned && left <= 0;
            const rowBusy = busy === t.ticketId;
            return (
              <article
                key={t.ticketId}
                className={`${styles.ticket} ${over ? styles.over : ""}`}
                style={assigned ? undefined : { borderColor: "var(--coral-400, #fb923c)" }}
              >
                <div className={styles.ticketHead}>
                  <div className={styles.ticketUnit}>
                    <UnitPhoto url={t.unit.photo} alt={t.unit.code} sizes="56px" className={styles.thumb} />
                    <div className={styles.ticketUnitText}>
                      <b className={styles.unitAddress}>{unitLine(t.unit)}</b>
                      <p className="muted small">
                        {t.unit.zone} · {vnd(t.unit.rent)}đ/tháng
                      </p>
                    </div>
                  </div>
                  <div className={styles.ticketSla}>
                    {!assigned ? (
                      <span className="badge badge-coral">{TIER_LABEL[t.tier as keyof typeof TIER_LABEL]}</span>
                    ) : over ? (
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
                        {t.tenant.name} · {t.tenant.partySize} người
                      </dd>
                    </div>
                    <div>
                      <dt>Giờ hẹn</dt>
                      <dd>
                        {fmtTime(t.slot)} · {dayLabel(t.slot, now)}
                      </dd>
                    </div>
                  </dl>
                  {t.tenant.note && <p className={styles.note}>“{t.tenant.note}”</p>}
                  <p className={styles.otpStatus}>
                    <Check size={13} /> SĐT đã xác thực OTP Zalo · {t.tenant.phoneMasked} (hiện đủ sau khi nhận ca)
                  </p>
                </div>

                <div className={styles.ticketActions}>
                  {assigned ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        disabled={rowBusy}
                        onClick={() => {
                          setRejecting(t);
                          setReason(REJECT_REASONS[0]);
                        }}
                      >
                        <X size={16} /> Từ chối
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={rowBusy || !t.canAccept || over}
                        onClick={() => void act(t.ticketId, () => hostApi.accept(t.ticketId), `Đã nhận ca ${t.tenant.name}`)}
                      >
                        <Check size={17} /> Nhận ca
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ width: "100%" }}
                      disabled={rowBusy || !t.canClaim}
                      onClick={() => void act(t.ticketId, () => hostApi.claim(t.ticketId), `Đã nhận ticket ${t.tenant.name}`)}
                    >
                      <Check size={17} /> Nhận ticket
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab !== "new" && (
        <Section flush>
          <DataTable<HostViewingSummary>
            columns={tab === "mine" ? mineColumns : historyColumns}
            rows={tab === "mine" ? schedule : history}
            rowHref={(b) => `/host/viewing/${b.ref}`}
            empty={
              tab === "mine" ? (
                <div className={styles.empty}>
                  <b>Chưa có lịch nào đã nhận</b>
                  <p className="muted small">Nhận ca ở tab “Yêu cầu mới” để lịch xuất hiện ở đây.</p>
                </div>
              ) : (
                <div className={styles.empty}>
                  <b>Chưa có lịch sử</b>
                  <p className="muted small">Các ca đã xong sẽ nằm ở đây.</p>
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
        description="Ticket được giao cho Sale khác trong phân khu; nếu không còn ai, ticket mở cho Open Pool."
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
                const target = rejecting;
                setRejecting(null);
                void act(target.ticketId, () => hostApi.reject(target.ticketId, reason), "Đã từ chối ticket");
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
