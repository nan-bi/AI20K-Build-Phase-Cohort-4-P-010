"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { queries } from "@/lib/landlord/queries";
import { useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import styles from "./Landlord.module.css";

/** Đầu mọi trang cổng Chủ nhà: nhắc xác thực SĐT (cần để ký ủy quyền ký gửi). Ẩn ở trang Tài khoản, nơi có sẵn thẻ xác thực. */
export function LandlordPhoneBanner() {
  const pathname = usePathname();
  const profile = useLandlordQuery(queries.profile);
  if (profile.state.status !== "ready" || profile.state.data.isPhoneVerified || pathname.startsWith("/landlord/account")) return null;
  return (
    <div className={styles.phoneBanner} role="status">
      <span>
        <b>Bạn chưa xác thực số điện thoại.</b> Cần xác thực để ký ủy quyền ký gửi căn hộ.
      </span>
      <Link href="/landlord/account" className="btn btn-primary btn-sm">
        Xác thực ngay
      </Link>
    </div>
  );
}
