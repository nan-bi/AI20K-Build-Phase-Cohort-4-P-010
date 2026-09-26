"use client";

import { useState } from "react";
import { KeyRound, Search, Smartphone } from "lucide-react";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { vnd } from "@/lib/mock/format";
import { UNITS, ZONES, unitAddress, zoneById } from "@/lib/mock/units";
import styles from "./Host.module.css";

const MY_ZONES = ["sapphire1", "sapphire2"] as const;
const RULES = [
  "Yên tĩnh sau 22:00. Ồn quá mức bị BQL phạt và trừ vào Tiền cọc bảo đảm.",
  "Không đặt hộp khoá treo cửa hay dán mã QR ở sảnh (vi phạm quy chế BQL).",
  "Thú cưng theo quy định chủ nhà; chó lớn phải đăng ký với BQL.",
  "Khách vào ở phải đăng ký tạm trú với BQL toà.",
  "Không sửa chữa: chỉ giới thiệu danh bạ thợ ngoài, khách và thợ tự thoả thuận.",
];

/** Sổ tay phân khu số: tra All-in, loại khoá và nội quy BQL chỉ với một chạm. */
export function Handbook() {
  const [q, setQ] = useState("");
  const units = UNITS.filter((u) => (MY_ZONES as readonly string[]).includes(u.zoneId) && (q === "" || u.code.toLowerCase().includes(q.toLowerCase()) || u.building.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className={styles.stack}>
      <h1 className={styles.h1}>Sổ tay phân khu</h1>
      <label className={styles.search}>
        <Search size={17} />
        <span className="sr-only">Tra căn theo mã hoặc toà</span>
        <input className="input" placeholder="Tra căn: S2.12, VHOP-S1…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <ul className={styles.stack}>
        {units.map((u) => (
          <li key={u.id} className={`card ${styles.unitRow}`}>
            <div>
              <b>{unitAddress(u)}</b>
              <p className="muted small">
                {zoneById(u.zoneId).short} · {u.layoutLabel} · {u.areaM2} m² · {u.direction}
              </p>
              <p className="small">All-in {vnd(allInCost(u, DEFAULT_HOUSEHOLD).total)}đ/tháng</p>
            </div>
            <span className={`badge ${u.lock === "smart" ? "badge-plain" : "badge-amber-soft"}`}>
              {u.lock === "smart" ? <Smartphone size={12} /> : <KeyRound size={12} />} {u.lock === "smart" ? "Khoá điện tử" : "Chìa cơ · quầy phân khu"}
            </span>
          </li>
        ))}
        {units.length === 0 && <li className="muted">Không có căn nào khớp “{q}”.</li>}
      </ul>

      <section className={`card ${styles.block}`}>
        <h2>Nội quy BQL cần nhớ</h2>
        <ul className={styles.rules}>
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <p className="muted xs">Phân khu phụ trách: {ZONES.filter((z) => (MY_ZONES as readonly string[]).includes(z.id)).map((z) => z.name).join(", ")}.</p>
    </div>
  );
}
