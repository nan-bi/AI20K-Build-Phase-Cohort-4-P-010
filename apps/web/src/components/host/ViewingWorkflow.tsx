"use client";

import Link from "next/link";
import { Check, Phone } from "lucide-react";
import { STATUS_META } from "@/components/booking/status";
import { UnitPhoto } from "@/components/landlord/UnitPhoto";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useHostViewing } from "@/lib/host/api";
import type { HostViewingDetail } from "@/lib/host/types";
import { dayLabel, fmtPhone, fmtTime, normalizePhone } from "@/lib/mock/format";
import { useNow } from "@/lib/useNow";
import { AwaitDepositStep, AwaitLeaseStep, ClosedStep, DoneStep, GreetStep, ViewStep } from "./WorkflowSteps";
import styles from "./Workflow.module.css";

const RAIL = ["Đón khách", "Xem phòng", "Chờ cọc", "Hợp đồng"] as const;

function railIndex(status: HostViewingDetail["status"]): number {
  switch (status) {
    case "confirmed":
    case "lobby":
      return 0;
    case "receiving":
    case "viewing":
      return 1;
    case "closing":
      return 2;
    case "holding":
      return 3;
    case "leased":
      return 4;
    default:
      return -1;
  }
}

const TIMELINE: [keyof HostViewingDetail["timeline"], string][] = [
  ["confirmedAt", "Nhận ca"],
  ["reminderSentAt", "Nhắc hẹn T-10"],
  ["lateRequestedAt", "Khách xin trễ"],
  ["lobbyCheckInAt", "Khách có mặt tại sảnh"],
  ["receivingAt", "Bắt đầu dẫn khách"],
  ["viewingStartedAt", "Mở cửa"],
  ["viewEndedAt", "Kết thúc buổi xem"],
  ["completedAt", "Đóng ca"],
];

export function ViewingWorkflow({ id }: { id: string }) {
  const query = useHostViewing(id);
  const now = useNow(1000);

  if (query.state.status === "loading" || !now) return <div className="skeleton" style={{ height: 300 }} />;
  if (query.state.status === "error") {
    const gone = query.state.httpStatus === 404;
    return (
      <div className={styles.page}>
        <PageHeader
          title={gone ? "Không tìm thấy lịch" : "Không tải được ca xem"}
          description={gone ? "Lịch không tồn tại hoặc không thuộc bạn." : query.state.message}
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

  const v = query.state.data;
  const meta = STATUS_META[v.status];
  const idx = railIndex(v.status);
  const props = { v, now };
  const events = TIMELINE.filter(([k]) => v.timeline[k]).sort((a, b) => Date.parse(v.timeline[b[0]]!) - Date.parse(v.timeline[a[0]]!));

  return (
    <div className={styles.page}>
      <PageHeader
        title={v.tenant.name}
        description={`${v.unit.building} · Tầng ${v.unit.floor} · ${v.unit.zone} · ${fmtTime(v.slot)} ${dayLabel(v.slot, now)} · mã ${v.ref}`}
        back={{ href: "/host/dispatch", label: "Lịch & yêu cầu" }}
        actions={
          <div className={styles.headActions}>
            <span className={`badge ${meta.badge}`}>{meta.label}</span>
            {v.tenant.phone && (
              <a className="btn btn-quiet btn-sm" href={`tel:${normalizePhone(v.tenant.phone)}`}>
                <Phone size={15} /> {fmtPhone(v.tenant.phone)}
              </a>
            )}
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
          {(v.status === "confirmed" || v.status === "lobby") && <GreetStep {...props} />}
          {(v.status === "receiving" || v.status === "viewing") && <ViewStep {...props} />}
          {v.status === "closing" && <AwaitDepositStep {...props} />}
          {v.status === "holding" && <AwaitLeaseStep {...props} />}
          {v.status === "leased" && <DoneStep {...props} />}
          {["completed", "no_show", "cancelled", "rejected"].includes(v.status) && <ClosedStep {...props} />}
        </div>

        <div className={styles.sideCol}>
          <Section title="Căn hộ">
            <UnitPhoto url={v.unit.photo} alt={v.unit.code} sizes="340px" className={styles.sidePhoto} />
            <KeyValue
              items={[
                { label: "Căn hộ", value: `${v.unit.building} · Tầng ${v.unit.floor} · ${v.unit.code.slice(-2)}` },
                { label: "Phân khu", value: v.unit.zone },
                { label: "Loại khoá", value: v.unit.lockType === "ELECTRONIC_PIN" ? "Khoá điện tử" : "Chìa cơ · quầy phân khu" },
                ...(v.tenant.note ? [{ label: "Ghi chú của khách", value: v.tenant.note }] : []),
              ]}
            />
          </Section>

          {events.length > 0 && (
            <Section title="Mốc thời gian" flush>
              <ul className={styles.log}>
                {events.map(([k, label]) => (
                  <li key={k}>
                    <span className="badge badge-plain">{fmtTime(v.timeline[k]!)}</span>
                    <div>
                      <b>{label}</b>
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
