"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Users } from "lucide-react";
import styles from "@/components/admin/Contracts.module.css";

/** Chuyển nhanh giữa danh sách Field Host và chính sách biến phí. */
export function HostsSubnav() {
  const pathname = usePathname();
  const isCommission = pathname.startsWith("/admin/commission");

  return (
    <nav className={styles.subnav} aria-label="Field Host">
      <Link href="/admin/hosts" className={`${styles.subnavLink} ${!isCommission ? styles.subnavActive : ""}`}>
        <Users size={15} />
        <span>Danh sách Field Host</span>
      </Link>
      <Link href="/admin/commission" className={`${styles.subnavLink} ${isCommission ? styles.subnavActive : ""}`}>
        <SlidersHorizontal size={15} />
        <span>Biến phí & thù lao</span>
      </Link>
    </nav>
  );
}
