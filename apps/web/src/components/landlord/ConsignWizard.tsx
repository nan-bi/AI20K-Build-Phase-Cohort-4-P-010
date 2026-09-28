"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { OtpSign } from "@/components/booking/OtpSign";
import { PageHeader } from "@/components/ui/PageHeader";
import { submitConsignment, signConsignment } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { allInCost } from "@/lib/mock/cost";
import { vnd } from "@/lib/mock/format";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import { ALL_ITEMS, FURNISHING_LABEL, ITEM_LABEL, LANDLORDS, LAYOUT_LABEL, ZONES, type Furnishing, type ItemKey, type LayoutKind } from "@/lib/mock/units";
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
  furnishing: Furnishing;
  items: ItemKey[];
  lock: "smart" | "physical";
  doorCode: string;
  auditByHost: boolean;
}

const blank: Form = { building: "S2.12", floor: "", door: "", layout: "1PN", areaM2: "", askRent: "", furnishing: "full", items: ["ac", "fridge", "kitchen", "bed"], lock: "smart", doorCode: "", auditByHost: true };

export function ConsignWizard({ draftId }: { draftId?: string }) {
  const state = useMock();
  const draft = draftId ? state.consignments.find((c) => c.id === draftId && c.landlordId === LID && c.status === "draft") : undefined;

  if (!state.ready) return <div className="skeleton" style={{ height: 360 }} />;
  // `key` dựng lại form khi dữ liệu draft tải xong.
  return <Wizard key={draft?.id ?? "new"} draft={draft} />;
}

