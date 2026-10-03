import { Check, Clock, X } from "lucide-react";
import type { Consignment } from "@/lib/mock/types";
import { fmtDateTime } from "@/lib/mock/format";
import { isInspectOverdue } from "@/lib/mock/selectors-inspection";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./Consign.module.css";

/** Chỉ các trường tiến trình cần — để cả hồ sơ mock (Admin/Host) lẫn hồ sơ từ API (Chủ nhà) đều dùng được. */
export type TimelineSource = Pick<Consignment, "status" | "signedAt" | "hostAcceptedAt" | "decidedAt" | "note" | "inspectDueAt"> & {
  report?: { submittedAt?: string };
};

interface ConsignTimelineProps {
  c: TimelineSource;
  now: number;
}

export function ConsignTimeline({ c, now }: ConsignTimelineProps) {
  const overdue = isInspectOverdue(c, now);

  const steps = [
    {
      label: "Ký ủy quyền",
      time: c.signedAt ? fmtDateTime(c.signedAt) : undefined,
      isDone: Boolean(c.signedAt),
      isCurrent: c.status === "draft",
      isDanger: false,
    },
    {
      label: "Host nhận",
      time: c.hostAcceptedAt ? fmtDateTime(c.hostAcceptedAt) : undefined,
      isDone: Boolean(c.hostAcceptedAt),
      isCurrent: c.status === "awaiting_host",
      isDanger: false,
    },
    {
      label: "Thẩm định",
      time: c.report?.submittedAt ? fmtDateTime(c.report.submittedAt) : undefined,
      isDone: Boolean(c.report?.submittedAt),
      isCurrent: c.status === "inspecting",
      isDanger: false,
    },
    {
      label: "Admin duyệt",
      time: c.decidedAt ? fmtDateTime(c.decidedAt) : undefined,
      isDone: c.status === "approved" || c.status === "rejected",
      isCurrent: c.status === "reviewing",
      isDanger: false,
    },
    {
      label: c.status === "rejected" ? "Không duyệt" : c.status === "approved" ? "Đã ký gửi" : "Kết quả",
      time: c.decidedAt ? fmtDateTime(c.decidedAt) : undefined,
      isDone: c.status === "approved" || c.status === "rejected",
      isCurrent: c.status === "approved" || c.status === "rejected",
      isDanger: c.status === "rejected",
      note: c.status === "rejected" ? c.note : undefined,
    },
  ];

  return (
    <div className={styles.timelineWrap}>
      <div className={styles.timelineHeader}>
        <h4 className={styles.timelineTitle}>Tiến trình tiếp nhận & thẩm định</h4>
        {overdue && <StatusBadge tone="warn">Quá hạn 48h</StatusBadge>}
      </div>

      <ol className={styles.timelineList}>
        {steps.map((st, idx) => {
          let stateClass = "";
          if (st.isDanger) {
            stateClass = styles.stepDanger;
          } else if (st.isDone) {
            stateClass = styles.stepDone;
          } else if (st.isCurrent) {
            stateClass = styles.stepCurrent;
          }

          return (
            <li
              key={idx}
              className={`${styles.step} ${stateClass}`}
              aria-current={st.isCurrent ? "step" : undefined}
            >
              <div className={styles.stepIcon}>
                {st.isDanger ? (
                  <X size={14} />
                ) : st.isDone ? (
                  <Check size={14} />
                ) : st.isCurrent ? (
                  <Clock size={14} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepLabel}>{st.label}</p>
                {st.time && <p className={styles.stepTime}>{st.time}</p>}
                {st.note && <p className={styles.stepNote}>{st.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
