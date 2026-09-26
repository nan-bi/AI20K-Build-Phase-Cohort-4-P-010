"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CheckCircle2, KeyRound, Smartphone, Timer, X, Sliders, ShieldCheck, DollarSign, Building } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { approveConsignment, rejectConsignment } from "@/lib/mock/actions";
import { allInCost, DEFAULT_HOUSEHOLD, RATES } from "@/lib/mock/cost";
import { fmtDate, vnd } from "@/lib/mock/format";
import { unitStatus } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Consignment, ConsignmentPolicy } from "@/lib/mock/types";
import { FURNISHING_LABEL, LAYOUT_LABEL, UNITS, ZONES, HOSTS, hostForUnit, landlordById, unitAddress, unitById, zoneById, zoneOfBuilding, type UnitStatus } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

type Tab = "units" | "requests" | "exit";
const ST: Record<UnitStatus, { label: string; badge: string }> = {
  available: { label: "Còn trống", badge: "badge-kelp" },
  holding: { label: "Giữ chỗ 24h", badge: "badge-amber-soft" },
  rented: { label: "Đã cho thuê", badge: "badge-ink" },
};
const CS: Record<Consignment["status"], { label: string; badge: string }> = {
  draft: { label: "Chưa ký ủy quyền", badge: "badge-plain" },
  pending: { label: "Chờ duyệt", badge: "badge-amber-soft" },
  approved: { label: "Đã duyệt", badge: "badge-kelp" },
  rejected: { label: "Không duyệt", badge: "badge-coral-soft" },
};

