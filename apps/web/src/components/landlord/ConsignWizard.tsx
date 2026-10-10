"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Flame, ShieldCheck, UserCheck } from "lucide-react";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { allInCost } from "@/lib/pricing/cost";
import { vnd } from "@/lib/format";
import { errorText, landlordApi } from "@/lib/landlord/api";
import { getBenchmark, netIncome, rentVerdict } from "@/lib/landlord/benchmark";
import { LAYOUT_LABEL, LEASE_TERM_LABEL } from "@/lib/landlord/labels";
import type { BuildingOption, Consignment, InventoryCatalogEntry, LayoutKind, LeaseTermPref, LockKind } from "@/lib/landlord/types";
import { GROUPS, GROUP_LABEL } from "@/lib/inspection/logic";
import { queries, type QueryDef } from "@/lib/landlord/queries";
import { invalidateLandlordData, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { refreshApi } from "@/lib/query/useApiQuery";
import { ConsignOtpSign } from "./ConsignOtpSign";
import { PhotoPicker } from "./PhotoPicker";
import { QueryView } from "./QueryView";
import styles from "./Landlord.module.css";

/** Cọc bảo đảm: 0.5–4× giá thuê tháng (mặc định của Admin; backend kiểm lại bằng giá trị cấu hình khi tạo hồ sơ và khi ký). */
const DEPOSIT_MIN_RATIO = 0.5;
const DEPOSIT_MAX_RATIO = 4;
function depositRangeError(rent: number, deposit: number): string | null {
  const min = Math.round(DEPOSIT_MIN_RATIO * rent);
  const max = Math.round(DEPOSIT_MAX_RATIO * rent);
  if (deposit >= min && deposit <= max) return null;
  return `Tiền cọc phải từ 50% đến 4 lần giá thuê tháng (${min.toLocaleString("vi-VN")}đ – ${max.toLocaleString("vi-VN")}đ).`;
}

const LABELS = ["Thông tin căn & Định giá", "Khoá cửa & Tài sản", "Ký ủy quyền độc quyền"];

/**
 * 8 hạng mục hay gặp nhất trong bảng kê 32 món (Điều 5) hiện sẵn, tick sẵn. Chủ nhà bỏ tick món không có, bấm “+” để thêm món khác;
 * màn thẩm định của Host tick sẵn đúng các món này. Tên lấy từ catalog backend, bảng dưới chỉ là phương án dự phòng khi chưa tải được.
 */
const QUICK_ITEMS: { code: string; name: string }[] = [
  { code: "8", name: "Tủ lạnh" },
  { code: "6", name: "Bếp từ / Bếp hồng ngoại" },
  { code: "21", name: "Máy giặt / Máy sấy quần áo" },
  { code: "23", name: "Điều hòa không khí Phòng khách" },
  { code: "24", name: "Điều hòa không khí Phòng ngủ" },
  { code: "17", name: "Bình nước nóng lạnh" },
  { code: "13", name: "Giường ngủ & Táp đầu giường" },
  { code: "15", name: "Tủ quần áo" },
];
const DEFAULT_INVENTORY = QUICK_ITEMS.map((i) => i.code);

type PetPolicy = "no" | "small" | "allowed";
const PET_LABEL: Record<PetPolicy, string> = { no: "Không thú cưng", small: "Chó mèo nhỏ", allowed: "Nuôi thú cưng tự do" };
/** Mức phí tạm khi chưa tải được màn Khoản thu (khớp mặc định của backend). */
const FALLBACK_FEE_PERCENT = 5;

interface Form {
  building: string;
  floor: string;
  door: string;
  layout: LayoutKind;
  areaM2: string;
  askRent: string;
  suggestedDeposit: string;
  leaseTerm: LeaseTermPref;
  maxOccupants: number;
  petPolicy: PetPolicy;
  furnished: boolean;
  /** Mã hạng mục chủ khai có sẵn (catalog 32 món). */
  inventory: string[];
  locks: LockKind[];
  /** provide_now = nhập mã ở bước này; at_inspection = đưa mã cho Host khi thẩm định. */
  smartLockOption: "provide_now" | "at_inspection";
  doorCode: string;
}

const blank: Form = {
  building: "",
  floor: "",
  door: "",
  layout: "1PN",
  areaM2: "",
  askRent: "",
  suggestedDeposit: "",
  leaseTerm: "long",
  maxOccupants: 2,
  petPolicy: "no",
  furnished: true,
  inventory: DEFAULT_INVENTORY,
  locks: ["smart"],
  smartLockOption: "provide_now",
  doorCode: "",
};

/** Không có bản nháp (ký gửi mới) thì không gọi API: coi như `null`. */
const NO_DRAFT: QueryDef<Consignment | null> = { key: "consignment:none", fetch: () => Promise.resolve({ ok: true, status: 200, data: null }) };

/** Dữ liệu cần để dựng wizard: danh sách toà, trạng thái SĐT và (khi ký tiếp bản nháp) hồ sơ nháp. */
function useWizardData(draftId?: string) {
  const buildings = useLandlordQuery(queries.buildings);
  const profile = useLandlordQuery(queries.profile);
  const draft = useLandlordQuery<Consignment | null>(draftId ? queries.consignment(draftId) : NO_DRAFT);
  // Chỉ để lấy tỷ lệ phí dịch vụ Admin đặt; lỗi/chưa tải thì dùng mức tạm, không chặn form.
  const finance = useLandlordQuery(queries.finance);
  const catalog = useLandlordQuery(queries.inventoryCatalog);
  return { buildings, profile, draft, catalog: catalog.state.status === "ready" ? catalog.state.data : [], catalogStatus: catalog.state.status, feePercent: finance.state.status === "ready" ? finance.state.data.serviceFeePercent : FALLBACK_FEE_PERCENT };
}

export function ConsignWizard({ draftId }: { draftId?: string }) {
  const { buildings, profile, draft, feePercent, catalog, catalogStatus } = useWizardData(draftId);
  return (
    <QueryView query={buildings} skeleton="form">
      {(bs) => (
        <QueryView query={profile} skeleton="form">
          {(p) => (
            <QueryView query={draft} skeleton="form">
              {(d) => (
                <>
                  {d && d.status !== "draft" ? (
                    <div className={`${styles.page} ${styles.wizard}`}>
                      <PageHeader title="Ký gửi căn mới" />
                      <section className={`card ${styles.success}`}>
                        <h1>Hồ sơ này đã ký ủy quyền</h1>
                        <Link href={`/landlord/consignments/${d.id}`} className="btn btn-primary">
                          Xem tiến trình
                        </Link>
                      </section>
                    </div>
                  ) : (
                    <Wizard key={d?.id ?? "new"} buildings={bs} verifiedPhone={p.isPhoneVerified ? p.phone : null} feePercent={feePercent} catalog={catalog} catalogStatus={catalogStatus} draft={d ?? undefined} />
                  )}
                </>
              )}
            </QueryView>
          )}
        </QueryView>
      )}
    </QueryView>
  );
}


function Wizard({
  buildings,
  verifiedPhone,
  feePercent,
  catalog,
  catalogStatus,
  draft,
}: {
  buildings: BuildingOption[];
  verifiedPhone: string | null;
  feePercent: number;
  catalog: InventoryCatalogEntry[];
  catalogStatus: "loading" | "error" | "ready";
  draft?: Consignment;
}) {
  const [step, setStep] = useState(draft ? 2 : 0);
  const [f, setF] = useState<Form>(
    draft
      ? {
          building: draft.building,
          floor: String(draft.floor),
          door: draft.door ?? "",
          layout: draft.layoutKind,
          areaM2: String(draft.areaM2),
          askRent: String(draft.askRent),
          suggestedDeposit: String(draft.suggestedDeposit || draft.askRent),
          leaseTerm: draft.leaseTerm ?? "long",
          maxOccupants: 2,
          petPolicy: "no",
          furnished: draft.furnished ?? true,
          inventory: DEFAULT_INVENTORY,
          locks: draft.locks.length ? draft.locks : ["smart"],
          smartLockOption: "provide_now",
          doorCode: "",
        }
      : { ...blank, building: buildings[0]?.buildingCode ?? "" },
  );

  // Phân khu nội khu = nhóm các toà theo `zoneName` backend trả về.
  const zones = useMemo(() => {
    const map = new Map<string, BuildingOption[]>();
    for (const b of buildings) map.set(b.zoneName, [...(map.get(b.zoneName) ?? []), b]);
    return [...map.entries()].map(([name, list]) => ({ name, buildings: list }));
  }, [buildings]);
  const [zoneName, setZoneName] = useState<string>(
    () => buildings.find((b) => b.buildingCode === f.building)?.zoneName ?? zones[0]?.name ?? "",
  );
  const zoneBuildings = zones.find((z) => z.name === zoneName)?.buildings ?? [];

  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(draft?.id ?? null);
  const draftIdRef = useRef<string | null>(draft?.id ?? null);
  const [warranted, setWarranted] = useState(false);
  // Ảnh tham khảo: chọn ở bước 2, tải lên ngay sau khi tạo hồ sơ nháp (trước khi gửi OTP).
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(draft?.photoCount ?? 0);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((prev) => ({ ...prev, [k]: v }));

  // Món hiện thành thẻ: 8 món chọn sẵn + các món chủ thêm bằng “+”. Món nằm ngoài danh sách này chỉ có trong hộp “+”.
  const [extraCodes, setExtraCodes] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const nameOf = (code: string) => catalog.find((c) => c.code === code)?.name ?? QUICK_ITEMS.find((q) => q.code === code)?.name ?? `Hạng mục ${code}`;
  const shownCodes = [...DEFAULT_INVENTORY, ...extraCodes];
  const pickable = catalog.filter((c) => !shownCodes.includes(c.code));

  const rent = Number(f.askRent) || 0;
  const deposit = Number(f.suggestedDeposit) || 0;
  const area = Number(f.areaM2) || 0;
  const preview = rent && area ? allInCost({ rent, areaM2: area }) : null;
  const depositErr = rent >= 3_000_000 && deposit > 0 ? depositRangeError(rent, deposit) : null;
  const maxFloor = buildings.find((b) => b.buildingCode === f.building)?.totalFloors ?? 60;
  const unitCode = `VHOP-${f.building}-${f.floor}${f.door.padStart(2, "0")}`;

  // Định giá tham chiếu + huy hiệu "Căn hời phân khu" (rẻ hơn mặt bằng ≥ 10%).
  const bench = getBenchmark(zoneName, f.layout);
  const verdict = rentVerdict(rent, bench);
  const { fee: serviceFee, net: netRent } = netIncome(rent, feePercent);

  const changeZone = (name: string) => {
    setZoneName(name);
    const first = zones.find((z) => z.name === name)?.buildings[0];
    if (first) set("building", first.buildingCode);
  };

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

  const handleLockToggle = (type: LockKind) => {
    setF((prev) => {
      const exists = prev.locks.includes(type);
      if (exists) {
        return { ...prev, locks: prev.locks.filter((l) => l !== type) };
      }
      return { ...prev, locks: [...prev.locks, type] };
    });
  };

  const toggleInventoryItem = (code: string) => {
    setF((prev) => ({
      ...prev,
      inventory: prev.inventory.includes(code) ? prev.inventory.filter((k) => k !== code) : [...prev.inventory, code],
    }));
  };

  const addInventoryItem = (code: string) => {
    setExtraCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
    setF((prev) => ({ ...prev, inventory: prev.inventory.includes(code) ? prev.inventory : [...prev.inventory, code] }));
    setPicking(false);
  };

  const next1 = () => {
    const floorNum = Number(f.floor);
    if (!f.floor || floorNum < 1 || floorNum > maxFloor) {
      setErr(`Tầng phải từ 1 đến ${maxFloor} (toà ${f.building}).`);
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
    const depositProblem = depositRangeError(rent, deposit || rent);
    if (depositProblem) {
      setErr(depositProblem);
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
    if (f.locks.includes("smart") && f.smartLockOption === "provide_now" && f.doorCode.length < 4 && !draft) {
      setErr("Nhập mã khoá điện tử (tối thiểu 4 số) hoặc chọn “Đưa mã cho Field Host khi tới thẩm định”. Mã được mã hoá AES-256 và chỉ hiện cho Host khi đứng trước cửa.");
      return;
    }
    setErr("");
    setStep(2);
  };

  /** Ghi chú gửi kèm hồ sơ (Host/Admin đọc khi thẩm định): quy chế căn. Món nội thất đi riêng qua `inventoryCodes`. Tối đa 300 ký tự theo backend. */
  const buildNote = () => `Quy chế: tối đa ${f.maxOccupants} người · ${PET_LABEL[f.petPolicy]}`.slice(0, 300);

  /**
   * Bảo đảm hồ sơ ký gửi (bản nháp) đã tồn tại VÀ ảnh đã chọn đã lên máy chủ — gọi ngay trước khi gửi OTP.
   * Gửi lại OTP không tạo thêm hồ sơ; ảnh tải lỗi thì hồ sơ vẫn giữ, bấm gửi lại sẽ chỉ tải lại ảnh.
   */
  const ensureDraft = async (): Promise<string | null> => {
    let id = draftIdRef.current;
    if (!id) {
      const res = await landlordApi.createConsignment({
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
        ...(f.locks.includes("smart") && f.smartLockOption === "provide_now" && f.doorCode ? { doorCode: f.doorCode } : {}),
        note: buildNote(),
        ...(f.furnished ? { inventoryCodes: f.inventory } : {}),
      });
      if (!res.ok) {
        setErr(errorText(res, "Không tạo được hồ sơ ký gửi."));
        return null;
      }
      id = res.data.id;
      draftIdRef.current = id;
      setCreatedId(id);
    }
    if (photoFiles.length) {
      const up = await landlordApi.uploadPhotos(id, photoFiles);
      if (!up.ok) {
        setErr(`Hồ sơ đã được lưu nhưng chưa tải được ảnh: ${errorText(up, "thử lại sau.")} Bấm gửi lại để thử tiếp, hoặc bỏ ảnh lỗi ở bước trước.`);
        return null;
      }
      setUploadedCount(up.data.length);
      setPhotoFiles([]);
    }
    return id;
  };

  const signed = (c: Consignment) => {
    setCreatedId(c.id);
    setDone(true);
    invalidateLandlordData();
  };

  const netCard = (
    <div className={styles.netIncomeCard}>
      <div className={styles.netRow}>
        <span>Giá thuê chào ra thị trường:</span>
        <b>{vnd(rent)}đ/tháng</b>
      </div>
      <div className={styles.netRow}>
        <span>
          Phí dịch vụ nền tảng (<b>{feePercent}%</b>):
        </span>
        <span style={{ color: "var(--ink-2)" }}>
          - {vnd(serviceFee)}đ/tháng (chỉ trừ khi có khách thuê thành công · <b>0đ nếu phòng trống</b>)
        </span>
      </div>
      <div className={styles.netTotal}>
        <span>Dòng tiền thực nhận hàng tháng của bạn:</span>
        <span className={styles.netAmount}>{vnd(netRent)}đ/tháng</span>
      </div>
    </div>
  );

  if (done) {
    return (
      <div className={`${styles.page} ${styles.wizard}`}>
        <PageHeader title="Ký gửi căn mới" />
        <section className={`card ${styles.success}`}>
          <span className={styles.successIcon}>
            <CheckCircle2 size={38} />
          </span>
          <h1>Đã tiếp nhận hồ sơ ký gửi độc quyền</h1>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Bạn đã ký ủy quyền độc quyền cho căn <b>{f.building} · Tầng {f.floor} · Căn {f.door.padStart(2, "0")}</b> thuộc{" "}
            <b>{zoneName || f.building}</b>. Field Host phân khu sẽ liên hệ trong <b>48 giờ</b> (chi phí 0đ, bạn không cần có mặt), sau đó căn được niêm yết khi thẩm định đạt. Theo dõi tiến trình tại hồ sơ.
          </p>
          <div style={{ width: "100%", margin: "8px 0" }}>{netCard}</div>
          <div style={{ display: "flex", gap: "var(--s-3)", justifyContent: "center", flexWrap: "wrap" }}>
            {createdId && (
              <Link href={`/landlord/consignments/${createdId}`} className="btn btn-primary">
                Xem tiến trình thẩm định
              </Link>
            )}
            <Link href="/landlord/units" className="btn btn-secondary">
              Về danh sách căn
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.wizard}`}>
      <PageHeader
        title={draft ? "Ký ủy quyền cho căn đã đăng ký" : "Ký gửi căn hộ mới"}
        description="Cho thuê thần tốc: khách cọc giữ chỗ ngay. Chủ nhà ở nhà 100%, không đi lại 20–30km mở cửa. Chi phí thẩm định ảnh bằng 0."
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
                <span className="label">Phân khu nội khu</span>
                <select className="select" value={zoneName} onChange={(e) => changeZone(e.target.value)}>
                  {zones.map((z) => (
                    <option key={z.name} value={z.name}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="label">Tòa căn hộ</span>
                <select className="select" value={f.building} onChange={(e) => set("building", e.target.value)}>
                  {zoneBuildings.map((b) => (
                    <option key={b.id} value={b.buildingCode}>
                      Tòa {b.buildingCode}
                    </option>
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
                  placeholder={`1–${maxFloor}`}
                  value={f.floor}
                  onChange={(e) => set("floor", e.target.value.replace(/\D/g, ""))}
                />
              </label>

              <label className="field">
                <span className="label">Số căn hộ</span>
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
                  Theo sổ hồng / HĐMB. Field Host đo lại diện tích thông thuỷ khi thẩm định.
                </span>
              </label>

              <label className="field">
                <span className="label">Thời gian thuê mong muốn</span>
                <select className="select" value={f.leaseTerm} onChange={(e) => set("leaseTerm", e.target.value as LeaseTermPref)}>
                  <option value="long">Dài hạn: 12 tháng (Khuyên dùng)</option>
                  <option value="mid">Trung hạn: 1–6 tháng</option>
                  <option value="fixed">Cố định: 12 tháng</option>
                </select>
              </label>
            </div>

            {/* Định giá thị trường & huy hiệu "Căn hời" */}
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                <label className="field">
                  <span className="label">Giá chào thuê mong muốn (đ/tháng)</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="Từ 3.000.000đ"
                    value={f.askRent ? Number(f.askRent).toLocaleString("vi-VN") : ""}
                    onChange={(e) => handleRentChange(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="label">
                    Tiền cọc bảo đảm (Security Deposit)
                    <InfoTip label="Giải thích tiền cọc bảo đảm">
                      Cọc giữ chỗ của khách chuyển 100% thành tiền cọc bảo đảm khi ký HĐ, <b>không trừ</b> vào tiền thuê tháng đầu. Quy định: từ 50% (0.5 tháng) đến 4 lần (4 tháng) giá thuê.
                    </InfoTip>
                  </span>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="Để trống = 1 tháng tiền thuê (50% – 4x)"
                    value={f.suggestedDeposit ? Number(f.suggestedDeposit).toLocaleString("vi-VN") : ""}
                    onChange={(e) => set("suggestedDeposit", e.target.value.replace(/\D/g, ""))}
                  />
                  {depositErr ? (
                    <span className="field-error" role="alert" style={{ marginTop: 4 }}>{depositErr}</span>
                  ) : (
                    <span className="muted xs" style={{ marginTop: 4 }}>
                      Quy định: từ 50% (0.5 tháng) đến tối đa 4 lần giá thuê tháng. Cọc giữ chỗ của khách chuyển 100% vào khoản này, không khấu trừ tiền thuê tháng đầu.
                    </span>
                  )}
                </label>
              </div>

              <div className={styles.benchmarkBox}>
                <div className={styles.benchmarkHeader}>
                  <span>
                    Mặt bằng tham khảo <b>{LAYOUT_LABEL[f.layout]}</b> tại <b>{zoneName || "phân khu"}</b>:{" "}
                    <b>{vnd(bench.avg)}đ/tháng</b> ({vnd(bench.min)}đ – {vnd(bench.max)}đ)
                  </span>
                  {rent > 0 && verdict.isDeal && (
                    <span className={styles.dealBadge}>
                      <Flame size={13} /> Căn hời phân khu (-{Math.round(verdict.diff * 100)}%)
                    </span>
                  )}
                  {rent > 0 && verdict.isHigh && (
                    <span className={styles.dealBadgeWarn}>
                      <AlertTriangle size={12} /> Cao hơn mặt bằng (+{Math.abs(Math.round(verdict.diff * 100))}%)
                    </span>
                  )}
                </div>

                {rent > 0 && verdict.isDeal && (
                  <p className="xs" style={{ margin: 0, color: "#065f46" }}>
                    <b>Ưu thế thanh khoản:</b> AI Matchmaker tự gắn huy hiệu <b>“Căn hời phân khu”</b>, ưu tiên hiển thị đầu danh sách và tìm khách trong <b>dưới 7 ngày</b> mà không bị môi giới ngoài ép dìm giá.
                  </p>
                )}
                {rent > 0 && verdict.isHigh && (
                  <p className="xs" style={{ margin: 0, color: "#92400e" }}>
                    Giá cao hơn mặt bằng nên có thể mất nhiều thời gian hơn để tìm khách. Khi thẩm định, nếu thấy cần điều chỉnh giá, thẩm định viên sẽ đề xuất và bạn là người quyết định.
                  </p>
                )}
              </div>

              {rent > 0 && (
                <div style={{ marginTop: 10 }}>
                  {netCard}
                </div>
              )}

              {preview && (
                <p className="small muted" style={{ marginTop: 8 }}>
                  Khách sẽ thấy All-in Cost khoảng <b style={{ color: "var(--ink)" }}>{vnd(preview.total)}đ</b>/tháng (ước tính) (thuê + phí quản lý {vnd(preview.mgmt)} + xe + điện nước).
                </p>
              )}
            </div>

            {/* Quy chế căn hộ & giới hạn người ở */}
            <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--surface-2)", borderRadius: "var(--r)" }}>
              <b style={{ fontSize: 13.5, color: "var(--ink)" }}>Quy chế căn hộ & khách thuê mong muốn</b>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
                <label className="field">
                  <span className="label">Số người ở tối đa</span>
                  <select className="select" value={f.maxOccupants} onChange={(e) => set("maxOccupants", Number(e.target.value))}>
                    <option value={1}>Tối đa 1 người</option>
                    <option value={2}>Tối đa 2 người</option>
                    <option value={3}>Tối đa 3 người</option>
                    <option value={4}>Tối đa 4 người</option>
                    <option value={6}>Tối đa 5–6 người</option>
                  </select>
                </label>

                <label className="field">
                  <span className="label">Quy chế nuôi thú cưng</span>
                  <select className="select" value={f.petPolicy} onChange={(e) => set("petPolicy", e.target.value as PetPolicy)}>
                    <option value="no">Không cho phép nuôi thú cưng</option>
                    <option value="small">Chỉ chó / mèo nhỏ (dưới 5kg)</option>
                    <option value="allowed">Cho phép nuôi thú cưng</option>
                  </select>
                </label>
              </div>
              <p className="xs muted" style={{ margin: "6px 0 0" }}>
                <b>Bảo vệ chủ nhà:</b> hợp đồng quy định mọi khoản phạt của BQL Vinhomes (tiếng ồn sau 22h, nuôi thú cưng trái phép…) do lỗi của khách sẽ tự động khấu trừ vào Tiền cọc bảo đảm tài sản của khách.
              </p>
            </div>

            {err && <p className="field-error" role="alert" style={{ marginTop: 10 }}>{err}</p>}
            <div className={styles.wizardNav} style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-primary" onClick={next1}>
                Tiếp tục: Khoá cửa & Tài sản
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <span className="label">Hình thức khoá cửa căn hộ</span>
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
              <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--surface-2)", borderRadius: "var(--r)" }}>
                <b style={{ fontSize: 13, color: "var(--ink)" }}>Mã mở khoá điện tử</b>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="radio"
                      name="smartLockOption"
                      checked={f.smartLockOption === "provide_now"}
                      onChange={() => set("smartLockOption", "provide_now")}
                    />
                    <span>Cung cấp mã ngay (mã hoá AES-256)</span>
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="radio"
                      name="smartLockOption"
                      checked={f.smartLockOption === "at_inspection"}
                      onChange={() => set("smartLockOption", "at_inspection")}
                    />
                    <span>Đưa mã cho Field Host khi tới thẩm định</span>
                  </label>
                </div>

                {f.smartLockOption === "provide_now" && (
                  <label className="field" style={{ marginTop: 10 }}>
                    <span className="label">Nhập mã số mở cửa (4–8 số)</span>
                    <input
                      className="input"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Ví dụ: 123456"
                      value={f.doorCode}
                      onChange={(e) => set("doorCode", e.target.value.replace(/\D/g, "").slice(0, 8))}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Tình trạng nội thất bàn giao */}
            <div style={{ marginTop: 14 }}>
              <span className="label">Tình trạng nội thất bàn giao</span>
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
                  Không nội thất (nhà thô / nguyên bản CĐT)
                </button>
              </div>

              {f.furnished && (
                <div style={{ marginTop: 10 }}>
                  <span className="muted xs">
                    Tick các món hiện có tại căn. Field Host sẽ tick sẵn đúng các món này trong bảng kê 32 hạng mục khi thẩm định, rồi chụp ảnh và lập Hộ chiếu bàn giao số.
                  </span>
                  <div className={styles.preInventoryGrid}>
                    {shownCodes.map((code) => {
                      const active = f.inventory.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`${styles.preInventoryItem} ${active ? styles.preInventoryItemActive : ""}`}
                          aria-pressed={active}
                          onClick={() => toggleInventoryItem(code)}
                        >
                          <span>{nameOf(code)}</span>
                          <span aria-hidden style={{ marginLeft: "auto", fontSize: 12 }}>{active ? "✓" : "+"}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.preInventoryItem}
                      aria-expanded={picking}
                      aria-label="Thêm nội thất khác"
                      disabled={catalogStatus !== "ready" || pickable.length === 0}
                      onClick={() => setPicking((p) => !p)}
                    >
                      <span aria-hidden style={{ fontWeight: 700 }}>＋</span>
                      <span>Thêm nội thất khác</span>
                    </button>
                  </div>

                  {catalogStatus === "error" && (
                    <p className="field-error" role="alert" style={{ marginTop: 8 }}>
                      Chưa tải được danh sách món để thêm.
                    </p>
                  )}
                  {catalogStatus === "loading" && <p className="muted xs" style={{ marginTop: 8 }}>Đang tải danh sách món…</p>}

                  {picking && (
                    <div style={{ marginTop: 10, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r)", background: "var(--surface)" }}>
                      {GROUPS.map((g) => {
                        const items = pickable.filter((c) => c.group === g);
                        if (items.length === 0) return null;
                        return (
                          <div key={g} style={{ marginBottom: 8 }}>
                            <span className="muted xs">{g}. {GROUP_LABEL[g]}</span>
                            <div className={styles.chips} style={{ marginTop: 4 }}>
                              {items.map((c) => (
                                <button key={c.code} type="button" className={styles.chip} onClick={() => addInventoryItem(c.code)}>
                                  + {c.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <span className="label">Ảnh căn hộ tham khảo (không bắt buộc)</span>
              <p className="small muted" style={{ margin: "6px 0 8px" }}>
                Field Host phân khu sẽ tới chụp ảnh hiện trạng có dấu thời gian khi thẩm định — bạn không cần tự chụp. Có sẵn ảnh thì đính kèm thêm để Host và Admin tham khảo.
              </p>
              <PhotoPicker files={photoFiles} onChange={setPhotoFiles} uploadedCount={uploadedCount} />
            </div>

            {err && <p className="field-error" role="alert" style={{ marginTop: 10 }}>{err}</p>}
            <div className={styles.wizardNav}>
              <button type="button" className="btn btn-quiet" onClick={() => setStep(0)}>
                Quay lại: Thông tin căn
              </button>
              <button type="button" className="btn btn-primary" onClick={next2}>
                Tiếp tục: Ký ủy quyền độc quyền
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <dl className={styles.summary}>
              <div>
                <dt>Căn hộ định danh</dt>
                <dd>
                  Vinhomes Ocean Park 1 · {zoneName || f.building} · Toà {f.building} · Tầng {f.floor} · Căn {f.door.padStart(2, "0")} (Mã: <b>{unitCode}</b>)
                </dd>
              </div>
              <div>
                <dt>Loại căn & Diện tích</dt>
                <dd>
                  {LAYOUT_LABEL[f.layout]} · {area} m² tim tường
                </dd>
              </div>
              <div>
                <dt>Giá chào thuê</dt>
                <dd>
                  <b>{vnd(rent)}đ/tháng</b>
                  {verdict.isDeal && (
                    <span className={styles.dealBadge} style={{ marginLeft: 6, fontSize: 11 }}>
                      <Flame size={12} /> Căn hời
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Dòng tiền thực nhận của bạn</dt>
                <dd style={{ color: "#059669", fontWeight: 800 }}>
                  {vnd(netRent)}đ/tháng <span className="xs muted">(đã trừ {feePercent}% phí nền tảng)</span>
                </dd>
              </div>
              <div>
                <dt>Tiền cọc bảo đảm</dt>
                <dd>{vnd(deposit || rent)}đ (giữ suốt kỳ thuê, hoàn lại khi thanh lý)</dd>
              </div>
              <div>
                <dt>Thời gian thuê mong muốn</dt>
                <dd>{LEASE_TERM_LABEL[f.leaseTerm]}</dd>
              </div>
              <div>
                <dt>Quy chế</dt>
                <dd>
                  Tối đa {f.maxOccupants} người · {PET_LABEL[f.petPolicy]}
                </dd>
              </div>
              <div>
                <dt>Nội thất</dt>
                <dd>{f.furnished ? `Có nội thất (${f.inventory.length} món kê khai)` : "Không nội thất"}</dd>
              </div>
              <div>
                <dt>Ảnh đính kèm</dt>
                <dd>{photoFiles.length + uploadedCount > 0 ? `${photoFiles.length + uploadedCount} ảnh` : "Không có"}</dd>
              </div>
              <div>
                <dt>Khoá cửa</dt>
                <dd>
                  {f.locks.includes("smart") && f.locks.includes("physical")
                    ? "Khoá điện tử + chìa cơ"
                    : f.locks.includes("smart")
                      ? f.smartLockOption === "provide_now" || draft
                        ? "Khoá điện tử (đã lưu mã bảo mật)"
                        : "Khoá điện tử (đưa mã cho Host khi thẩm định)"
                      : "Chìa cơ tại quầy phân khu"}
                </dd>
              </div>
            </dl>

            {/* Lộ trình thẩm định & niêm yết */}
            <div style={{ margin: "14px 0" }}>
              <b style={{ fontSize: 13.5, color: "var(--ink)" }}>Lộ trình thẩm định & niêm yết căn hộ:</b>
              <div className={styles.roadmapContainer}>
                <div className={styles.roadmapStep}>
                  <div className={styles.roadmapStepNumber}>1</div>
                  <div className={styles.roadmapStepTitle}>Ký ủy quyền (0đ)</div>
                  <div className={styles.roadmapStepDesc}>Ký điện tử, bảo mật AES-256.</div>
                </div>
                <div className={styles.roadmapStep}>
                  <div className={styles.roadmapStepNumber}>2</div>
                  <div className={styles.roadmapStepTitle}>Thẩm định 48h</div>
                  <div className={styles.roadmapStepDesc}>Field Host nội khu có thẻ cư dân liên hệ, chụp ảnh verified và kiểm đếm nội thất (chi phí 0đ).</div>
                </div>
                <div className={styles.roadmapStep}>
                  <div className={styles.roadmapStepNumber}>3</div>
                  <div className={styles.roadmapStepTitle}>Niêm yết</div>
                  <div className={styles.roadmapStepDesc}>Thẩm định đạt thì căn tự niêm yết, đóng watermark số chống môi giới ngoài ăn cắp tin.</div>
                </div>
                <div className={styles.roadmapStep}>
                  <div className={styles.roadmapStepNumber}>4</div>
                  <div className={styles.roadmapStepTitle}>Khớp khách & Dẫn xem</div>
                  <div className={styles.roadmapStepDesc}>AI khớp khách theo All-in, Host dẫn xem và mở cửa. Khách cọc 2tr khoá căn ngay.</div>
                </div>
              </div>
            </div>

            <ul className={styles.terms}>
              <li>
                <ShieldCheck size={16} /> Ủy quyền <b>độc quyền</b>: mọi giao dịch thuê trong thời hạn ủy quyền thực hiện qua VinStay AI.
              </li>
              <li>
                <ShieldCheck size={16} /> <b>Thoát linh hoạt 15 ngày:</b> báo trước tối thiểu 15 ngày khi căn đang trống và không trong thời gian giữ chỗ.
              </li>
              <li>
                <ShieldCheck size={16} /> <b>First-to-Pay Wins:</b> khoá căn dựa trên tiền cọc giữ chỗ thực tế qua VietQR động; khoản cọc này chuyển 100% thành Tiền Cọc Bảo Đảm, không trừ vào tiền thuê tháng đầu.
              </li>
              <li>
                <ShieldCheck size={16} /> <b>Vận hành asset-light:</b> VinStay không nhận sửa chữa; chỉ giới thiệu thợ ngoài uy tín.
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
                  Sau khi ký, Field Host phân khu {zoneName || f.building} sẽ gọi hẹn giờ, tới căn kiểm tra đồ đạc và hiện trạng theo bảng kê Điều 5 hợp đồng thuê trong 48 giờ. Chi phí 0đ, bạn không cần có mặt.
                </p>
              </div>
            </div>

            <div className="card" style={{ background: "var(--surface-2)", padding: "14px 16px", margin: "14px 0" }}>
              <b style={{ color: "var(--ink-950)", fontSize: 14 }}>Điểm chính của Hợp đồng ký gửi</b>
              <ul className="small muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                <li><b>Điều 2</b> · Bạn cam đoan là chủ sở hữu hợp pháp (hoặc người được uỷ quyền hợp pháp duy nhất); căn không tranh chấp, không bị kê biên; nếu đang thế chấp thì việc cho thuê không vi phạm nghĩa vụ thế chấp.</li>
                <li><b>Điều 3</b> · VinStay được uỷ quyền lại cho Field Host nội khu đón khách, dẫn xem, kiểm kê 10 hạng mục và chốt công tơ; VinStay chịu trách nhiệm về đội ngũ này.</li>
                <li><b>Điều 5</b> · Khách đặt cọc giữ chỗ, căn khoá giữ chỗ mặc định 48 giờ (Admin cấu hình 12–72 giờ); khi ký HĐ thuê cọc chuyển 100% vào cọc bảo đảm, không trừ tiền thuê tháng đầu.</li>
                <li><b>Điều 6</b> · Phí dịch vụ chỉ thu khi khách đã ký HĐ và thanh toán đủ kỳ đầu + cọc. Tự giao dịch ngoài nền tảng với khách VinStay đã giới thiệu trong thời hạn HĐ và 06 tháng sau: vẫn trả 100% phí + phạt 01 tháng tiền thuê.</li>
                <li><b>Điều 8</b> · Thời hạn 12 tháng, tự gia hạn từng kỳ 12 tháng nếu không báo dừng trước 15 ngày. Dừng ký gửi bất kỳ lúc nào: báo trước 15 ngày và căn đang trống, không trong thời gian giữ chỗ.</li>
                <li><b>Điều 7</b> · VinStay không bảo lãnh tài chính thay khách ngoài quỹ cọc bảo đảm; miễn trừ lỗi kết cấu toà nhà và bất khả kháng.</li>
              </ul>
            </div>

            <label className="small" style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "10px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={warranted} onChange={(e) => { setWarranted(e.target.checked); setErr(""); }} style={{ marginTop: 3, flex: "none" }} />
              <span>Tôi cam đoan quyền sở hữu/uỷ quyền hợp pháp đối với căn hộ theo Điều 2; căn hộ không có tranh chấp và đủ điều kiện đưa vào vận hành cho thuê.</span>
            </label>

            <div style={{ margin: "14px 0 6px" }}>
              <ConsignOtpSign warranted={warranted} verifiedPhone={verifiedPhone} ensureDraft={ensureDraft} onSigned={signed} onError={setErr} onPhoneVerified={() => refreshApi(queries.profile.key)} />
              <p className="muted xs" style={{ textAlign: "center", marginTop: 8 }}>
                Bấm ký nghĩa là bạn ký điện tử Hợp đồng ký gửi quản lý độc quyền 12 tháng (tự gia hạn) bằng số điện thoại đã xác thực, theo Luật Giao dịch điện tử 2023.
              </p>
            </div>

            {err && <p className="field-error" role="alert" style={{ marginTop: 12 }}>{err}</p>}
            {!draft && (
              <div className={styles.wizardNav}>
                <button type="button" className="btn btn-quiet" onClick={() => setStep(1)}>
                  Quay lại: Khoá cửa & Tài sản
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
