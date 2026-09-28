import Link from "next/link";
import { Facade } from "@/components/brand/Facade";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <Facade className={styles.facade} lit={0} label="Mặt tiền toà nhà, không có ô cửa nào sáng đèn" />
      <h1 className={styles.title}>Không tìm thấy trang này</h1>
      <p className="muted">Đường dẫn có thể đã đổi hoặc không tồn tại.</p>
      <Link href="/" className="btn btn-primary">
        Về trang chủ
      </Link>
    </div>
  );
}
