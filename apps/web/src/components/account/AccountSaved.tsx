"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { UnitCard } from "@/components/unit/UnitCard";
import { tenantAllIn } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { unitById } from "@/lib/mock/units";
import styles from "./AccountSaved.module.css";

export function AccountSaved() {
  const state = useMock();
  if (!state.ready) return <div className="skeleton" style={{ height: 320 }} />;

  const units = state.favorites.map((id) => unitById(id)).filter((u): u is NonNullable<typeof u> => Boolean(u));

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
            <UnitCard key={u.id} unit={u} cost={tenantAllIn(u)} />
          ))}
        </div>
      )}
    </div>
  );
}
