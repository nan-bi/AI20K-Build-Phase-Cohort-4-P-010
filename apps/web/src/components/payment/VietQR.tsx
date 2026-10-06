import Image from "next/image";
import { vnd } from "@/lib/format";
import styles from "./VietQR.module.css";

interface VietQRProps {
  amount: number;
  content: string;
  qrUrl: string;
  accountNo: string;
  accountName: string;
  bankName?: string;
  paid?: boolean;
}

/** Hiển thị ảnh VietQR thật do endpoint VietQR tạo từ tài khoản nhận đã cấu hình ở backend. */
export function VietQR({ amount, content, qrUrl, accountNo, accountName, bankName, paid }: VietQRProps) {
  return (
    <div className={styles.card}>
      <div className={styles.qrWrap}>
        <Image
          src={qrUrl}
          width={256}
          height={256}
          unoptimized
          className={`${styles.qr} ${paid ? styles.faded : ""}`}
          alt={`VietQR thanh toán ${vnd(amount)} đồng`}
        />
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
          <dd>{accountName}</dd>
        </div>
        <div>
          <dt>{bankName || "Số tài khoản"}</dt>
          <dd>{accountNo}</dd>
        </div>
      </dl>
    </div>
  );
}
