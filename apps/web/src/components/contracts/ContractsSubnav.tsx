"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileSpreadsheet, Users } from "lucide-react";
import styles from "@/components/admin/Contracts.module.css";

export function ContractsSubnav() {
  const pathname = usePathname();

  const isTemplates = pathname.startsWith("/admin/contracts/templates");
  const isParties = pathname.startsWith("/admin/contracts/parties");
  const isRegistry = !isTemplates && !isParties;

  return (
    <nav className={styles.subnav} aria-label="Hợp đồng con">
      <Link
        href="/admin/contracts"
        className={`${styles.subnavLink} ${isRegistry ? styles.subnavActive : ""}`}
      >
        <FileSpreadsheet size={15} />
        <span>Sổ hợp đồng</span>
      </Link>
      <Link
        href="/admin/contracts/parties"
        className={`${styles.subnavLink} ${isParties ? styles.subnavActive : ""}`}
      >
        <Users size={15} />
        <span>Theo bên ký</span>
      </Link>
      <Link
        href="/admin/contracts/templates"
        className={`${styles.subnavLink} ${isTemplates ? styles.subnavActive : ""}`}
      >
        <BookOpen size={15} />
        <span>Mẫu hợp đồng</span>
      </Link>
    </nav>
  );
}
