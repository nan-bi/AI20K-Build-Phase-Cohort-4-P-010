import { Check, Clock, X } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ConsignStatusKey } from "./status";
import styles from "./Consign.module.css";

/** Chỉ các trường tiến trình cần để hiển thị hồ sơ ký gửi từ API. */
export interface TimelineSource {
  status: ConsignStatusKey;
  signedAt?: string;
  hostAcceptedAt?: string;
  decidedAt?: string;
  note?: string;
  inspectDueAt?: string;
  report?: { submittedAt?: string };
}

/** Quá hạn thẩm định 48h: chỉ khi đang chờ/đang thẩm định. */
function isInspectOverdue(c: Pick<TimelineSource, "status" | "inspectDueAt">, now: number): boolean {
  if (c.status !== "awaiting_host" && c.status !== "inspecting") return false;
  if (!c.inspectDueAt) return false;
  return now > new Date(c.inspectDueAt).getTime();
}

/** Trạng thái tương thích hồ sơ cũ — API hiện tại không phát trạng thái này. */
const ADMIN_MOCK_STATUS = "reviewing";

interface ConsignTimelineProps {
  c: TimelineSource;
  now: number;
}

export function ConsignTimeline({ c, now }: ConsignTimelineProps) {
  const overdue = isInspectOverdue(c, now);

  // 5 mốc (hồ sơ 16 + hồ sơ 18: bước chủ nhà đồng ý giá): không còn bước Admin duyệt. Hồ sơ cũ có thể mang trạng thái đã bỏ — coi như
  // "Thẩm định" đã xong, "Kết quả" đang chờ.
  const inspected = Boolean(c.report?.submittedAt) || c.status === ADMIN_MOCK_STATUS || c.status === "awaiting_landlord" || c.status === "approved" || c.status === "rejected";
  const decided = c.status === "approved" || c.status === "rejected";
  const steps = [
    {
      label: "Ký ủy quyền",
      time: c.signedAt ? fmtDateTime(c.signedAt) : undefined,
      isDone: Boolean(c.signedAt),
      isCurrent: c.status === "draft",
      isDanger: false,
    },
    {
      label: "Host nhận ca",
      time: c.hostAcceptedAt ? fmtDateTime(c.hostAcceptedAt) : undefined,
      isDone: Boolean(c.hostAcceptedAt),
      isCurrent: c.status === "awaiting_host",
      isDanger: false,
    },
    {
      label: "Thẩm định",
      time: c.report?.submittedAt ? fmtDateTime(c.report.submittedAt) : undefined,
      isDone: inspected,
      isCurrent: c.status === "inspecting",
      isDanger: false,
    },
    {
      label: "Chờ bạn đồng ý giá",
      time: undefined,
      isDone: c.status === "approved",
      isCurrent: c.status === "awaiting_landlord",
      isDanger: false,
    },
    {
      label: c.status === "rejected" ? "Không đạt" : c.status === "approved" ? "Đã niêm yết" : "Kết quả",
      time: c.decidedAt ? fmtDateTime(c.decidedAt) : undefined,
      isDone: decided,
      isCurrent: decided || c.status === ADMIN_MOCK_STATUS,
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
