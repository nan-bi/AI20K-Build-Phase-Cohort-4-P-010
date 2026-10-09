"use client";

import { CrumbLabel } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/apiClient";
import styles from "./Admin.module.css";

interface InventoryDetail {
  id: string;
  unitCode: string;
  building: string;
  zone: string;
  floorNumber: number;
  doorNumber: string | null;
  layout: string;
  carpetAreaM2: number;
  baseRentPrice: number;
  managementFee: number;
  marketAvgPrice: number;
  status: string;
  isVerified: boolean;
  doorLockType: string;
  /** Giờ khoá căn sau khi khách chuyển cọc (mức riêng nếu có, không thì mặc định). */
  holdHours: number;
  holdHoursOverride: number | null;
  defaultHoldHours: number;
  canEditHoldHours: boolean;
  landlord: { id: string; fullName: string | null; email: string | null } | null;
  media: { id: string; url: string; category: string; verifiedAt: string }[];
  mandate: {
    id: string;
    contractNumber: string;
    status: string;
    signedAt: string | null;
    exitRequestedAt: string | null;
    exitEffectiveAt: string | null;
    exitCountdownDays: number | null;
    canTerminate: boolean;
  } | null;
}

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

const HOLD_MIN = 12;
const HOLD_MAX = 72;

/** Thời gian khoá căn: từ lúc khách chuyển cọc 2.000.000đ đến lúc căn tự mở lại nếu chưa ký hợp đồng thuê. */
function HoldHoursSection({ unit, onSaved }: { unit: InventoryDetail; onSaved: (next: Partial<InventoryDetail>) => void }) {
  const [hours, setHours] = useState(String(unit.holdHours));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Number(hours);
  const valid = Number.isInteger(value) && value >= HOLD_MIN && value <= HOLD_MAX;
  const isDefault = unit.holdHoursOverride === null;

  async function save(next: number | null) {
    if (!reason.trim()) return toast("Nhập lý do thay đổi để lưu vết kiểm toán.");
    setBusy(true);
    const res = await api.post<{ holdHours: number; holdHoursOverride: number | null }>(
      `/admin/exclusive-inventory/${encodeURIComponent(unit.id)}/hold-hours`,
      { hours: next, reason: reason.trim() },
    );
    setBusy(false);
    if (!res.ok) return toast(res.message || "Không lưu được thời gian khoá căn.");
    toast(next === null ? `Đã đặt lại mặc định ${unit.defaultHoldHours} giờ.` : `Đã lưu: khoá căn ${next} giờ.`, "success");
    setReason("");
    setHours(String(res.data.holdHours));
    onSaved({ holdHours: res.data.holdHours, holdHoursOverride: res.data.holdHoursOverride });
  }

  return (
    <Section
      title="Thời gian khoá căn"
      description={`Khi khách chuyển cọc giữ chỗ, căn bị khoá trong khoảng này; hết hạn mà chưa ký hợp đồng thuê thì căn tự mở lại. Mặc định ${unit.defaultHoldHours} giờ, chỉnh được từ ${HOLD_MIN} đến ${HOLD_MAX} giờ.`}
    >
      <p style={{ marginBottom: 12 }}>
        Hiện tại: <b>{unit.holdHours} giờ</b>{" "}
        <span className="muted small">{isDefault ? "(mặc định)" : "(đã chỉnh riêng cho căn này)"}</span>
      </p>
      {unit.canEditHoldHours ? (
        <div style={{ display: "grid", gap: 10, maxWidth: 480 }}>
          <label className="field">
            <span className="label">Thời gian khoá (giờ)</span>
            <input className="input" type="number" min={HOLD_MIN} max={HOLD_MAX} step={1} value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: 140 }} />
          </label>
          <label className="field">
            <span className="label">Lý do thay đổi</span>
            <input className="input" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="VD: Căn đang hot, rút ngắn để quay vòng nhanh" />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !valid || value === unit.holdHours} onClick={() => void save(value)}>
              Lưu thời gian khoá
            </button>
            {!isDefault && (
              <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => void save(null)}>
                Đặt lại mặc định ({unit.defaultHoldHours} giờ)
              </button>
            )}
          </div>
          {!valid && <p className="small" style={{ color: "var(--danger)" }}>Nhập số giờ nguyên từ {HOLD_MIN} đến {HOLD_MAX}.</p>}
          <p className="muted xs">Chỉ áp dụng cho các cọc phát sinh sau khi lưu.</p>
        </div>
      ) : (
        <p className="muted small">Chỉ chỉnh được khi căn còn trống. Căn đang giữ chỗ hoặc đã cho thuê giữ nguyên mức đã áp dụng cho khách.</p>
      )}
    </Section>
  );
}

