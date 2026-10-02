"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";
import { OtpSign } from "@/components/booking/OtpSign";
import { PageHeader } from "@/components/ui/PageHeader";
import { submitConsignment, signConsignment } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/actors";
import { allInCost } from "@/lib/mock/cost";
import { vnd } from "@/lib/mock/format";
import { pickHostFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import {
  LANDLORDS,
  LAYOUT_LABEL,
  LEASE_TERM_LABEL,
  ZONES,
  hostById,
  zoneOfBuilding,
  type LayoutKind,
  type LeaseTermPref,
  type LockType,
} from "@/lib/mock/units";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;
const PHONE = LANDLORDS.find((l) => l.id === LID)!.phone;
const BUILDINGS = ZONES.flatMap((z) => z.buildings);
const LABELS = ["Thông tin căn", "Khoá cửa và ảnh", "Ký ủy quyền"];

interface Form {
  building: string;
  floor: string;
  door: string;
  layout: LayoutKind;
  areaM2: string;
  askRent: string;
  suggestedDeposit: string;
  leaseTerm: LeaseTermPref;
  furnished: boolean;
  locks: LockType[];
  doorCode: string;
  auditByHost: boolean;
}

const blank: Form = {
  building: "S2.12",
  floor: "",
  door: "",
  layout: "1PN",
  areaM2: "",
  askRent: "",
  suggestedDeposit: "",
  leaseTerm: "long",
  furnished: true,
  locks: ["smart"],
  doorCode: "",
  auditByHost: true,
};

export function ConsignWizard({ draftId }: { draftId?: string }) {
  const state = useMock();
  const draft = draftId
    ? state.consignments.find((c) => c.id === draftId && c.landlordId === LID && c.status === "draft")
    : undefined;

  if (!state.ready) return <div className="skeleton" style={{ height: 360 }} />;
  return <Wizard key={draft?.id ?? "new"} draft={draft} />;
}

function Wizard({ draft }: { draft?: Consignment }) {
  const state = useMock();
  const [step, setStep] = useState(draft ? 2 : 0);
  const [f, setF] = useState<Form>(
    draft
      ? {
          building: draft.building,
          floor: String(draft.floor),
          door: draft.door,
          layout: draft.layout,
          areaM2: String(draft.areaM2),
          askRent: String(draft.askRent),
          suggestedDeposit: String(draft.suggestedDeposit || draft.askRent),
          leaseTerm: draft.leaseTerm || "long",
          furnished: draft.furnished !== undefined ? draft.furnished : draft.furnishing !== "empty",
          locks: draft.locks?.length ? draft.locks : [draft.lock || "smart"],
          doorCode: "",
          auditByHost: draft.auditByHost,
        }
      : blank,
  );
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [warranted, setWarranted] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const rent = Number(f.askRent) || 0;
  const deposit = Number(f.suggestedDeposit) || 0;
  const area = Number(f.areaM2) || 0;
  const preview = rent && area ? allInCost({ rent, areaM2: area }) : null;

  const zone = zoneOfBuilding(f.building);
  const pickedHost = zone ? pickHostFor(state, zone.id, "inspector") : undefined;
  const inspector = hostById(pickedHost?.hostId ?? zone?.hostId ?? "H01");

  const handleRentChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    setF((prev) => {
      const nextRent = Number(raw) || 0;
      // Tự động điền Tiền cọc đề xuất bằng Giá thuê nếu ô cọc đang trống
      const nextDeposit = !prev.suggestedDeposit && nextRent >= 3_000_000 ? raw : prev.suggestedDeposit;
      return {
        ...prev,
        askRent: raw,
        suggestedDeposit: nextDeposit,
      };
    });
  };

  const handleLockToggle = (type: LockType) => {
    setF((prev) => {
      const exists = prev.locks.includes(type);
      if (exists) {
        return { ...prev, locks: prev.locks.filter((l) => l !== type) };
      }
      return { ...prev, locks: [...prev.locks, type] };
    });
  };

  const next1 = () => {
    const floorNum = Number(f.floor);
    if (!f.floor || floorNum < 1 || floorNum > 60) {
      setErr("Tầng phải từ 1 đến 60.");
      return;
    }
    if (!f.door || !f.door.trim()) {
      setErr("Vui lòng nhập số căn hộ.");
      return;
    }
    if (area < 20 || area > 300) {
      setErr("Diện tích tim tường phải từ 20 đến 300 m².");
      return;
    }
    if (rent < 3_000_000) {
      setErr("Giá thuê tối thiểu 3.000.000đ/tháng.");
      return;
    }
    const currentDeposit = deposit || rent;
    if (currentDeposit < 2_000_000 || currentDeposit > 3 * rent) {
      setErr("Tiền cọc đề xuất phải từ 2.000.000đ đến 3 lần giá thuê.");
      return;
    }

    setErr("");
    setStep(1);
  };

  const next2 = () => {
    if (f.locks.length === 0) {
      setErr("Chọn ít nhất một hình thức khoá cửa.");
      return;
    }
    if (f.locks.includes("smart") && f.doorCode.length < 4 && !draft) {
      setErr("Nhập mã khoá điện tử (tối thiểu 4 số). Mã được mã hoá AES-256 và chỉ hiện cho Host khi đứng trước cửa.");
      return;
    }
    setErr("");
    setStep(2);
  };

  const finish = () => {
    if (draft) {
      const res = signConsignment(draft.id, { ownershipWarranted: warranted });
      if (!res.ok) {
        setErr(res.reason);
        return;
      }
      setCreatedId(draft.id);
    } else {
      try {
        const created = submitConsignment({
          landlordId: LID,
          building: f.building,
          floor: Number(f.floor),
          door: f.door.padStart(2, "0"),
          layout: f.layout,
          areaM2: area,
          askRent: rent,
          suggestedDeposit: deposit || rent,
          leaseTerm: f.leaseTerm,
          furnished: f.furnished,
          locks: f.locks,
          auditByHost: f.auditByHost,
          doorCode: f.doorCode || undefined,
        });
        setCreatedId(created.id);
      } catch (e) {
        setErr((e as Error).message);
        return;
      }
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className={`${styles.page} ${styles.wizard}`}>
        <PageHeader title="Ký gửi căn mới" />
        <section className={`card ${styles.success}`}>
          <span className={styles.successIcon}>
            <CheckCircle2 size={38} />
          </span>
          <h1>Đã gửi yêu cầu ký gửi</h1>
          <p className="muted">
            Bạn đã ký ủy quyền độc quyền cho căn {f.building} · Tầng {f.floor} · Căn {f.door.padStart(2, "0")}. Chuyên viên thẩm định <b>{inspector?.name ?? "Field Host"}</b> sẽ liên hệ hỗ trợ bạn trong 48 giờ (chi phí 0đ), sau đó Admin chốt duyệt ký gửi. Theo dõi tiến trình tại hồ sơ.
          </p>
          <div style={{ display: "flex", gap: "var(--s-3)", justifyContent: "center", flexWrap: "wrap" }}>
            {createdId && (
              <Link href={`/landlord/consignments/${createdId}`} className="btn btn-primary">
                Xem tiến trình
              </Link>
            )}
            <Link href="/landlord/dashboard" className="btn btn-secondary">
              Về tổng quan
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.wizard}`}>
      <PageHeader
        title={draft ? "Ký ủy quyền cho căn đã đăng ký" : "Ký gửi căn mới"}
        description="Ký gửi độc quyền: VinStay AI lo khách, lịch xem và mở cửa. Chi phí thẩm định ảnh bằng 0."
      />

      <ol className={styles.steps} aria-label="Các bước">
        {LABELS.map((l, i) => (
          <li key={l} className={i <= step ? styles.on : ""} aria-current={i === step ? "step" : undefined}>
            <span />
            {l}
          </li>
        ))}
      </ol>

      <section className={`card ${styles.formCard}`}>
        {step === 0 && (
          <>
            <div className={styles.formGrid}>
              <label className="field">
                <span className="label">Toà</span>
                <select className="select" value={f.building} onChange={(e) => set("building", e.target.value)}>
                  {BUILDINGS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="label">Loại căn</span>
                <select className="select" value={f.layout} onChange={(e) => set("layout", e.target.value as LayoutKind)}>
                  {(Object.keys(LAYOUT_LABEL) as LayoutKind[]).map((l) => (
                    <option key={l} value={l}>
                      {LAYOUT_LABEL[l]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="label">Tầng</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="1–60"
                  value={f.floor}
                  onChange={(e) => set("floor", e.target.value.replace(/\D/g, ""))}
                />
              </label>

              <label className="field">
                <span className="label">Số căn</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Ví dụ: 08, 12..."
                  value={f.door}
                  onChange={(e) => set("door", e.target.value.replace(/\D/g, "").slice(0, 3))}
                />
              </label>

              <label className="field">
                <span className="label">Diện tích tim tường (m²)</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="20–300"
                  value={f.areaM2}
                  onChange={(e) => set("areaM2", e.target.value.replace(/[^\d.]/g, ""))}
                />
                <span className="muted xs" style={{ marginTop: 4 }}>
                  Diện tích tim tường theo sổ/HĐ mua bán. Field Host đo lại diện tích thông thuỷ khi thẩm định.
                </span>
              </label>

              <label className="field">
                <span className="label">Giá thuê (đ/tháng)</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Từ 3.000.000đ"
                  value={f.askRent ? Number(f.askRent).toLocaleString("vi-VN") : ""}
                  onChange={(e) => handleRentChange(e.target.value)}
                />
              </label>

              <label className="field">
                <span className="label">Tiền cọc đề xuất (đ)</span>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Thường bằng 1–2 tháng tiền thuê"
                  value={f.suggestedDeposit ? Number(f.suggestedDeposit).toLocaleString("vi-VN") : ""}
                  onChange={(e) => set("suggestedDeposit", e.target.value.replace(/\D/g, ""))}
                />
                <span className="muted xs" style={{ marginTop: 4 }}>
                  Thường bằng 1–2 tháng tiền thuê. Khoản cọc giữ chỗ 2.000.000đ của khách sẽ chuyển 100% vào khoản này, không trừ vào tiền thuê tháng đầu.
                </span>
              </label>

              <div className="field">
                <span className="label">Thời gian thuê mong muốn</span>
                <div className={styles.chips} style={{ marginTop: 6 }}>
                  {(
                    [
                      ["mid", "Trung hạn: 1–6 tháng"],
                      ["long", "Dài hạn: 12 tháng"],
                      ["fixed", "Cố định: 12 tháng"],
                    ] as [LeaseTermPref, string][]
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      className={`${styles.chip} ${f.leaseTerm === k ? styles.chipOn : ""}`}
                      aria-pressed={f.leaseTerm === k}
                      onClick={() => set("leaseTerm", k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {preview && (
              <p className="small muted" style={{ marginTop: 8 }}>
                Khách sẽ thấy All-in Cost khoảng <b style={{ color: "var(--ink)" }}>{vnd(preview.total)}đ</b>/tháng (ước tính) (thuê + phí quản lý {vnd(preview.mgmt)} + xe + điện nước).
              </p>
            )}

            <div style={{ marginTop: 12 }}>
              <span className="label">Nội thất</span>
              <div className={styles.chips} style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={`${styles.chip} ${f.furnished ? styles.chipOn : ""}`}
                  aria-pressed={f.furnished}
                  onClick={() => set("furnished", true)}
                >
                  Có nội thất
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${!f.furnished ? styles.chipOn : ""}`}
                  aria-pressed={!f.furnished}
                  onClick={() => set("furnished", false)}
                >
                  Không nội thất
                </button>
              </div>
            </div>

            {err && <p className="field-error" role="alert" style={{ marginTop: 10 }}>{err}</p>}
            <div className={styles.wizardNav} style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-primary" onClick={next1}>
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <span className="label">Hình thức khoá cửa</span>
              <div className={styles.radios} style={{ marginTop: 8 }}>
                <label className={`${styles.radio} ${f.locks.includes("smart") ? styles.radioOn : ""}`}>
                  <input
                    type="checkbox"
                    checked={f.locks.includes("smart")}
                    onChange={() => handleLockToggle("smart")}
                  />
                  <span>
                    <b>Khoá điện tử (có mã số)</b>
                    <span className="muted small" style={{ display: "block" }}>
                      Mã được mã hoá AES-256, chỉ hiện cho Host đúng lúc đứng trước cửa và tự ẩn sau 10 phút.
                    </span>
                  </span>
                </label>

                <label className={`${styles.radio} ${f.locks.includes("physical") ? styles.radioOn : ""}`}>
                  <input
                    type="checkbox"
                    checked={f.locks.includes("physical")}
                    onChange={() => handleLockToggle("physical")}
                  />
                  <span>
                    <b>Khoá cơ (chìa khoá)</b>
                    <span className="muted small" style={{ display: "block" }}>
                      Gửi chìa tại quầy nhân sự phân khu. Không dùng hộp khoá treo cửa (vi phạm quy chế BQL).
                    </span>
                  </span>
                </label>
              </div>

              {f.locks.includes("smart") && f.locks.includes("physical") && (
                <p className="small muted" style={{ marginTop: 8 }}>
                  💡 Host dùng mã số; chìa cơ tại quầy phân khu là phương án dự phòng.
                </p>
              )}
            </div>

            {f.locks.includes("smart") && (
              <label className="field" style={{ marginTop: 12 }}>
                <span className="label">Mã mở khoá</span>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Nhập 4–8 số"
                  value={f.doorCode}
                  onChange={(e) => set("doorCode", e.target.value.replace(/\D/g, "").slice(0, 8))}
                />
              </label>
            )}

            <div style={{ marginTop: 14 }}>
              <span className="label">Ảnh thẩm định</span>
              <label className="check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={f.auditByHost}
                  onChange={(e) => set("auditByHost", e.target.checked)}
                />
                <span>Nhờ Field Host chụp ảnh niêm yết (thẩm định thực tế luôn do Host làm).</span>
              </label>
              {!f.auditByHost && (
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ marginTop: 10, paddingTop: 9 }}
                  aria-label="Tải ảnh hiện trạng"
                />
              )}
            </div>

            {err && <p className="field-error" role="alert" style={{ marginTop: 10 }}>{err}</p>}
            <div className={styles.wizardNav}>
              <button type="button" className="btn btn-quiet" onClick={() => setStep(0)}>
                Quay lại
              </button>
              <button type="button" className="btn btn-primary" onClick={next2}>
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <dl className={styles.summary}>
              <div>
                <dt>Căn hộ</dt>
                <dd>
                  {f.building} · Tầng {f.floor} · Căn {f.door.padStart(2, "0")}
                </dd>
              </div>
              <div>
                <dt>Loại căn</dt>
                <dd>{LAYOUT_LABEL[f.layout]}</dd>
              </div>
              <div>
                <dt>Diện tích tim tường</dt>
                <dd>{area} m²</dd>
              </div>
              <div>
                <dt>Giá thuê</dt>
                <dd>{vnd(rent)}đ/tháng</dd>
              </div>
              <div>
                <dt>Tiền cọc đề xuất</dt>
                <dd>{vnd(deposit || rent)}đ</dd>
              </div>
              <div>
                <dt>Thời gian thuê mong muốn</dt>
                <dd>{LEASE_TERM_LABEL[f.leaseTerm]}</dd>
              </div>
              <div>
                <dt>Nội thất</dt>
                <dd>{f.furnished ? "Có nội thất" : "Không nội thất"}</dd>
              </div>
              <div>
                <dt>Khoá cửa</dt>
                <dd>
                  {f.locks.includes("smart") && f.locks.includes("physical")
                    ? "Khoá điện tử + chìa cơ"
                    : f.locks.includes("smart")
                      ? "Khoá điện tử"
                      : "Chìa cơ tại quầy phân khu"}
                </dd>
              </div>
            </dl>

            <ul className={styles.terms}>
              <li>
                <ShieldCheck size={16} /> Ủy quyền <b>độc quyền</b>: mọi giao dịch thuê trong thời hạn ủy quyền thực hiện qua VinStay AI.
              </li>
              <li>
                <ShieldCheck size={16} /> Thoát linh hoạt: báo trước tối thiểu <b>15 ngày</b> và căn đang trống.
              </li>
              <li>
                <ShieldCheck size={16} /> VinStay không nhận sửa chữa; chỉ giới thiệu thợ ngoài uy tín.
              </li>
            </ul>

            {/* Khối chuyên viên thẩm định liên hệ hỗ trợ */}
            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                margin: "14px 0",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <UserCheck size={22} style={{ color: "var(--lagoon)", flex: "none", marginTop: 2 }} />
              <div>
                <b style={{ color: "var(--ink-950)", fontSize: 14 }}>
                  Chuyên viên thẩm định sẽ liên hệ hỗ trợ bạn
                </b>
                <p className="small muted" style={{ margin: "4px 0 0", lineHeight: 1.5 }}>
                  Sau khi ký, <b>{inspector?.name ?? "Field Host phân khu"}</b> (Field Host phân khu {zone?.short ?? f.building}) sẽ gọi hẹn giờ, tới căn kiểm tra đồ đạc và hiện trạng theo bảng kê Điều 5 hợp đồng thuê trong 48 giờ. Chi phí 0đ, bạn không cần có mặt.
                </p>
              </div>
            </div>

            <div className="card" style={{ background: "var(--surface-2)", padding: "14px 16px", margin: "14px 0" }}>
              <b style={{ color: "var(--ink-950)", fontSize: 14 }}>Điểm chính của Hợp đồng ký gửi</b>
              <ul className="small muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                <li><b>Điều 2</b> · Bạn cam đoan là chủ sở hữu hợp pháp (hoặc người được uỷ quyền hợp pháp duy nhất); căn không tranh chấp, không bị kê biên; nếu đang thế chấp thì việc cho thuê không vi phạm nghĩa vụ thế chấp.</li>
                <li><b>Điều 3</b> · VinStay được uỷ quyền lại cho Field Host nội khu đón khách, dẫn xem, kiểm kê 10 hạng mục và chốt công tơ; VinStay chịu trách nhiệm về đội ngũ này.</li>
                <li><b>Điều 5</b> · Khách cọc 2.000.000đ, căn khoá giữ chỗ mặc định 48 giờ (Admin cấu hình 12–72 giờ); khi ký HĐ thuê cọc chuyển 100% vào cọc bảo đảm, không trừ tiền thuê tháng đầu.</li>
                <li><b>Điều 6</b> · Phí dịch vụ chỉ thu khi khách đã ký HĐ và thanh toán đủ kỳ đầu + cọc. Tự giao dịch ngoài nền tảng với khách VinStay đã giới thiệu trong thời hạn HĐ và 06 tháng sau: vẫn trả 100% phí + phạt 01 tháng tiền thuê.</li>
                <li><b>Điều 8</b> · Thời hạn 12 tháng, tự gia hạn từng kỳ 12 tháng nếu không báo dừng trước 15 ngày. Dừng ký gửi bất kỳ lúc nào: báo trước 15 ngày và căn đang trống, không trong thời gian giữ chỗ.</li>
                <li><b>Điều 7</b> · VinStay không bảo lãnh tài chính thay khách ngoài quỹ cọc bảo đảm; miễn trừ lỗi kết cấu toà nhà và bất khả kháng.</li>
              </ul>
            </div>

            <label className="small" style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "10px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={warranted} onChange={(e) => { setWarranted(e.target.checked); setErr(""); }} style={{ marginTop: 3, flex: "none" }} />
              <span>Tôi cam đoan quyền sở hữu/uỷ quyền hợp pháp đối với căn hộ theo Điều 2.</span>
            </label>

            <div style={{ margin: "14px 0 6px" }}>
              {warranted ? (
                <OtpSign
                  phone={PHONE}
                  purpose="agreement"
                  sendLabel="Gửi mã OTP để ký ủy quyền"
                  onVerified={finish}
                />
              ) : (
                <button type="button" className="btn btn-primary btn-block" disabled>
                  Gửi mã OTP để ký ủy quyền
                </button>
              )}
              <p className="muted xs" style={{ textAlign: "center", marginTop: 8 }}>
                Nhập OTP nghĩa là bạn ký Hợp đồng ký gửi quản lý độc quyền 12 tháng (tự gia hạn), ký điện tử theo Luật Giao dịch điện tử 2023.
              </p>
            </div>

            {err && <p className="field-error" role="alert" style={{ marginTop: 12 }}>{err}</p>}
            {!draft && (
              <div className={styles.wizardNav}>
                <button type="button" className="btn btn-quiet" onClick={() => setStep(1)}>
                  Quay lại
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
