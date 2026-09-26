"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, ScanFace, ScanText, ShieldCheck, TriangleAlert } from "lucide-react";
import { saveKyc } from "@/lib/mock/actions";
import type { Booking, IdCardData } from "@/lib/mock/types";
import type { Unit } from "@/lib/mock/units";
import styles from "./Workflow.module.css";

type Slot = "front" | "back" | "face";
type Photos = Record<Slot, string | null>;
type Fields = Pick<IdCardData, "fullName" | "idNumber" | "dob" | "issuedDate" | "address">;

const SLOT_LABEL: Record<Slot, string> = { front: "Mặt trước CCCD", back: "Mặt sau CCCD", face: "Ảnh chân dung" };
const LOW = 0.85;

/** Ảnh mẫu để demo khi không có camera: mô phỏng CCCD gắn chip và ảnh chân dung. */
function sampleImage(slot: Slot, name: string): string {
  const svg =
    slot === "front"
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="#efe6d2"/><rect x="0" y="0" width="320" height="34" rx="14" fill="#c9502f" opacity=".9"/><text x="160" y="22" font-size="13" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle">CĂN CƯỚC CÔNG DÂN</text><rect x="16" y="52" width="82" height="106" rx="6" fill="#b9c7c4"/><circle cx="57" cy="88" r="20" fill="#8aa09c"/><rect x="30" y="112" width="54" height="34" rx="14" fill="#8aa09c"/><text x="112" y="70" font-size="9" font-family="sans-serif" fill="#555">Họ và tên / Full name</text><text x="112" y="86" font-size="13" font-family="sans-serif" font-weight="700" fill="#222">${name}</text><rect x="112" y="102" width="150" height="6" rx="3" fill="#cdbfa2"/><rect x="112" y="118" width="120" height="6" rx="3" fill="#cdbfa2"/><rect x="112" y="134" width="170" height="6" rx="3" fill="#cdbfa2"/></svg>`
      : slot === "back"
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="#e8dfca"/><rect x="18" y="20" width="44" height="34" rx="6" fill="#d7b64f"/><rect x="18" y="74" width="284" height="6" rx="3" fill="#c7b995"/><rect x="18" y="92" width="240" height="6" rx="3" fill="#c7b995"/><rect x="18" y="110" width="260" height="6" rx="3" fill="#c7b995"/><rect x="220" y="128" width="64" height="52" fill="#222"/><rect x="18" y="150" width="180" height="10" rx="3" fill="#8a7f66"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#cfe0e2"/><circle cx="120" cy="96" r="42" fill="#8aa9ad"/><path d="M36 240c0-52 38-84 84-84s84 32 84 84z" fill="#8aa9ad"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function mockOcr(b: Booking): { fields: Fields; confidence: IdCardData["confidence"]; face: number } {
  const digits = b.tenant.phone.replace(/\D/g, "").padEnd(9, "7").slice(-9);
  return {
    fields: {
      fullName: b.tenant.name.toUpperCase(),
      idNumber: `001${digits}`,
      dob: "12/04/2001",
      issuedDate: "18/08/2021",
      address: "Thôn Kiêu Kỵ, Xã Kiêu Kỵ, Huyện Gia Lâm, Thành phố Hà Nội",
    },
    confidence: { fullName: 0.99, idNumber: 0.98, issuedDate: 0.94, address: 0.78 },
    face: 0.96,
  };
}

function Capture({ slot, value, onChange, disabled, name }: { slot: Slot; value: string | null; onChange: (v: string | null) => void; disabled: boolean; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.capture}>
      <div className={`${styles.shot} ${slot === "face" ? styles.shotFace : ""}`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={SLOT_LABEL[slot]} />
        ) : (
          <span className="muted small">
            {slot === "face" ? <ScanFace size={24} /> : <Camera size={24} />}
            <br />
            {SLOT_LABEL[slot]}
          </span>
        )}
      </div>
      <div className={styles.captureBtns}>
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture={slot === "face" ? "user" : "environment"}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(URL.createObjectURL(f));
          }}
        />
        <button type="button" className="btn btn-quiet btn-sm" disabled={disabled} onClick={() => input.current?.click()}>
          <Camera size={15} /> Chụp
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange(sampleImage(slot, name))}>
          <ImagePlus size={15} /> Ảnh mẫu
        </button>
      </div>
    </div>
  );
}