function Wizard({ draft }: { draft?: Consignment }) {
  const [step, setStep] = useState(draft ? 2 : 0);
  const [f, setF] = useState<Form>(
    draft
      ? { building: draft.building, floor: String(draft.floor), door: draft.door, layout: draft.layout, areaM2: String(draft.areaM2), askRent: String(draft.askRent), furnishing: draft.furnishing, items: draft.items, lock: draft.lock, doorCode: "", auditByHost: draft.auditByHost }
      : blank,
  );
  const [err, setErr] = useState("");
  const [terms, setTerms] = useState(false);
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });

  const rent = Number(f.askRent) || 0;
  const area = Number(f.areaM2) || 0;
  const preview = rent && area ? allInCost({ rent, areaM2: area }) : null;

  const next1 = () => {
    if (!f.floor || !f.door || area < 20 || rent < 3_000_000) {
      setErr("Nhập đủ tầng, số căn, diện tích (từ 20 m²) và giá chào thuê (từ 3.000.000đ).");
      return;
    }
    setErr("");
    setStep(1);
  };
  const next2 = () => {
    if (f.lock === "smart" && f.doorCode.length < 4 && !draft) {
      setErr("Nhập mã khoá điện tử (tối thiểu 4 số). Mã được mã hoá AES-256 và chỉ hiện cho Host khi đứng trước cửa.");
      return;
    }
    setErr("");
    setStep(2);
  };

  const finish = () => {
    if (draft) {
      const res = signConsignment(draft.id);
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
          furnishing: f.furnishing,
          lock: f.lock,
          auditByHost: f.auditByHost,
          items: f.items,
        });
        setCreatedId(created.id);
      } catch (e) {
        setErr((e as Error).message);
        return;
      }
    }
    setDone(true);
  };

  if (done)
    return (
      <div className={`${styles.page} ${styles.wizard}`}>
        <PageHeader title="Ký gửi căn mới" />
        <section className={`card ${styles.success}`}>
          <span className={styles.successIcon}>
            <CheckCircle2 size={38} />
          </span>
          <h1>Đã gửi yêu cầu ký gửi</h1>
          <p className="muted">
            Bạn đã ký ủy quyền độc quyền cho căn {f.building} · Tầng {f.floor} · Căn {f.door}. Field Host phân khu sẽ kiểm tra thực tế trong 48 giờ (chi phí 0đ), sau đó Admin chốt nhận ký gửi. Theo dõi tiến trình tại hồ sơ.
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
                <input className="input" inputMode="numeric" value={f.floor} onChange={(e) => set("floor", e.target.value.replace(/\D/g, ""))} />
              </label>
              <label className="field">
                <span className="label">Số căn</span>
                <input className="input" inputMode="numeric" value={f.door} onChange={(e) => set("door", e.target.value.replace(/\D/g, "").slice(0, 3))} />
              </label>
              <label className="field">
                <span className="label">Diện tích thông thủy (m²)</span>
                <input className="input" inputMode="decimal" value={f.areaM2} onChange={(e) => set("areaM2", e.target.value.replace(/[^\d.]/g, ""))} />
              </label>
              <label className="field">
                <span className="label">Giá chào thuê mỗi tháng (đ)</span>
                <input className="input" inputMode="numeric" value={f.askRent} onChange={(e) => set("askRent", e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>
            {preview && (
              <p className="small muted">
                Khách sẽ thấy All-in Cost khoảng <b style={{ color: "var(--ink)" }}>{vnd(preview.total)}đ</b>/tháng (thuê + phí quản lý {vnd(preview.mgmt)} + xe + điện nước).
              </p>
            )}
            <div>
              <span className="label">Nội thất</span>
              <div className={styles.chips} style={{ marginTop: 8 }}>
                {(Object.keys(FURNISHING_LABEL) as Furnishing[]).map((k) => (
                  <button key={k} type="button" className={`${styles.chip} ${f.furnishing === k ? styles.chipOn : ""}`} aria-pressed={f.furnishing === k} onClick={() => set("furnishing", k)}>
                    {FURNISHING_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Đồ dùng có sẵn</span>
              <div className={styles.chips} style={{ marginTop: 8 }}>
                {ALL_ITEMS.map((k) => (
                  <button key={k} type="button" className={`${styles.chip} ${f.items.includes(k) ? styles.chipOn : ""}`} aria-pressed={f.items.includes(k)} onClick={() => set("items", f.items.includes(k) ? f.items.filter((x) => x !== k) : [...f.items, k])}>
                    {ITEM_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
            {err && <p className="field-error" role="alert">{err}</p>}
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
                <label className={`${styles.radio} ${f.lock === "smart" ? styles.radioOn : ""}`}>
                  <input type="radio" name="lock" checked={f.lock === "smart"} onChange={() => set("lock", "smart")} />
                  <span>
                    <b>Khoá điện tử (có mã số)</b>
                    <span className="muted small" style={{ display: "block" }}>Mã được mã hoá AES-256, chỉ hiện cho Host đúng lúc đứng trước cửa và tự ẩn sau 10 phút.</span>
                  </span>
                </label>
                <label className={`${styles.radio} ${f.lock === "physical" ? styles.radioOn : ""}`}>
                  <input type="radio" name="lock" checked={f.lock === "physical"} onChange={() => set("lock", "physical")} />
                  <span>
                    <b>Khoá cơ (chìa khoá)</b>
                    <span className="muted small" style={{ display: "block" }}>Gửi chìa tại quầy nhân sự phân khu. Không dùng hộp khoá treo cửa (vi phạm quy chế BQL).</span>
                  </span>
                </label>
              </div>
            </div>
            {f.lock === "smart" && (
              <label className="field">
                <span className="label">Mã mở khoá</span>
                <input className="input" type="password" inputMode="numeric" autoComplete="off" placeholder="Nhập 4–8 số" value={f.doorCode} onChange={(e) => set("doorCode", e.target.value.replace(/\D/g, "").slice(0, 8))} />
              </label>
            )}
            <div>
              <span className="label">Ảnh thẩm định</span>
              <label className="check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={f.auditByHost} onChange={(e) => set("auditByHost", e.target.checked)} />
                <span>Nhờ Field Host chụp ảnh niêm yết (thẩm định thực tế luôn do Host làm).</span>
              </label>
              {!f.auditByHost && <input className="input" type="file" accept="image/*" multiple style={{ marginTop: 10, paddingTop: 9 }} aria-label="Tải ảnh hiện trạng" />}
            </div>
            {err && <p className="field-error" role="alert">{err}</p>}
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
                  {f.building} · Tầng {f.floor} · Căn {f.door}
                </dd>
              </div>
              <div>
                <dt>Loại · diện tích</dt>
                <dd>
                  {LAYOUT_LABEL[f.layout]} · {area} m²
                </dd>
              </div>
              <div>
                <dt>Giá chào thuê</dt>
                <dd>{vnd(rent)}đ/tháng</dd>
              </div>
              <div>
                <dt>Khoá cửa</dt>
                <dd>{f.lock === "smart" ? "Khoá điện tử" : "Chìa cơ tại quầy phân khu"}</dd>
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
            <label className="check">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>Tôi đã đọc và đồng ý Hợp đồng ký gửi quản lý độc quyền.</span>
            </label>
            <OtpSign phone={PHONE} purpose="agreement" disabled={!terms} sendLabel={terms ? "Gửi mã OTP để ký ủy quyền" : "Đồng ý điều khoản để ký"} onVerified={finish} />
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
