import styles from "./auth.module.css";
import { BadgeCheck, CalendarCheck2, WalletCards } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TowerGrid } from "./TowerGrid";

/** Two-panel layout shared by /login and /admin/login. */
export function AuthShell({ brandFoot, children }: { brandFoot: string; children: React.ReactNode }) {
  return (
    <main className={styles.screen}>
      <section className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.brandHead}>
            <Logo inverse sub="Ocean Park 1 · Hà Nội" />
          </div>
          <div className={styles.brandIntro}>
            <p className={styles.brandEyebrow}>Tìm nhà dễ hiểu hơn</p>
            <h1 className={styles.brandTitle}>Một lựa chọn tốt bắt đầu từ <span>thông tin rõ ràng.</span></h1>
            <p className={styles.tagline}>Xem căn đang mở, so sánh tổng chi phí và theo dõi lịch xem trong cùng một tài khoản VinStay.</p>
          </div>
          <ul className={styles.brandPoints}>
            <li><BadgeCheck size={17} /> Danh mục căn hộ theo dữ liệu hệ thống</li>
            <li><WalletCards size={17} /> Chi phí tháng được trình bày rõ từng khoản</li>
            <li><CalendarCheck2 size={17} /> Lịch xem được quản lý theo khung giờ</li>
          </ul>
        </div>
        <div className={styles.brandIllustration} aria-hidden="true"><TowerGrid /></div>
        <p className={styles.brandFoot}>{brandFoot}</p>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>{children}</div>
        <p className={styles.formFoot}>Tài khoản VinStay dùng để lưu căn và theo dõi lịch xem của bạn.</p>
      </section>
    </main>
  );
}
