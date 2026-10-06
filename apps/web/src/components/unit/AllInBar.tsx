import { vnd } from "@/lib/format";
import type { CostBreakdown } from "@/lib/pricing/cost";
import styles from "./AllInBar.module.css";

const PARTS = [
  { key: "rent", label: "Tiền thuê", cls: "rent" },
  { key: "mgmt", label: "Phí quản lý", cls: "mgmt" },
  { key: "parking", label: "Gửi xe", cls: "parking" },
  { key: "utility", label: "Điện nước", cls: "utility" },
] as const;

interface AllInBarProps {
  cost: CostBreakdown;
  /** "bar" = chỉ thanh; "legend" = thanh + chú giải bốn khoản. */
  variant?: "bar" | "legend" | "table";
}

/** Thanh All-in Cost: bốn khoản chi cố định mỗi tháng, mỗi khoản một mảng màu xanh hồ đậm dần. */
export function AllInBar({ cost, variant = "bar" }: AllInBarProps) {
  const parts = PARTS.map((p) => ({ ...p, value: cost[p.key] })).filter((p) => p.value > 0);
  return (
    <div className={styles.wrap}>
      <div
        className={styles.bar}
        role="img"
        aria-label={`Tổng ${vnd(cost.total)} đồng mỗi tháng: ${parts.map((p) => `${p.label} ${vnd(p.value)}`).join(", ")}`}
      >
        {parts.map((p) => (
          <span key={p.key} className={`${styles.seg} ${styles[p.cls]}`} style={{ flexGrow: p.value }} />
        ))}
      </div>
      {variant === "legend" && (
        <ul className={styles.legend}>
          {parts.map((p) => (
            <li key={p.key}>
              <i className={`${styles.dot} ${styles[p.cls]}`} />
              {p.label} <b className="tnum">{vnd(p.value)}</b>
            </li>
          ))}
        </ul>
      )}
      {variant === "table" && (
        <ul className={styles.table}>
          {parts.map((p) => (
            <li key={p.key}>
              <span>
                <i className={`${styles.dot} ${styles[p.cls]}`} />
                {p.label}
              </span>
              <b className="tnum">{vnd(p.value)}đ</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