export function KycStep({ booking }: { booking: Booking; unit: Unit }) {
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<Photos>({ front: null, back: null, face: null });
  const [phase, setPhase] = useState<"capture" | "scanning" | "review">("capture");
  const [ocr] = useState(() => mockOcr(booking));
  const [fields, setFields] = useState<Fields>(ocr.fields);
  const [touched, setTouched] = useState<Set<keyof Fields>>(new Set());
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => setPhase("review"), 1900);
    return () => clearTimeout(t);
  }, [phase]);

  const ready = consent && photos.front && photos.back && photos.face;
  const conf = ocr.confidence;
  const lowKeys = (Object.keys(conf) as (keyof typeof conf)[]).filter((k) => conf[k] < LOW && !touched.has(k));

  const edit = (k: keyof Fields, v: string) => {
    setFields({ ...fields, [k]: v });
    setTouched(new Set(touched).add(k));
  };

  const confirm = () =>
    saveKyc(booking.id, { ...fields, confidence: conf, manuallyEdited: touched.size > 0, faceMatch: ocr.face });

  return (
    <section className={`card ${styles.step}`}>
      <header className={styles.stepHead}>
        <span className={styles.stepIcon}>
          <ScanText size={22} />
        </span>
        <div>
          <h2>Xác minh CCCD (eKYC)</h2>
          <p className="muted small">Chụp một lần: AI đọc CCCD trong khoảng 5 giây, đối chiếu khuôn mặt và tự điền thỏa thuận.</p>
        </div>
      </header>

      {phase === "capture" && (
        <>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Khách đồng ý cho VinStay AI xử lý ảnh CCCD để lập thỏa thuận, mã hoá AES-256 theo Nghị định 13/2023/NĐ-CP và không chia sẻ cho bên thứ ba.</span>
          </label>
          <div className={styles.captures}>
            {(["front", "back", "face"] as Slot[]).map((s) => (
              <Capture key={s} slot={s} value={photos[s]} disabled={!consent} name={ocr.fields.fullName} onChange={(v) => setPhotos({ ...photos, [s]: v })} />
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!ready} onClick={() => setPhase("scanning")}>
            <ScanText size={19} /> Bóc tách bằng AI
          </button>
          {!consent && <p className="muted xs">Cần khách đồng ý xử lý dữ liệu trước khi chụp.</p>}
        </>
      )}

      {phase === "scanning" && (
        <div className={styles.scanning} role="status">
          <div className={styles.scanImg}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photos.front && <img src={photos.front} alt="Đang đọc mặt trước CCCD" />}
            <i />
          </div>
          <p>
            <b>AI đang đọc CCCD…</b>
            <br />
            <span className="muted small">Trích xuất họ tên, số CCCD, ngày cấp, nơi thường trú và đối chiếu khuôn mặt.</span>
          </p>
        </div>
      )}

      {phase === "review" && (
        <>
          <div className={styles.faceOk}>
            <ShieldCheck size={18} /> Khuôn mặt khớp ảnh trên CCCD: <b className="num">{Math.round(ocr.face * 100)}%</b>
          </div>

          <div className={styles.fields}>
            {(
              [
                ["fullName", "Họ và tên"],
                ["idNumber", "Số CCCD"],
                ["dob", "Ngày sinh"],
                ["issuedDate", "Ngày cấp"],
                ["address", "Nơi thường trú"],
              ] as [keyof Fields, string][]
            ).map(([k, label]) => {
              const c = (conf as Record<string, number>)[k];
              const low = c !== undefined && c < LOW && !touched.has(k);
              return (
                <label key={k} className="field">
                  <span className="label">
                    {label}
                    {c !== undefined && <em className={low ? styles.lowPill : styles.okPill}>{Math.round(c * 100)}%</em>}
                  </span>
                  <input className={`input ${low ? styles.lowInput : ""}`} value={fields[k]} onChange={(e) => edit(k, e.target.value)} aria-invalid={low} />
                  {low && <span className="field-error">Độ tin cậy thấp: đối chiếu thẻ gốc và sửa nếu cần.</span>}
                </label>
              );
            })}
          </div>

          {lowKeys.length > 0 && (
            <div className={styles.warn}>
              <TriangleAlert size={18} />
              <div>
                <b>Có trường độ tin cậy dưới 85%</b>
                <p className="small">Theo quy trình, Host và khách đối chiếu trực tiếp thẻ cứng trước khi ký OTP.</p>
                <label className="check">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
                  <span>Tôi đã đối chiếu các trường này với thẻ CCCD gốc</span>
                </label>
              </div>
            </div>
          )}

          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={lowKeys.length > 0 && !checked} onClick={confirm}>
            <ShieldCheck size={19} /> Xác nhận và lưu (mã hoá AES-256)
          </button>
        </>
      )}
    </section>
  );
}
