"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHostMe } from "@/lib/host/api";
import styles from "./Host.module.css";

/** Đầu mọi trang cổng Host: nhắc Field Host chưa xác thực SĐT (trừ trang Tài khoản, nơi có sẵn thẻ xác thực). */
export function PhoneVerifyBanner() {
  const pathname = usePathname();
  const me = useHostMe();
  if (me.state.status !== "ready" || me.state.data.isPhoneVerified || pathname.startsWith("/host/account")) return null;
  return (
    <div className={styles.phoneBanner} role="status">
      <span>
        <b>Bạn chưa xác thực số điện thoại.</b> Cần số thật để nhận nhắc hẹn T-10 phút và thông báo ca xem.
      </span>
      <Link href="/host/account" className="btn btn-primary btn-sm">
        Xác thực ngay
      </Link>
    </div>
  );
}
