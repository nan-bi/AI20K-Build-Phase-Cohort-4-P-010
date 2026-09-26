import { vnd } from "@/lib/mock/format";
import styles from "./VietQR.module.css";

const SIZE = 29;

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function buildMatrix(seed: string): boolean[][] {
  const r = rng(seed);
  const m: boolean[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => r() > 0.52));
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const px = ox + x;
        const py = oy + y;
        if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
        const ring = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        m[py][px] = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (ring || core);
      }
  };
  finder(0, 0);
  finder(SIZE - 7, 0);
  finder(0, SIZE - 7);
  for (let i = 8; i < SIZE - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }
  return m;
}

interface VietQRProps {
  amount: number;
  content: string;
  qrRef: string;
  paid?: boolean;
}

/** Mã VietQR động (mô phỏng): số tiền cố định 2.000.000đ, nội dung COC [Mã căn] [SĐT]. */
export function VietQR({ amount, content, qrRef, paid }: VietQRProps) {
  const m = buildMatrix(qrRef + content);
  return (
    <div className={styles.card}>
      <div className={styles.qrWrap}>
        <svg viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} className={`${styles.qr} ${paid ? styles.faded : ""}`} role="img" aria-label="Mã VietQR cọc giữ chỗ (mô phỏng)">
          <rect x="-2" y="-2" width={SIZE + 4} height={SIZE + 4} fill="#fff" />
          {m.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="#0b2530" /> : null)))}
        </svg>
        {paid && <span className={styles.paid}>Đã nhận tiền</span>}
      </div>
      <dl className={styles.info}>
        <div>
          <dt>Số tiền</dt>
          <dd className={`num ${styles.amount}`}>{vnd(amount)}đ</dd>
        </div>
        <div>
          <dt>Nội dung chuyển khoản</dt>
          <dd className={styles.content}>{content}</dd>
        </div>
        <div>
          <dt>Người nhận</dt>
          <dd>Tài khoản định danh VinStay AI</dd>
        </div>
      </dl>
    </div>
  );
}
