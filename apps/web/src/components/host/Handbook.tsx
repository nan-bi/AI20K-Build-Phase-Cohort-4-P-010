"use client";

import { useMemo, useState } from "react";
import { KeyRound, Search, Smartphone } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { toUnit } from "@/lib/tenant/adapters";
import { useHostMe } from "@/lib/host/api";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/pricing/cost";
import { vnd } from "@/lib/format";
import { HOUSE_RULES } from "@/lib/legal/house-rules";
import { unitAddress, zoneById, type Unit } from "@/lib/units";
import styles from "./Host.module.css";

function assignedTo(building: string, zoneName: string, assignedZone: string): boolean {
  if (zoneName && assignedZone.toLowerCase().includes(zoneName.toLowerCase().replace(/^the\s+/, ""))) return true;
  const codes: string[] = assignedZone.match(/[A-Z]+\d+(?:\.\d+)?/g) ?? [];
  if (codes.includes(building)) return true;
  if (codes.length >= 2) {
    const first = codes[0]?.match(/^([A-Z]+\d+\.)(\d+)$/);
    const last = codes[1]?.match(/^([A-Z]+\d+\.)(\d+)$/);
    const current = building.match(/^([A-Z]+\d+\.)(\d+)$/);
    if (first && last && current && first[1] === last[1] && current[1] === first[1]) {
      const start = Number(first[2]);
      const end = Number(last[2]);
      const value = Number(current[2]);
      return value >= Math.min(start, end) && value <= Math.max(start, end);
    }
  }
  return false;
}

/** Sổ tay phân khu chỉ tra căn đang niêm yết thật và giới hạn theo khu vực tài khoản Host. */
export function Handbook() {
  const [search, setSearch] = useState("");
  const profile = useHostMe();
  const catalog = useApiQuery(tenantQueries.units());
  const units = useMemo(() => catalog.state.status === "ready" ? catalog.state.data.map(toUnit) : [], [catalog.state]);
  const assignedZone = profile.state.status === "ready" ? profile.state.data.assignedZone : "";
  const rows = useMemo(() => units.filter((unit) => {
    const zoneName = unit.zoneName || zoneById(unit.zoneId)?.name || "";
    const inZone = assignedTo(unit.building, zoneName, assignedZone);
    const matches = !search || unit.code.toLowerCase().includes(search.toLowerCase()) || unit.building.toLowerCase().includes(search.toLowerCase());
    return inZone && matches;
  }), [units, assignedZone, search]);

  const columns: DataTableColumn<Unit>[] = [
    { key: "address", header: "Căn hộ", render: (unit) => <b>{unitAddress(unit)}</b> },
    { key: "zone", header: "Phân khu", render: (unit) => unit.zoneName || zoneById(unit.zoneId)?.short || "Chưa cập nhật" },
    { key: "layout", header: "Layout", render: (unit) => unit.layoutLabel },
    { key: "area", header: "Diện tích", render: (unit) => `${unit.areaM2} m²` },
    { key: "direction", header: "Hướng", render: (unit) => unit.direction || "Chưa cập nhật" },
    { key: "allin", header: "All-in/tháng", align: "right", render: (unit) => <b className="num">{vnd(allInCost(unit, DEFAULT_HOUSEHOLD).total)}đ</b> },
    { key: "lock", header: "Loại khoá", render: (unit) => <span className={`badge ${unit.lock === "smart" ? "badge-plain" : "badge-amber-soft"}`}>{unit.lock === "smart" ? <Smartphone size={12} /> : <KeyRound size={12} />} {unit.lock === "smart" ? "Khoá điện tử" : "Chìa cơ"}</span> },
  ];

  const error = profile.state.status === "error" ? profile.state.message : catalog.state.status === "error" ? catalog.state.message : null;
  if (profile.state.status === "loading" || catalog.state.status === "loading") return <div className="skeleton" style={{ height: 380 }} />;

  return <div className={styles.page}>
    <PageHeader title="Sổ tay phân khu" description={error ? "Không tải được dữ liệu phân khu." : `Phân khu phụ trách: ${assignedZone}. Danh sách chỉ gồm căn đang niêm yết công khai.`} actions={<label className={styles.search}><Search size={17} /><span className="sr-only">Tra căn theo mã hoặc toà</span><input className="input" placeholder="Tra mã căn hoặc toà…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>} />
    {error ? <div role="alert" className="card"><p>{error}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => { profile.reload(); catalog.reload(); }}>Thử lại</button></div> : <Section flush><DataTable<Unit> columns={columns} rows={rows} empty={<div className={styles.empty}><p className="muted">Không có căn niêm yết trong phân khu của bạn khớp “{search}”.</p></div>} /></Section>}
    <Section title="Nội quy nhắc khách khi dẫn xem"><ul className={styles.rules}>{HOUSE_RULES.map((rule) => <li key={rule.id}><b>{rule.title}.</b> {rule.body}</li>)}</ul></Section>
  </div>;
}
