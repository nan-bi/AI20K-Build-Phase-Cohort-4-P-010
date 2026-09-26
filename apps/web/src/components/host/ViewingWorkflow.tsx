"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Check, Phone } from "lucide-react";
import { STATUS_META } from "@/components/booking/status";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { toast } from "@/components/ui/Toast";
import { hostAccept } from "@/lib/mock/actions";
import { dayLabel, fmtPhone, fmtTime, normalizePhone } from "@/lib/mock/format";
import { bookingById } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Booking, Notice } from "@/lib/mock/types";
import { unitAddress, unitById, zoneById } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import { KycStep } from "./KycStep";
import { AgreementStep, LeaseStep } from "./SignSteps";
import { ClosedStep, DepositStep, DoneStep, GreetStep, LiftStep, ViewStep } from "./WorkflowSteps";
import styles from "./Workflow.module.css";

const RAIL = ["Đón khách", "Lên phòng", "Xem phòng", "Cọc VietQR", "eKYC CCCD", "Ký cọc", "Hợp đồng"] as const;

function railIndex(b: Booking): number {
  switch (b.status) {
    case "confirmed":
    case "lobby":
      return 0;
    case "receiving":
      return 1;
    case "viewing":
      return 2;
    case "closing":
      return 3;
    case "holding":
      return b.kyc ? 5 : 4;
    case "signed":
      return 6;
    case "leased":
      return 7;
    default:
      return -1;
  }
}

const AUDIENCE: Record<Notice["audience"], string> = { tenant: "Zalo → Khách", landlord: "Zalo → Chủ nhà", admin: "Admin", host: "Push → Bạn" };

export function ViewingWorkflow({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(1000);

  if (!state.ready || !now) return <div className="skeleton" style={{ height: 300 }} />;
  const booking = bookingById(state, id);
  if (!booking) {
    return (
      <div className={styles.stack}>
        <h1>Không tìm thấy lịch</h1>
        <Link href="/host/dispatch" className="btn btn-primary">
          Về danh sách lịch
        </Link>
      </div>
    );
  }

  const unit = unitById(booking.unitId)!;
  const meta = STATUS_META[booking.status];
  const idx = railIndex(booking);
  const props = { booking, unit, now };
  const log = state.notices.filter((n) => n.bookingId === booking.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <div className={styles.stack}>
      <Link href="/host/dispatch" className={`small ${styles.back}`}>
        <ArrowLeft size={16} /> Danh sách lịch
      </Link>

      <section className={`card ${styles.head}`}>
        <div className={styles.headTop}>
          <VerifiedPhoto unit={unit} sizes="88px" stamp="none" className={styles.headThumb} />
          <div className={styles.headInfo}>
            <span className={`badge ${meta.badge}`}>{meta.label}</span>
            <h1>{booking.tenant.name}</h1>
            <p className="muted small">
              {unitAddress(unit)} · {zoneById(unit.zoneId).short}
            </p>
            <p className="muted small">
              {fmtTime(booking.slot)} · {dayLabel(booking.slot, now)} · mã {booking.ref}
            </p>
          </div>
        </div>
        <div className={styles.headBtns}>
          <a className="btn btn-quiet btn-sm" href={`tel:${normalizePhone(booking.tenant.phone)}`}>
            <Phone size={15} /> {fmtPhone(booking.tenant.phone)}
          </a>
          <span className={`badge ${unit.lock === "smart" ? "badge-plain" : "badge-amber-soft"}`}>{unit.lock === "smart" ? "Khoá điện tử" : "Chìa cơ"}</span>
        </div>
      </section>

      {idx >= 0 && (
        <ol className={styles.rail} aria-label="Quy trình xem phòng">
          {RAIL.map((label, i) => (
            <li key={label} className={`${i < idx ? styles.railDone : ""} ${i === idx ? styles.railNow : ""}`} aria-current={i === idx ? "step" : undefined}>
              <span>{i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {booking.status === "pending" && (
        <section className={`card ${styles.step}`}>
          <h2>Bạn chưa nhận ca này</h2>
          <p className="muted">Nhận ca để gửi Zalo xác nhận cho khách và mở quy trình đón tiếp.</p>
          <button type="button" className="btn btn-success btn-lg btn-block" onClick={() => { hostAccept(booking.id); toast(`Đã nhận ca, Zalo gửi cho ${booking.tenant.name}`, "success"); }}>
            <Check size={19} /> Nhận ca
          </button>
        </section>
      )}
      {(booking.status === "confirmed" || booking.status === "lobby") && <GreetStep {...props} />}
      {booking.status === "receiving" && <LiftStep {...props} />}
      {booking.status === "viewing" && <ViewStep {...props} />}
      {booking.status === "closing" && booking.deposit && <DepositStep {...props} />}
      {booking.status === "holding" && !booking.kyc && <KycStep booking={booking} unit={unit} />}
      {booking.status === "holding" && booking.kyc && <AgreementStep booking={booking} unit={unit} />}
      {booking.status === "signed" && <LeaseStep {...props} />}
      {booking.status === "leased" && <DoneStep {...props} />}
      {["completed", "no_show", "cancelled", "rejected"].includes(booking.status) && <ClosedStep {...props} />}

      {log.length > 0 && (
        <section aria-label="Thông báo đã gửi">
          <h2 className={styles.logTitle}>
            <Bell size={16} /> Thông báo đã gửi cho lịch này
          </h2>
          <ul className={styles.log}>
            {log.map((n) => (
              <li key={n.id}>
                <span className={`badge badge-plain`}>{AUDIENCE[n.audience]}</span>
                <div>
                  <b>{n.title}</b>
                  <span className="xs muted"> · {fmtTime(n.at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
