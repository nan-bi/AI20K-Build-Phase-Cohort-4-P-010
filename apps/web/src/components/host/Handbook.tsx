"use client";

import { useState } from "react";
import { KeyRound, Search, Smartphone } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { vnd } from "@/lib/mock/format";
import { HOUSE_RULES } from "@/lib/mock/house-rules";
import { UNITS, ZONES, unitAddress, zoneById, type Unit } from "@/lib/mock/units";
import styles from "./Host.module.css";

const MY_ZONES = ["sapphire1", "sapphire2"] as const;

/** Sổ tay phân khu số: tra All-in, loại khoá và nội quy BQL chỉ với một chạm. */
export function Handbook() {
  const [q, setQ] = useState("");
  const units = UNITS.filter(
    (u) =>
      (MY_ZONES as readonly string[]).includes(u.zoneId) &&
      (q === "" || u.code.toLowerCase().includes(q.toLowerCase()) || u.building.toLowerCase().includes(q.toLowerCase()))
  );

  const unitColumns: DataTableColumn<Unit>[] = [
    {
      key: "address",
      header: "Căn hộ",
      render: (u) => <b>{unitAddress(u)}</b>,
    },
    {
      key: "zone",
      header: "Phân khu",
      render: (u) => <span>{zoneById(u.zoneId).short}</span>,
    },
    {
      key: "layout",
      header: "Layout",
      render: (u) => <span>{u.layoutLabel}</span>,
    },
    {
      key: "area",
      header: "Diện tích",
      render: (u) => <span>{u.areaM2} m²</span>,
    },
    {
      key: "direction",
      header: "Hướng",
      render: (u) => <span>{u.direction}</span>,
    },
    {
      key: "allin",
      header: "All-in/tháng",
      align: "right",
      render: (u) => <b className="num">{vnd(allInCost(u, DEFAULT_HOUSEHOLD).total)}đ</b>,
    },
    {
      key: "lock",
      header: "Loại khoá",
      render: (u) => (
        <span className={`badge ${u.lock === "smart" ? "badge-plain" : "badge-amber-soft"}`}>
          {u.lock === "smart" ? <Smartphone size={12} /> : <KeyRound size={12} />}{" "}
          {u.lock === "smart" ? "Khoá điện tử" : "Chìa cơ · quầy phân khu"}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Sổ tay phân khu"
        description={`Phân khu phụ trách: ${ZONES.filter((z) => (MY_ZONES as readonly string[]).includes(z.id)).map((z) => z.name).join(", ")}.`}
        actions={
          <label className={styles.search}>
            <Search size={17} />
            <span className="sr-only">Tra căn theo mã hoặc toà</span>
            <input
              className="input"
              placeholder="Tra căn: S2.12, VHOP-S1…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        }
      />

      <Section flush>
        <DataTable<Unit>
          columns={unitColumns}
          rows={units}
          empty={
            <div className={styles.empty}>
              <p className="muted">Không có căn nào khớp “{q}”.</p>
            </div>
          }
        />
      </Section>

      <Section title="Nội quy nhắc khách khi dẫn xem">
        <ul className={styles.rules}>
          {HOUSE_RULES.map((r) => (
            <li key={r.id}>
              <b>{r.title}.</b> {r.body}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
