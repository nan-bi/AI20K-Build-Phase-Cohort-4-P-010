"use client";

import Link from "next/link";
import { Check, Phone, Radio } from "lucide-react";
import { STATUS_META } from "@/components/booking/status";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
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

const AUDIENCE: Record<Notice["audience"], string> = {
  tenant: "Zalo → Khách",
  landlord: "Zalo → Chủ nhà",
  admin: "Admin",
  host: "Push → Bạn",
};

export function ViewingWorkflow({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(1000);

  if (!state.ready || !now) return <div className="skeleton" style={{ height: 300 }} />;
  const booking = bookingById(state, id);
  if (!booking) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Không tìm thấy lịch"
          back={{ href: "/host/dispatch", label: "Lịch & yêu cầu" }}
          actions={
            <Link href="/host/dispatch" className="btn btn-primary">
              Về danh sách lịch
            </Link>
          }
        />
      </div>
    );
  }

  const unit = unitById(booking.unitId)!;
  const meta = STATUS_META[booking.status];
  const idx = railIndex(booking);
  const props = { booking, unit, now };
  const log = state.notices
    .filter((n) => n.bookingId === booking.id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <div className={styles.page}>
      <PageHeader
        title={booking.tenant.name}
        description={`${unitAddress(unit)} · ${zoneById(unit.zoneId).short} · ${fmtTime(booking.slot)} ${dayLabel(booking.slot, now)} · mã ${booking.ref}`}
        back={{ href: "/host/dispatch", label: "Lịch & yêu cầu" }}
        actions={
          <div className={styles.headActions}>
            <span className={`badge ${meta.badge}`}>{meta.label}</span>
            <a className="btn btn-quiet btn-sm" href={`tel:${normalizePhone(booking.tenant.phone)}`}>
              <Phone size={15} /> {fmtPhone(booking.tenant.phone)}
            </a>
          </div>
        }
      />

      {idx >= 0 && (
        <ol className={styles.rail} aria-label="Quy trình xem phòng">
          {RAIL.map((label, i) => (
            <li
              key={label}
              className={`${i < idx ? styles.railDone : ""} ${i === idx ? styles.railNow : ""}`}
              aria-current={i === idx ? "step" : undefined}
            >
              <span>{i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          {booking.status === "pending" && (
            <section className={`card ${styles.step}`}>
              <div className={styles.stepHead}>
                <div className={styles.stepIcon}>
                  <Radio size={22} />
                </div>
                <div>
                  <h2>Bạn chưa nhận ca này</h2>
                  <p className="muted">Nhận ca để gửi Zalo xác nhận cho khách và kích hoạt quy trình đón tiếp tại sảnh.</p>
                </div>
              </div>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-success btn-lg"
                  onClick={() => {
                    hostAccept(booking.id);
                    toast(`Đã nhận ca, Zalo gửi cho ${booking.tenant.name}`, "success");
                  }}
                >
                  <Check size={19} /> Nhận ca đón tiếp
                </button>
              </div>
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
        </div>

        <div className={styles.sideCol}>
          <Section title="Căn hộ">
            <VerifiedPhoto unit={unit} sizes="340px" stamp="none" className={styles.sidePhoto} />
            <KeyValue
              items={[
                { label: "Căn hộ", value: unitAddress(unit) },
                { label: "Phân khu", value: zoneById(unit.zoneId).name },
                {
                  label: "Loại khoá",
                  value: unit.lock === "smart" ? "Khoá điện tử" : "Chìa cơ · quầy phân khu",
                },
              ]}
            />
          </Section>

          {log.length > 0 && (
            <Section title="Thông báo đã gửi" flush>
              <ul className={styles.log}>
                {log.map((n) => (
                  <li key={n.id}>
                    <span className="badge badge-plain">{AUDIENCE[n.audience]}</span>
                    <div>
                      <b>{n.title}</b>
                      <span className="xs muted"> · {fmtTime(n.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
