"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { contractParties, type PartyRole, type PartySummary } from "@/lib/mock/contracts";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./Contracts.module.css";

interface Props {
  initialRole?: string;
}

export function AdminContractParties({ initialRole }: Props) {
  const state = useMock();
  const now = useNow(60_000);

  const [roleTab, setRoleTab] = useState<PartyRole>(() => {
    if (initialRole === "tenant" || initialRole === "host" || initialRole === "landlord") {
      return initialRole;
    }
    return "landlord";
  });
  const [search, setSearch] = useState("");

  const allParties = useMemo(() => (now ? contractParties(state, now) : []), [state, now]);

  const counts = useMemo(() => {
    const c = { landlord: 0, tenant: 0, host: 0 };
    for (const p of allParties) {
      c[p.role]++;
    }
    return c;
  }, [allParties]);

  const filteredParties = useMemo(() => {
    let list = allParties.filter((p) => p.role === roleTab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allParties, roleTab, search]);

  const columns: DataTableColumn<PartySummary>[] = [
    {
      key: "name",
      header: "Họ và tên",
      render: (p) => (
        <span className={styles.docIdText}>
          {p.name}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (p) => (
        <span className="muted fontMono small">
          {p.phoneMasked ?? "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Tổng HĐ",
      render: (p) => (
        <div className={styles.alignRight}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.total}</span>
        </div>
      ),
    },
    {
      key: "live",
      header: "Đang hiệu lực",
      render: (p) => (
        <div className={styles.alignRight}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.live}</span>
        </div>
      ),
    },
    {
      key: "needsAction",
      header: "Cần xử lý",
      render: (p) => (
        <div className={styles.alignRight}>
          {p.needsAction > 0 ? (
            <StatusBadge tone="danger">{p.needsAction}</StatusBadge>
          ) : (
            <span className="muted">0</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Theo bên ký"
        description="Xem mọi hợp đồng của từng chủ nhà, khách thuê và Field Host."
      />

      <ContractsSubnav />

      <Section>
        {/* Tabs theo 3 vai */}
        <div className={styles.tabs} style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={`${styles.tabBtn} ${roleTab === "landlord" ? styles.tabActive : ""}`}
            onClick={() => setRoleTab("landlord")}
          >
            Chủ nhà <span className={styles.tabCount}>{counts.landlord}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${roleTab === "tenant" ? styles.tabActive : ""}`}
            onClick={() => setRoleTab("tenant")}
          >
            Khách thuê <span className={styles.tabCount}>{counts.tenant}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${roleTab === "host" ? styles.tabActive : ""}`}
            onClick={() => setRoleTab("host")}
          >
            Field Host <span className={styles.tabCount}>{counts.host}</span>
          </button>
        </div>

        {/* Thanh tìm kiếm */}
        <div className={styles.tools} style={{ marginBottom: 14 }}>
          <div className={styles.search}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                }}
              />
              <input
                type="text"
                placeholder={`Tìm tên ${roleTab === "landlord" ? "chủ nhà" : roleTab === "tenant" ? "khách thuê" : "Field Host"}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "var(--radius-sm, 6px)",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  fontSize: 14,
                  color: "var(--ink)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bảng danh sách */}
        <DataTable
          columns={columns}
          rows={filteredParties}
          rowHref={(p) => `/admin/contracts/parties/${p.key}`}
          empty="Không tìm thấy bên ký kết nào phù hợp."
        />
      </Section>
    </div>
  );
}
