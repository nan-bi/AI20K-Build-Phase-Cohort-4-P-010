import styles from "./Facade.module.css";

interface TowerSpec {
  x: number;
  cols: number;
  rows: number;
}

const W = 11;
const H = 8;
const GX = 5;
const GY = 6.5;
const GROUND = 300;

const TOWERS: TowerSpec[] = [
  { x: 18, cols: 5, rows: 15 },
  { x: 128, cols: 6, rows: 19 },
  { x: 258, cols: 4, rows: 11 },
];

interface Win {
  key: string;
  x: number;
  y: number;
  /** Thứ tự bật đèn xác định (không dùng random để SSR/CSR khớp nhau). */
  rank: number;
}

function buildWindows(): Win[] {
  const out: Win[] = [];
  TOWERS.forEach((t, ti) => {
    for (let r = 0; r < t.rows; r++) {
      for (let c = 0; c < t.cols; c++) {
        const x = t.x + 10 + c * (W + GX);
        const y = GROUND - 14 - (r + 1) * (H + GY);
        const h = Math.abs(Math.sin((ti + 1) * 91 + c * 12.9898 + r * 78.233) * 43758.5453);
        out.push({ key: `${ti}-${c}-${r}`, x, y, rank: Math.floor((h % 1) * 1000) });
      }
    }
  });
  return out;
}

const WINDOWS = buildWindows();
/** Thứ tự bật đèn cố định: N ô đầu tiên là những ô sáng khi có N căn đang mở. */
const LIGHT_ORDER = [...WINDOWS].sort((a, b) => a.rank - b.rank).map((w) => w.key);

interface FacadeProps {
  /** Số ô cửa sáng đèn = số căn đang mở. */
  lit?: number;
  /** AI đang quét: mọi ô nhấp nháy lần lượt. */
  scanning?: boolean;
  className?: string;
  label?: string;
}

/** Mặt tiền toà nhà: mỗi ô cửa là một căn; ô sáng hổ phách là căn còn trống và đã được xác minh. */
export function Facade({ lit = 17, scanning = false, className, label = "Mặt tiền các toà nhà tại Ocean Park, một số ô cửa sáng đèn" }: FacadeProps) {
  const litKeys = new Set(LIGHT_ORDER.slice(0, lit));
  return (
    <svg className={`${styles.svg} ${scanning ? styles.scanning : ""} ${className ?? ""}`} viewBox="0 0 340 360" role="img" aria-label={label}>
      {TOWERS.map((t, i) => {
        const height = 14 + t.rows * (H + GY) + 10;
        return <rect key={i} x={t.x} y={GROUND - height} width={t.cols * (W + GX) + 15} height={height} rx="7" className={styles.tower} />;
      })}
      {WINDOWS.map((w, i) => {
        const on = litKeys.has(w.key);
        return (
          <rect
            key={w.key}
            x={w.x}
            y={w.y}
            width={W}
            height={H}
            rx="2"
            className={`${styles.win} ${on ? styles.lit : ""}`}
            style={{ animationDelay: `${(i % 23) * 70}ms` }}
          />
        );
      })}
      <rect x="0" y={GROUND} width="340" height="1.5" className={styles.ground} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={20 + i * 14} y={GROUND + 12 + i * 10} width={300 - i * 28} height="2" rx="1" className={styles.ripple} style={{ opacity: 0.32 - i * 0.055 }} />
      ))}
    </svg>
  );
}