export function AdminInventoryDetail({ id }: { id: string }) {
  const [unit, setUnit] = useState<InventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api.get<InventoryDetail>(`/admin/exclusive-inventory/${encodeURIComponent(id)}`).then((response) => {
      if (!active) return;
      if (response.ok) setUnit(response.data);
      else setError(response.message || "Không tìm thấy hồ sơ căn hộ.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="skeleton" style={{ height: 420 }} />;
  if (error || !unit) return (
    <div className={styles.page}>
      <PageHeader title="Hồ sơ căn hộ" back={{ href: "/admin/inventory", label: "Rổ hàng" }} />
      <div className="card" role="alert"><b>Không tải được hồ sơ</b><p className="small muted">{error || "Không có hồ sơ trong dữ liệu hiện tại."}</p></div>
    </div>
  );

  const publicUrl = unit.isVerified && ["AVAILABLE", "HOLDING"].includes(unit.status) ? `/units/${encodeURIComponent(unit.unitCode)}` : null;

  return (
    <div className={styles.page}>
      <CrumbLabel label={unit.unitCode} />
      <PageHeader
        title={unit.unitCode}
        description={`${unit.building} · ${unit.zone} · tầng ${unit.floorNumber} · căn ${unit.doorNumber || "—"}`}
        back={{ href: "/admin/inventory", label: "Rổ hàng" }}
        actions={publicUrl ? <Link className="btn btn-quiet btn-sm" href={publicUrl}>Xem tin đang mở</Link> : undefined}
      />

      <div className={styles.reqs}>
        <Section title="Thông tin căn hộ">
          <dl className={styles.reqMeta}>
            <div><dt>Loại căn</dt><dd>{unit.layout}</dd></div>
            <div><dt>Diện tích</dt><dd>{unit.carpetAreaM2} m²</dd></div>
            <div><dt>Giá thuê</dt><dd>{money(unit.baseRentPrice)}đ/tháng</dd></div>
            <div><dt>Phí quản lý DB</dt><dd>{money(unit.managementFee)}đ/tháng</dd></div>
            <div><dt>Giá thị trường lưu DB</dt><dd>{money(unit.marketAvgPrice)}đ/tháng</dd></div>
            <div><dt>Khoá cửa</dt><dd>{unit.doorLockType === "ELECTRONIC_PIN" ? "Khoá điện tử" : "Chìa cơ"}</dd></div>
            <div><dt>Trạng thái căn</dt><dd>{unit.status}</dd></div>
            <div><dt>Niêm yết</dt><dd>{unit.isVerified ? "Đã xác minh" : "Chưa xác minh"}</dd></div>
          </dl>
        </Section>

        <HoldHoursSection key={`${unit.holdHours}-${unit.status}`} unit={unit} onSaved={(next) => setUnit({ ...unit, ...next })} />

        <Section title="Hồ sơ chủ nhà">
          {unit.landlord ? <dl className={styles.reqMeta}>
            <div><dt>Họ tên</dt><dd>{unit.landlord.fullName || "—"}</dd></div>
            <div><dt>Email</dt><dd>{unit.landlord.email || "—"}</dd></div>
            <div><dt>Mã hồ sơ</dt><dd className="small">{unit.landlord.id}</dd></div>
          </dl> : <p className="muted small">Chưa có thông tin chủ nhà trong DB.</p>}
        </Section>

        <Section title="Uỷ quyền độc quyền">
          {unit.mandate ? <dl className={styles.reqMeta}>
            <div><dt>Mã uỷ quyền</dt><dd>{unit.mandate.contractNumber}</dd></div>
            <div><dt>Trạng thái</dt><dd>{unit.mandate.status}</dd></div>
            <div><dt>Ký lúc</dt><dd>{dateTime(unit.mandate.signedAt)}</dd></div>
            <div><dt>Yêu cầu thoát</dt><dd>{dateTime(unit.mandate.exitRequestedAt)}</dd></div>
            <div><dt>Hiệu lực thoát</dt><dd>{dateTime(unit.mandate.exitEffectiveAt)}</dd></div>
            {unit.mandate.exitCountdownDays !== null && <div><dt>Đếm ngược</dt><dd>{unit.mandate.exitCountdownDays === 0 ? "Đủ thời hạn" : `${unit.mandate.exitCountdownDays} ngày`}</dd></div>}
          </dl> : <p className="muted small">Chưa có hồ sơ uỷ quyền gắn với căn này.</p>}
        </Section>

        <Section title={`Ảnh kiểm định (${unit.media.length})`}>
          {unit.media.length ? <div className={styles.photoGrid}>{unit.media.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="card">
              <img src={photo.url} alt={`${unit.unitCode} · ${photo.category}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8 }} />
              <span className="small">{photo.category} · xác minh {dateTime(photo.verifiedAt)}</span>
            </a>
          ))}</div> : <p className="muted small">DB chưa có ảnh cho căn này.</p>}
        </Section>
      </div>
    </div>
  );
}
