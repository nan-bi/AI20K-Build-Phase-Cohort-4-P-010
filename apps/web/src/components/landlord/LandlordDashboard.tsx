"use client";

import Link from "next/link";
import { ArrowRight, FileSignature, Home, ShieldCheck, Timer } from "lucide-react";
import { Columns } from "@/components/charts/Columns";
import { StatTile } from "@/components/charts/StatTile";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { DEMO_USERS } from "@/lib/mock/auth";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { fmtTime, relTime, vnd, vndShort } from "@/lib/mock/format";
import { activeLease, isOpenBooking, landlordUnits, monthlyRent, noticesFor, occupancy, unitStatus } from "@/lib/mock/selectors";
import { LANDLORD_HISTORY, SERVICE_FEE_RATE } from "@/lib/mock/stats";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import { LAYOUT_LABEL, unitAddress, zoneById, type UnitStatus } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;
const ST: Record<UnitStatus, { label: string; badge: string }> = {
  available: { label: "Đang mở đón khách", badge: "badge-kelp" },
  holding: { label: "Giữ chỗ 24h", badge: "badge-amber-soft" },
  rented: { label: "Đang cho thuê", badge: "badge-ink" },
};
const CS: Record<Consignment["status"], { label: string; badge: string }> = {
  draft: { label: "Chưa ký ủy quyền", badge: "badge-coral-soft" },
  pending: { label: "Chờ Admin duyệt", badge: "badge-amber-soft" },
  approved: { label: "Đã duyệt, chờ thẩm định ảnh", badge: "badge-kelp" },
  rejected: { label: "Chưa được duyệt", badge: "badge-coral-soft" },
};

const monthLabels = (now: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (n - 1 - i), 1);
    return `T${d.getMonth() + 1}`;
  });

