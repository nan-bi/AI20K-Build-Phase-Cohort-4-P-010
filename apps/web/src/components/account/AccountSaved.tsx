"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { UnitCard } from "@/components/unit/UnitCard";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { useFavorites } from "@/lib/tenant/favorites";
import styles from "./AccountSaved.module.css";

export function AccountSaved() {
  const { units, loading } = useFavorites();
  if (loading) return <div className="skeleton" style={{ height: 320 }} />;

  return (
    <div>
      <PageHeader title="Căn đã lưu" description="Những căn bạn đã bấm biểu tượng trái tim để lưu lại." />
      {units.length === 0 ? (
        <EmptyState
          title="Chưa lưu căn nào"
          description="Bấm biểu tượng trái tim ở một căn để lưu lại."
          action={
            <Link href="/units" className="btn btn-primary">
              Tìm căn
            </Link>
          }
          art
        />
      ) : (
        <div className={styles.grid}>
          {units.map((u) => (
            <UnitCard key={u.id} unit={u} cost={allInCost(u, DEFAULT_HOUSEHOLD)} />
          ))}
        </div>
      )}
    </div>
  );
}