export function AdminInventory({ initialTab }: { initialTab: Tab }) {
  const state = useMock();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState<UnitStatus | "all">("all");
  const [lock, setLock] = useState<"all" | "smart" | "physical">("all");
  const [rejecting, setRejecting] = useState<Consignment | null>(null);
  const [approving, setApproving] = useState<Consignment | null>(null);
  const [note, setNote] = useState("Ảnh hiện trạng chưa rõ, cần bổ sung");

  if (!state.ready || !now) return <div className="skeleton" style={{ height: 360 }} />;

  const pending = state.consignments.filter((c) => c.status === "pending");
  const exiting = Object.values(state.mandates).filter((m) => m.status === "exiting");
  const units = UNITS.filter((u) => (zone === "all" || u.zoneId === zone) && (status === "all" || unitStatus(state, u) === status) && (lock === "all" || u.lock === lock));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Căn hộ và ký gửi</h1>
          <p className="muted">Rổ hàng ký gửi độc quyền: chi phí kiểm định một lần khi tiếp nhận, không môi giới ngoài.</p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "units"} onClick={() => setTab("units")}>
          Rổ hàng ({UNITS.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "requests"} onClick={() => setTab("requests")}>
          Yêu cầu ký gửi {pending.length > 0 && <i>{pending.length}</i>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "exit"} onClick={() => setTab("exit")}>
          Thoát uỷ quyền 15 ngày {exiting.length > 0 && <i>{exiting.length}</i>}
        </button>
      </div>

      {tab === "units" && (
        <>
          <div className={styles.tools}>
            <select className="select" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Lọc theo phân khu">
              <option value="all">Mọi phân khu</option>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as UnitStatus | "all")} aria-label="Lọc theo trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="available">Còn trống</option>
              <option value="holding">Giữ chỗ 24h</option>
              <option value="rented">Đã cho thuê</option>
            </select>
            <select className="select" value={lock} onChange={(e) => setLock(e.target.value as "all" | "smart" | "physical")} aria-label="Lọc theo loại khoá">
              <option value="all">Mọi loại khoá</option>
              <option value="smart">Khoá điện tử</option>
              <option value="physical">Chìa cơ</option>
            </select>
            <span className="muted small">{units.length} căn</span>
          </div>
          <div className={`card ${styles.tableCard}`}>
            <div className={styles.tableScroll}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">Căn hộ</th>
                    <th scope="col">Phân khu · Host</th>
                    <th scope="col">Loại</th>
                    <th scope="col" className={styles.right}>Giá thuê</th>
                    <th scope="col" className={styles.right}>All-in</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Khoá</th>
                    <th scope="col">Chủ nhà</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const s = unitStatus(state, u);
                    const m = state.mandates[u.id];
                    return (
                      <tr key={u.id}>
                        <td>
                          <Link href={`/units/${u.id}`} className="link" style={{ textDecoration: "none" }}>
                            <b>{unitAddress(u)}</b>
                          </Link>
                          <span className="muted xs" style={{ display: "block" }}>
                            {u.code}
                          </span>
                        </td>
                        <td>
                          {zoneById(u.zoneId).short}
                          <span className="muted xs" style={{ display: "block" }}>
                            {hostForUnit(u).name}
                          </span>
                        </td>
                        <td>
                          {u.layoutLabel} · {u.areaM2}m²
                        </td>
                        <td className={`${styles.right} tnum`}>{vnd(u.rent)}</td>
                        <td className={`${styles.right} tnum`}>{vnd(allInCost(u, DEFAULT_HOUSEHOLD).total)}</td>
                        <td>
                          <span className={`badge ${ST[s].badge}`}>{ST[s].label}</span>
                          {m?.status === "exiting" && (
                            <span className="badge badge-coral-soft" style={{ marginLeft: 6 }}>
                              <Timer size={12} /> Đang thoát
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-plain">
                            {u.lock === "smart" ? <Smartphone size={12} /> : <KeyRound size={12} />} {u.lock === "smart" ? "Điện tử" : "Chìa cơ"}
                          </span>
                        </td>
                        <td>{landlordById(u.landlordId)?.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "requests" && (
        <>
          {state.consignments.length === 0 && <div className={styles.empty}>Chưa có yêu cầu ký gửi.</div>}
          <div className={styles.reqs}>
            {state.consignments.map((c) => (
              <article key={c.id} className={`card ${styles.req}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3>
                      {c.building} · Tầng {c.floor} · Căn {c.door}
                    </h3>
                    <p className="muted small">{landlordById(c.landlordId)?.name}</p>
                  </div>
                  <span className={`badge ${CS[c.status].badge}`}>{CS[c.status].label}</span>
                </div>
                <dl className={styles.reqMeta}>
                  <div>
                    <dt>Loại căn</dt>
                    <dd>
                      {LAYOUT_LABEL[c.layout]} · {c.areaM2} m²
                    </dd>
                  </div>
                  <div>
                    <dt>Giá chào thuê</dt>
                    <dd>{vnd(c.askRent)}đ/tháng</dd>
                  </div>
                  <div>
                    <dt>Nội thất</dt>
                    <dd>{FURNISHING_LABEL[c.furnishing]}</dd>
                  </div>
                  <div>
                    <dt>Khoá cửa</dt>
                    <dd>{c.lock === "smart" ? "Khoá điện tử (mã hoá AES-256)" : "Chìa cơ gửi quầy phân khu"}</dd>
                  </div>
                  <div>
                    <dt>Thẩm định ảnh</dt>
                    <dd>{c.auditByHost ? "Host chụp miễn phí" : "Chủ nhà tự tải"}</dd>
                  </div>
                  <div>
                    <dt>Gửi lúc</dt>
                    <dd>{fmtDate(c.createdAt)}</dd>
                  </div>
                </dl>
                {c.note && <p className="small muted">Ghi chú: {c.note}</p>}
                {c.policy && (
                  <div style={{ padding: "8px 10px", background: "var(--surface-2)", borderRadius: "var(--r-sm)", fontSize: 13, border: "1px dashed var(--line)" }}>
                    <span style={{ color: "var(--lagoon)", fontWeight: 600 }}>Chính sách đã duyệt:</span> {vnd(c.policy.rent ?? c.askRent)}đ/tháng · {c.policy.bqlFeeIncluded ? "Bao phí BQL" : "Khách trả phí BQL"} · Cọc VietQR: {vnd(c.policy.holdingDepositAmount)}đ
                  </div>
                )}
                {c.status === "pending" && (
                  <div className={styles.reqActions}>
                    <button type="button" className="btn btn-quiet" onClick={() => setRejecting(c)}>
                      <X size={16} /> Không duyệt
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ flex: 1 }}
                      onClick={() => setApproving(c)}
                    >
                      <Sliders size={16} /> Cấu hình & Duyệt
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "exit" && (
        <>
          {exiting.length === 0 && <div className={styles.empty}>Không có căn nào đang đếm ngược thoát uỷ quyền.</div>}
          <div className={styles.reqs}>
            {exiting.map((m) => {
              const u = unitById(m.unitId)!;
              const days = Math.max(0, Math.ceil((new Date(m.exitEffectiveAt!).getTime() - now) / 86_400_000));
              return (
                <article key={m.unitId} className={`card ${styles.req}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <h3>{unitAddress(u)}</h3>
                      <p className="muted small">{landlordById(u.landlordId)?.name}</p>
                    </div>
                    <span className="badge badge-coral-soft">
                      <Timer size={12} /> Còn {days} ngày
                    </span>
                  </div>
                  <dl className={styles.reqMeta}>
                    <div>
                      <dt>Yêu cầu lúc</dt>
                      <dd>{fmtDate(m.exitRequestedAt!)}</dd>
                    </div>
                    <div>
                      <dt>Hiệu lực</dt>
                      <dd>{fmtDate(m.exitEffectiveAt!)}</dd>
                    </div>
                  </dl>
                  <p className="small muted">Hết hạn, căn tự chuyển “unlisted”, mã cửa và chìa cơ bị thu hồi khỏi mạng lưới Host. Trong thời gian này căn vẫn hiển thị để đón nốt khách.</p>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        variant="sheet"
        title="Không duyệt yêu cầu ký gửi"
        footer={
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              if (!rejecting) return;
              rejectConsignment(rejecting.id, note);
              setRejecting(null);
              toast("Đã từ chối và báo chủ nhà qua Zalo");
            }}
          >
            Xác nhận không duyệt
          </button>
        }
      >
        <label className="field">
          <span className="label">Lý do (gửi cho chủ nhà)</span>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </Modal>

      {approving && (
        <ApprovePolicyModal
          consignment={approving}
          onClose={() => setApproving(null)}
          onApprove={(policy) => {
            approveConsignment(approving.id, policy);
            toast(`Đã duyệt và đăng sàn thành công căn ${approving.building} · Tầng ${approving.floor} · Căn ${approving.door}!`, "success");
            setApproving(null);
          }}
        />
      )}
    </div>
  );
}

interface ApprovePolicyModalProps {
  consignment: Consignment;
  onClose: () => void;
  onApprove: (policy: ConsignmentPolicy) => void;
}

function ApprovePolicyModal({ consignment, onClose, onApprove }: ApprovePolicyModalProps) {
  const defaultDeposit =
    consignment.layout === "Studio" || consignment.layout === "1PN"
      ? 2_000_000
      : consignment.layout === "2PN"
        ? 2_500_000
        : 3_500_000;

  const defaultHost = zoneOfBuilding(consignment.building)?.hostId ?? HOSTS[0].id;

  const [rent, setRent] = useState(consignment.askRent);
  const [bqlFeeIncluded, setBqlFeeIncluded] = useState(true);
  const [holdingDepositAmount, setHoldingDepositAmount] = useState(defaultDeposit);
  const [securityDepositMonths, setSecurityDepositMonths] = useState(1);
  const [minMonths, setMinMonths] = useState(12);
  const [paymentTermMonths, setPaymentTermMonths] = useState(1);
  const [petFriendly, setPetFriendly] = useState(false);
  const [hostId, setHostId] = useState(defaultHost);

  const mgmtEstimate = Math.round(consignment.areaM2 * RATES.mgmtPerM2);
  const allIn = allInCost({ rent, areaM2: consignment.areaM2, bqlFeeIncluded }, DEFAULT_HOUSEHOLD);
  const totalSecurityDeposit = rent * securityDepositMonths;
  const remainingDepositToPay = Math.max(0, totalSecurityDeposit - holdingDepositAmount);
  const totalMoveInCash = rent + totalSecurityDeposit;

  const handleConfirm = () => {
    onApprove({
      rent,
      bqlFeeIncluded,
      holdingDepositAmount,
      securityDepositMonths,
      minMonths,
      paymentTermMonths,
      petFriendly,
      hostId,
    });
  };

  const DEPOSIT_PRESETS = [2_000_000, 2_500_000, 3_000_000, 3_500_000, 5_000_000];

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="wide"
      title={`Cấu hình Chính sách Thuê & Duyệt căn ${consignment.building} · Tầng ${consignment.floor} · Căn ${consignment.door}`}
      description={`${LAYOUT_LABEL[consignment.layout]} · ${consignment.areaM2} m² · ${FURNISHING_LABEL[consignment.furnishing]} · Chủ nhà: ${landlordById(consignment.landlordId)?.name ?? "Chủ nhà"}`}
    >
      <div className={styles.policyModal}>
        {/* Cột trái: Form cấu hình */}
        <div className={styles.policyForms}>
          {/* Mục 1: Giá thuê & Phí Quản lý */}
          <section className={styles.policySection}>
            <div className={styles.sectionHead}>
              <ShieldCheck size={18} />
              <span>1. Giá niêm yết & Phí Quản lý BQL Vinhomes</span>
            </div>
            <label className="field">
              <span className="label">Giá thuê niêm yết chính thức (VNĐ/tháng)</span>
              <div className={styles.suffix}>
                <input
                  type="number"
                  step={100000}
                  className="input"
                  value={rent}
                  onChange={(e) => setRent(Math.max(1_000_000, Number(e.target.value) || 0))}
                />
                <span>đ/tháng</span>
              </div>
              <span className="muted xs" style={{ marginTop: 2 }}>
                Chủ nhà đề xuất ban đầu: <b>{vnd(consignment.askRent)} đ/tháng</b>
              </span>
            </label>

            <div className="field">
              <span className="label">Chính sách Phí Quản lý BQL (~9.500đ/m²)</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className={`${styles.radioOption} ${bqlFeeIncluded ? styles.radioActive : ""}`}>
                  <input
                    type="radio"
                    name="bql_payer"
                    checked={bqlFeeIncluded}
                    onChange={() => setBqlFeeIncluded(true)}
                  />
                  <div>
                    <strong>Chủ nhà bao trọn Phí Quản lý BQL (Khuyên dùng)</strong>
                    <p className="muted xs" style={{ marginTop: 2 }}>
                      Đã gộp trong tiền thuê. Khách thuê không phải trả thêm phí này. Thu hút khách chốt nhanh hơn.
                    </p>
                  </div>
                </label>
                <label className={`${styles.radioOption} ${!bqlFeeIncluded ? styles.radioActive : ""}`}>
                  <input
                    type="radio"
                    name="bql_payer"
                    checked={!bqlFeeIncluded}
                    onChange={() => setBqlFeeIncluded(false)}
                  />
                  <div>
                    <strong>Khách thuê tự trả riêng cho BQL Vinhomes</strong>
                    <p className="muted xs" style={{ marginTop: 2 }}>
                      Khách trả thêm theo hóa đơn BQL hàng tháng: ~{vnd(mgmtEstimate)} đ/tháng ({consignment.areaM2}m² × 9.500đ).
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Mục 2: Chính sách Đặt cọc linh hoạt (Admin Controls) */}
          <section className={styles.policySection}>
            <div className={styles.sectionHead}>
              <DollarSign size={18} />
              <span>2. Chính sách Đặt cọc do ADMIN quản lý</span>
            </div>
            <label className="field">
              <span className="label">Mức cọc giữ chỗ 24h qua VietQR động (VNĐ)</span>
              <div className={styles.suffix}>
                <input
                  type="number"
                  step={500000}
                  className="input"
                  value={holdingDepositAmount}
                  onChange={(e) => setHoldingDepositAmount(Math.max(500_000, Number(e.target.value) || 0))}
                />
                <span>VNĐ</span>
              </div>
              <div className={styles.chipRow}>
                <span className="muted xs" style={{ alignSelf: "center", marginRight: 4 }}>Gợi ý nhanh:</span>
                {DEPOSIT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.chipBtn} ${holdingDepositAmount === p ? styles.chipBtnActive : ""}`}
                    onClick={() => setHoldingDepositAmount(p)}
                  >
                    {vnd(p)}đ
                  </button>
                ))}
              </div>
            </label>

            <div className={styles.policyGrid2}>
              <label className="field">
                <span className="label">Tiền cọc bảo đảm tài sản</span>
                <select
                  className="select"
                  value={securityDepositMonths}
                  onChange={(e) => setSecurityDepositMonths(Number(e.target.value))}
                >
                  <option value={1}>01 tháng tiền thuê (Chuẩn)</option>
                  <option value={2}>02 tháng tiền thuê (Nội thất xịn)</option>
                </select>
                <span className="muted xs" style={{ marginTop: 2 }}>
                  = <b>{vnd(totalSecurityDeposit)} VNĐ</b>
                </span>
              </label>

              <label className="field">
                <span className="label">Kỳ hạn thuê tối thiểu</span>
                <select
                  className="select"
                  value={minMonths}
                  onChange={(e) => setMinMonths(Number(e.target.value))}
                >
                  <option value={6}>06 tháng</option>
                  <option value={12}>12 tháng (Mặc định)</option>
                  <option value={24}>24 tháng</option>
                </select>
              </label>
            </div>
          </section>

          {/* Mục 3: Vận hành & Phân bổ Host */}
          <section className={styles.policySection}>
            <div className={styles.sectionHead}>
              <Building size={18} />
              <span>3. Vận hành & Phân bổ Field Host</span>
            </div>
            <div className={styles.policyGrid2}>
              <label className="field">
                <span className="label">Kỳ hạn đóng tiền</span>
                <select
                  className="select"
                  value={paymentTermMonths}
                  onChange={(e) => setPaymentTermMonths(Number(e.target.value))}
                >
                  <option value={1}>01 tháng / lần (Mặc định)</option>
                  <option value={3}>03 tháng / lần</option>
                  <option value={6}>06 tháng / lần</option>
                </select>
              </label>

              <label className="field">
                <span className="label">Field Host phụ trách</span>
                <select
                  className="select"
                  value={hostId}
                  onChange={(e) => setHostId(e.target.value)}
                >
                  {HOSTS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.phone})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="check" style={{ marginTop: 4 }}>
              <input
                type="checkbox"
                checked={petFriendly}
                onChange={(e) => setPetFriendly(e.target.checked)}
              />
              <span>Cho phép nuôi thú cưng (cam kết tuân thủ rọ mõm & vệ sinh theo Điều 8 Nội quy BQL)</span>
            </label>
          </section>
        </div>

        {/* Cột phải: Preview All-in Cost & Move-in Cash Summary */}
        <aside className={styles.previewCard}>
          <div className={styles.previewHead}>
            <h3>Dự Toán All-in Cost</h3>
            <p className="muted xs">Hiển thị trực quan cho Khách thuê theo thời gian thực</p>
          </div>

          <table className={styles.previewTable}>
            <tbody>
              <tr>
                <td>Tiền thuê căn hộ</td>
                <td>{vnd(rent)} đ</td>
              </tr>
              <tr>
                <td>Phí Quản lý BQL Vinhomes</td>
                <td style={{ color: bqlFeeIncluded ? "var(--lagoon, #006852)" : undefined }}>
                  {bqlFeeIncluded ? "0 đ (Chủ bao trọn)" : `${vnd(mgmtEstimate)} đ`}
                </td>
              </tr>
              <tr>
                <td>Phí gửi xe máy ước tính</td>
                <td>150.000 đ</td>
              </tr>
              <tr>
                <td>Dự toán điện nước EVN (1 người)</td>
                <td>300.000 đ</td>
              </tr>
              <tr className={styles.totalRow}>
                <td>Tổng All-in Cost / tháng</td>
                <td>{vnd(allIn.total)} đ/tháng</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #b7dfd5", paddingTop: 10 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, color: "var(--ink)" }}>Dự toán thanh toán nhận nhà:</h4>
            <table className={styles.previewTable}>
              <tbody>
                <tr>
                  <td>Cọc giữ chỗ VietQR (đóng ngay)</td>
                  <td style={{ color: "var(--amber, #b25e00)" }}>{vnd(holdingDepositAmount)} đ</td>
                </tr>
                <tr>
                  <td>Cọc bảo đảm tài sản còn thiếu</td>
                  <td>{vnd(remainingDepositToPay)} đ</td>
                </tr>
                <tr>
                  <td>Tiền thuê kỳ 1 (tháng đầu)</td>
                  <td>{vnd(rent)} đ</td>
                </tr>
                <tr className={styles.totalRow}>
                  <td>Tổng nộp khi nhận nhà</td>
                  <td>{vnd(totalMoveInCash)} đ</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.legalBadge}>
            <ShieldCheck size={20} />
            <div>
              <strong>Bảo vệ Chủ nhà 100%:</strong> Cọc giữ chỗ {vnd(holdingDepositAmount)}đ chuyển đổi thành Tiền Cọc Bảo Đảm Tài Sản, tuyệt đối KHÔNG trừ vào tiền thuê tháng đầu. Hộ chiếu bàn giao số 10 hạng mục sẽ được đối soát khi thanh lý.
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="button" className="btn btn-success" onClick={handleConfirm}>
              <CheckCircle2 size={16} /> Phê Duyệt & Đăng Sàn
            </button>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
