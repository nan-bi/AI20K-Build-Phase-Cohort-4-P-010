"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { CONTRACT_KIND_META } from "@/components/contracts/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CONTRACT_TEMPLATES,
  TEMPLATE_GROUP_META,
  TEMPLATE_PARTY_META,
  TEMPLATE_STEPS,
  TEMPLATE_TYPE_META,
  contractsUsingTemplate,
  stepsForTemplate,
  type ContractTemplate,
  type StepActor,
  type TemplateGroup,
  type TemplateStep,
} from "@/lib/mock/contract-templates";
import { contractRows } from "@/lib/mock/contracts";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./Contracts.module.css";

const ACTOR_LABELS: Record<StepActor, string> = {
  tenant: "Khách thuê",
  landlord: "Chủ nhà",
  host: "Field Host",
  admin: "Quản trị",
  system: "Hệ thống",
};

export function AdminContractTemplates() {
  const state = useMock();
  const now = useNow(60_000);
  const allRows = useMemo(() => (now ? contractRows(state, now) : []), [state, now]);

  const [actorFilter, setActorFilter] = useState<StepActor | "all">("all");
  const [groupFilter, setGroupFilter] = useState<TemplateGroup | "all">("all");
  const [search, setSearch] = useState("");

  const filteredSteps = useMemo(() => {
    if (actorFilter === "all") return TEMPLATE_STEPS;
    return TEMPLATE_STEPS.filter((s) => s.actor === actorFilter);
  }, [actorFilter]);

  const filteredTemplates = useMemo(() => {
    let list = CONTRACT_TEMPLATES;
    if (groupFilter !== "all") {
      list = list.filter((t) => t.group === groupFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.refCode && t.refCode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [groupFilter, search]);

  const stepColumns: DataTableColumn<TemplateStep>[] = [
    {
      key: "id",
      header: "Bước",
      render: (s) => <span className={styles.docIdText}>{s.id}</span>,
    },
    {
      key: "actor",
      header: "Ai làm",
      render: (s) => ACTOR_LABELS[s.actor] ?? s.actor,
    },
    {
      key: "step",
      header: "Nội dung việc",
      render: (s) => (
        <div>
          <div>{s.step}</div>
          {s.route && <span className="muted small fontMono">{s.route}</span>}
        </div>
      ),
    },
    {
      key: "primary",
      header: "Mẫu ký",
      render: (s) =>
        s.primary ? (
          <Link href={`/admin/contracts/templates/${s.primary}`} className={styles.codeChip}>
            {s.primary}
          </Link>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: "attached",
      header: "Văn bản kèm",
      render: (s) =>
        s.attached.length > 0 ? (
          <div className={styles.chipList}>
            {s.attached.map((attId) => (
              <Link key={attId} href={`/admin/contracts/templates/${attId}`} className={styles.codeChip}>
                {attId}
              </Link>
            ))}
          </div>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: "produces",
      header: "Sinh / Đổi HĐ",
      render: (s) =>
        s.produces ? (
          <span className={styles.nowrap}>{CONTRACT_KIND_META[s.produces]?.short ?? s.produces}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: "implemented",
      header: "Demo",
      render: (s) => (
        <StatusBadge tone={s.implemented ? "ok" : "neutral"}>
          {s.implemented ? "Có luồng" : "Chưa có luồng"}
        </StatusBadge>
      ),
    },
  ];

  const templateColumns: DataTableColumn<ContractTemplate>[] = [
    {
      key: "id",
      header: "Mã mẫu",
      render: (t) => <span className={styles.docIdText}>{t.id}</span>,
    },
    {
      key: "title",
      header: "Tên văn bản",
      render: (t) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.title}</div>
          {t.refCode && <div className="muted small fontMono">{t.refCode}</div>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Loại",
      render: (t) => TEMPLATE_TYPE_META[t.type]?.label ?? t.type,
    },
    {
      key: "parties",
      header: "Các bên",
      render: (t) => (
        <span className="muted small">
          {t.parties.map((p) => TEMPLATE_PARTY_META[p]?.label ?? p).join(" · ")}
        </span>
      ),
    },
    {
      key: "steps",
      header: "Dùng ở bước",
      render: (t) => {
        const steps = stepsForTemplate(t.id);
        return steps.length > 0 ? steps.map((s) => s.id).join(", ") : <span className="muted">—</span>;
      },
    },
    {
      key: "usingContracts",
      header: "HĐ đang dùng",
      render: (t) => {
        const count = contractsUsingTemplate(allRows, t.id).length;
        return (
          <div className={styles.alignRight}>
            {count > 0 ? (
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{count}</span>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        );
      },
    },
  ];

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: CONTRACT_TEMPLATES.length };
    for (const t of CONTRACT_TEMPLATES) {
      counts[t.group] = (counts[t.group] ?? 0) + 1;
    }
    return counts;
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Mẫu hợp đồng"
        description="Biết bước nghiệp vụ nào ký mẫu nào và kèm những văn bản gì."
      />

      <ContractsSubnav />

      {/* Section 1: Bản đồ bước nghiệp vụ */}
      <Section
        title="Khi làm gì → gắn mẫu nào (18 bước)"
        description="Quy chuẩn gắn kết văn bản pháp lý vào từng bước vận hành thực tế"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {(["all", "tenant", "landlord", "host", "admin", "system"] as const).map((actor) => (
            <button
              key={actor}
              type="button"
              className={`${styles.chipBtn} ${actorFilter === actor ? styles.chipActive : ""}`}
              onClick={() => setActorFilter(actor)}
            >
              {actor === "all" ? "Tất cả vai" : ACTOR_LABELS[actor]}
            </button>
          ))}
        </div>

        <DataTable
          columns={stepColumns}
          rows={filteredSteps}
          empty="Không có bước nào phù hợp bộ lọc."
        />
      </Section>

      {/* Section 2: Danh mục 32 mẫu pháp lý */}
      <Section
        title="Danh mục mẫu (32 văn bản)"
        description="Toàn bộ 32 mẫu hợp đồng, phụ lục, chính sách và quy chế vận hành trong legal/"
      >
        <div className={styles.tabs} style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={`${styles.tabBtn} ${groupFilter === "all" ? styles.tabActive : ""}`}
            onClick={() => setGroupFilter("all")}
          >
            Tất cả <span className={styles.tabCount}>{groupCounts.all}</span>
          </button>
          {(["core", "tenant", "landlord", "host", "admin"] as const).map((grp) => (
            <button
              key={grp}
              type="button"
              className={`${styles.tabBtn} ${groupFilter === grp ? styles.tabActive : ""}`}
              onClick={() => setGroupFilter(grp)}
            >
              {TEMPLATE_GROUP_META[grp]?.label}{" "}
              <span className={styles.tabCount}>{groupCounts[grp] ?? 0}</span>
            </button>
          ))}
        </div>

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
                placeholder="Tìm mã mẫu (CORE-01), tên văn bản, số hiệu..."
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

        <DataTable
          columns={templateColumns}
          rows={filteredTemplates}
          rowHref={(t) => `/admin/contracts/templates/${t.id}`}
          empty="Không tìm thấy mẫu hợp đồng nào phù hợp."
        />
      </Section>
    </div>
  );
}
