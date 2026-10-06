"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
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
