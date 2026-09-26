"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, ClipboardList, Footprints, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { Facade } from "@/components/brand/Facade";
import { Logo } from "@/components/brand/Logo";
import { DEMO_USERS, ROLE_LABEL, requiredRole, type Role } from "@/lib/mock/auth";
import { signInAs } from "@/lib/mock/useRole";
import styles from "./login.module.css";

const ROLES: { role: Role; icon: LucideIcon; does: string }[] = [
  { role: "tenant", icon: UserRound, does: "Chat với AI, xem chi tiết căn, đặt lịch và theo dõi lịch xem không giới hạn tin nhắn." },
  { role: "host", icon: Footprints, does: "Duyệt yêu cầu xem nhà, đón khách, mở cửa, thu cọc VietQR, xác minh CCCD và ký số." },
  { role: "landlord", icon: Building2, does: "Xem các căn đã ký gửi, tình trạng uỷ quyền, khoản thu và nhật ký mở cửa." },
  { role: "admin", icon: ClipboardList, does: "Theo dõi phễu, duyệt căn ký gửi, quản lý danh sách Host và cấu hình biến phí." },
];

export function LoginPicker({ preferred, next }: { preferred?: Role; next?: string }) {
  const router = useRouter();

  const enter = (role: Role) => {
    signInAs(role);
    const req = next ? requiredRole(next) : null;
    router.push(next && (!req || req === role) ? next : DEMO_USERS[role].home);
    router.refresh();
  };

  return (
    <main className={styles.page}>
      <aside className={styles.art} aria-hidden>
        <Logo inverse />
        <div className={styles.artBody}>
          <Facade lit={22} />
        </div>
        <p className={styles.artNote}>Mỗi ô cửa là một căn đã được xác minh. Ô sáng đèn là căn đang mở đón khách.</p>
      </aside>

      <section className={styles.panel}>
        <Link href="/" className={`${styles.back} small`}>
          <ArrowLeft size={16} /> Về trang chủ
        </Link>
        <h1 className={styles.title}>Đăng nhập demo</h1>
        <p className={`muted ${styles.lead}`}>
          Bản MVP dùng dữ liệu mô phỏng, chưa có tài khoản thật. Chọn một vai trò để đi qua từng màn hình — dữ liệu được chia sẻ giữa các vai trò trên cùng trình duyệt.
        </p>

        <ul className={styles.list}>
          {ROLES.map(({ role, icon: Icon, does }) => {
            const u = DEMO_USERS[role];
            return (
              <li key={role}>
                <button type="button" className={`${styles.role} ${preferred === role ? styles.preferred : ""}`} onClick={() => enter(role)}>
                  <span className={styles.roleIcon}>
                    <Icon size={22} />
                  </span>
                  <span className={styles.roleText}>
                    <strong>{ROLE_LABEL[role]}</strong>
                    <span className={styles.who}>
                      {u.name} — {u.subtitle}
                    </span>
                    <span className={`muted small ${styles.does}`}>{does}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={`muted small ${styles.foot}`}>
          <ShieldCheck size={15} /> Không có dữ liệu thật nào được gửi đi. Đặt lại dữ liệu bất cứ lúc nào từ nút “Demo” ở góc màn hình.
        </p>
      </section>
    </main>
  );
}