export function LandlordDashboard() {
  const state = useMock();
  const now = useNow(60_000);
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 480 }} />;

  const units = landlordUnits(state, LID);
  const occ = occupancy(state, units);
  const rent = monthlyRent(state, LID);
  const mine = state.consignments.filter((c) => c.landlordId === LID);
  const todo = mine.filter((c) => c.status === "draft");
  const feed = noticesFor(state, "landlord", LID).slice(0, 8);
  const history = LANDLORD_HISTORY[LID];
  const series = [...history, rent].map((v, i, arr) => ({ label: monthLabels(now, arr.length)[i], value: Math.round(v * (1 - SERVICE_FEE_RATE)) }));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Xin chào, {DEMO_USERS.landlord.name.split(" ").slice(-1)[0]}</h1>
          <p className="muted">
            <ShieldCheck size={15} style={{ verticalAlign: "-2px", color: "var(--kelp)" }} /> Bạn ở nhà 100%: Field Host đón khách, mở cửa và báo bạn từng bước qua Zalo.
          </p>
        </div>
        <Link href="/landlord/consign" className="btn btn-primary">
          Ký gửi căn mới
        </Link>
      </header>

      {todo.length > 0 && (
        <ul className={styles.alerts}>
          {todo.map((c) => (
            <li key={c.id}>
              <FileSignature size={20} />
              <div>
                <b>
                  Căn {c.building} · Tầng {c.floor} · Căn {c.door} chưa ký ủy quyền
                </b>
                <p className="small muted">Ký ủy quyền độc quyền để Admin duyệt và Field Host lên lịch chụp ảnh thẩm định miễn phí.</p>
              </div>
              <Link href={`/landlord/consign?draft=${c.id}`} className="btn btn-amber btn-sm">
                Ký ngay <ArrowRight size={14} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.kpis}>
        <StatTile hero label="Thu tiền thuê tháng này" value={vndShort(Math.round(rent * (1 - SERVICE_FEE_RATE)))} delta={{ text: "sau phí dịch vụ ký gửi", tone: "flat" }} spark={series.slice(-6).map((s) => s.value)} />
        <StatTile label="Căn ký gửi" value={String(units.length)} delta={{ text: `${mine.filter((c) => c.status === "pending").length} yêu cầu chờ duyệt`, tone: "flat" }} />
        <StatTile label="Đang cho thuê" value={String(occ.rented)} unit={`/ ${units.length}`} delta={{ text: `${occ.holding} đang giữ chỗ 24h`, tone: "flat" }} />
        <StatTile label="Còn trống, đang mở khách" value={String(occ.available)} delta={{ text: "Host đón khách thay bạn", tone: "good", dir: "up" }} />
      </div>

      <div className={styles.two}>
        <Columns title="Tiền thuê thu về mỗi tháng" subtitle="Sau khi trừ phí dịch vụ ký gửi; tháng hiện tại được nhấn" data={series} axisFormat={(v) => (v === 0 ? "0" : `${v / 1_000_000}tr`)} valueFormat={(v) => `${vnd(v)}đ`} seriesName="Thu về" />
        <section className={`card ${styles.padCard}`}>
          <h2 className={styles.h2}>Thông báo tức thì</h2>
          <ul className={styles.feed}>
            {feed.map((n) => (
              <li key={n.id} className={n.tone ? styles[`t-${n.tone}`] : ""}>
                <div>
                  <b>{n.title}</b>
                  <p className="small muted">{n.body}</p>
                </div>
                <span className="xs muted">
                  {fmtTime(n.at)} · {relTime(n.at, now)}
                </span>
              </li>
            ))}
            {feed.length === 0 && <li className="muted small">Chưa có thông báo. Khi Host mở cửa hoặc khách cọc, Zalo báo bạn ở đây.</li>}
          </ul>
        </section>
      </div>

      <section aria-label="Danh sách căn">
        <h2 className={styles.h2}>Căn của bạn</h2>
        <div className={styles.units}>
          {units.map((u) => {
            const s = unitStatus(state, u);
            const m = state.mandates[u.id];
            const days = m?.exitEffectiveAt ? Math.max(0, Math.ceil((new Date(m.exitEffectiveAt).getTime() - now) / 86_400_000)) : 0;
            const lease = activeLease(state, u.id);
            const views = state.bookings.filter((b) => b.unitId === u.id && isOpenBooking(b)).length;
            return (
              <article key={u.id} className={`card ${styles.unit}`}>
                <VerifiedPhoto unit={u} sizes="120px" stamp="none" className={styles.unitPhoto} />
                <div className={styles.unitBody}>
                  <div className={styles.unitTop}>
                    <div>
                      <h3>{unitAddress(u)}</h3>
                      <p className="muted small">
                        {zoneById(u.zoneId).short} · {u.layoutLabel} · {u.areaM2} m²
                      </p>
                    </div>
                    <div className={styles.badges}>
                      <span className={`badge ${ST[s].badge}`}>{ST[s].label}</span>
                      {m?.status === "exiting" ? (
                        <span className="badge badge-coral-soft">
                          <Timer size={12} /> Đang thoát · còn {days} ngày
                        </span>
                      ) : (
                        <span className="badge badge-plain">
                          <ShieldCheck size={12} /> Đã ủy quyền độc quyền
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className={styles.unitMeta}>
                    <div>
                      <dt>Giá thuê</dt>
                      <dd>{vnd(lease?.lease?.rent ?? u.rent)}đ</dd>
                    </div>
                    <div>
                      <dt>All-in khách trả</dt>
                      <dd>{vnd(allInCost(u, DEFAULT_HOUSEHOLD).total)}đ</dd>
                    </div>
                    <div>
                      <dt>Lịch xem đang chờ</dt>
                      <dd>{views}</dd>
                    </div>
                  </dl>
                  <Link href={`/landlord/units/${u.id}`} className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }}>
                    Chi tiết và nhật ký <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {mine.length > 0 && (
        <section aria-label="Yêu cầu ký gửi">
          <h2 className={styles.h2}>Yêu cầu ký gửi của bạn</h2>
          <ul className={styles.reqList}>
            {mine.map((c) => (
              <li key={c.id} className={`card ${styles.req}`}>
                <Home size={20} />
                <div>
                  <b>
                    {c.building} · Tầng {c.floor} · Căn {c.door}
                  </b>
                  <p className="muted small">
                    {LAYOUT_LABEL[c.layout]} · {c.areaM2} m² · chào thuê {vnd(c.askRent)}đ
                  </p>
                  {c.note && <p className="small muted">Lý do: {c.note}</p>}
                </div>
                <span className={`badge ${CS[c.status].badge}`}>{CS[c.status].label}</span>
                {c.status === "draft" && (
                  <Link href={`/landlord/consign?draft=${c.id}`} className="btn btn-amber btn-sm">
                    Ký ủy quyền
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
