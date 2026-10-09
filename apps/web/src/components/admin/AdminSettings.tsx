"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { useSession } from "@/lib/auth/client";
import { adminApi, useAdminDepositPolicy } from "@/lib/admin/api";
// TẠM TẮT: cài đặt phí dịch vụ ký gửi (chủ nhà). Đang dùng mặc định 5%; bỏ comment (và API ở admin.controller.ts) để bật lại.
// import { LandlordFeeSettings } from "./LandlordFeeSettings";
import styles from "./Admin.module.css";

export function AdminSettings() {
  const session = useSession();
  const depositPolicy = useAdminDepositPolicy();

  // Deposit policy state
  const [minRatio, setMinRatio] = useState<string>("");
  const [maxRatio, setMaxRatio] = useState<string>("");
  const [defaultRatio, setDefaultRatio] = useState<string>("");
  const [depositReason, setDepositReason] = useState("");
  const [savingDeposit, setSavingDeposit] = useState(false);

  // Deposit simulator state
  const [simRent, setSimRent] = useState<number>(10_000_000);

  // Current deposit values
  const curMin = depositPolicy.state.status === "ready" ? depositPolicy.state.data.minRatio : 0.5;
  const curMax = depositPolicy.state.status === "ready" ? depositPolicy.state.data.maxRatio : 4.0;
  const curDef = depositPolicy.state.status === "ready" ? depositPolicy.state.data.defaultRatio : 1.0;

  const inputMin = minRatio !== "" ? Number(minRatio) : curMin;
  const inputMax = maxRatio !== "" ? Number(maxRatio) : curMax;
  const inputDef = defaultRatio !== "" ? Number(defaultRatio) : curDef;

  async function saveDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (inputMin <= 0 || inputMax <= 0 || inputDef <= 0) {
      toast("Tỷ lệ cọc phải lớn hơn 0.");
      return;
    }
    if (inputMin > inputMax) {
      toast("Tỷ lệ tối thiểu không được lớn hơn tỷ lệ tối đa.");
      return;
    }
    if (inputDef < inputMin || inputDef > inputMax) {
      toast("Tỷ lệ mặc định phải nằm giữa mức tối thiểu và tối đa.");
      return;
    }
    if (!depositReason.trim()) {
      toast("Vui lòng nhập lý do thay đổi quy định tiền cọc.");
      return;
    }
    setSavingDeposit(true);
    const res = await adminApi.updateDepositPolicy({
      minRatio: inputMin,
      maxRatio: inputMax,
      defaultRatio: inputDef,
      reason: depositReason.trim(),
    });
    setSavingDeposit(false);
    if (!res.ok) {
      toast(res.message || "Không thể cập nhật quy định tiền cọc.");
      return;
    }
    setMinRatio("");
    setMaxRatio("");
    setDefaultRatio("");
    setDepositReason("");
    depositPolicy.reload();
    toast("Đã lưu quy định tiền cọc mới vào hệ thống.", "success");
  }

  const depositChanged =
    (minRatio !== "" && Number(minRatio) !== curMin) ||
    (maxRatio !== "" && Number(maxRatio) !== curMax) ||
    (defaultRatio !== "" && Number(defaultRatio) !== curDef);

  return (
    <div className={styles.page}>
      <PageHeader title="Cài đặt" description="Thông tin phiên quản trị và tham số vận hành lấy từ hệ thống." />

      <Section title="Tài khoản quản trị">
        <KeyValue
          items={[
            { label: "Họ và tên", value: session.user?.fullName || "—" },
            { label: "Email", value: session.user?.email || "—" },
            { label: "Vai trò", value: session.user?.portal || "—" },
          ]}
        />
      </Section>

      {/* <LandlordFeeSettings /> */}

      <Section
        title="Quy định tiền cọc hợp đồng thuê (Deposit Policy)"
        description="Số tiền cọc căn cứ theo giá của hợp đồng thuê cụ thể: không được nhỏ hơn 50% và không được lớn hơn 4 lần số tiền thuê mỗi tháng."
      >
        {depositPolicy.state.status === "loading" ? (
          <div className="skeleton" style={{ height: 160, maxWidth: 640 }} />
        ) : depositPolicy.state.status === "error" ? (
          <div role="alert">
            <p>{depositPolicy.state.message}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={depositPolicy.reload}>
              Thử lại
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 640, display: "grid", gap: 20 }}>
            <form onSubmit={saveDeposit} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="field">
                  <span className="label">Tối thiểu (% giá thuê)</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      step={0.05}
                      min={0.1}
                      max={2.0}
                      className="input"
                      value={minRatio !== "" ? minRatio : String(curMin)}
                      onChange={(e) => setMinRatio(e.target.value)}
                      required
                    />
                    <span className="small muted">({Math.round(inputMin * 100)}%)</span>
                  </div>
                </label>

                <label className="field">
                  <span className="label">Mặc định gợi ý (% giá thuê)</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      max={3.0}
                      className="input"
                      value={defaultRatio !== "" ? defaultRatio : String(curDef)}
                      onChange={(e) => setDefaultRatio(e.target.value)}
                      required
                    />
                    <span className="small muted">({Math.round(inputDef * 100)}%)</span>
                  </div>
                </label>

                <label className="field">
                  <span className="label">Tối đa (lần giá thuê)</span>
                  <div style={{ display: "flex", gap: 0.1, alignItems: "center" }}>
                    <input
                      type="number"
                      step={0.1}
                      min={1.0}
                      max={5.0}
                      className="input"
                      value={maxRatio !== "" ? maxRatio : String(curMax)}
                      onChange={(e) => setMaxRatio(e.target.value)}
                      required
                    />
                    <span className="small muted" style={{ marginLeft: 6 }}>({Math.round(inputMax * 100)}%)</span>
                  </div>
                </label>
              </div>

              <label className="field">
                <span className="label">Lý do thay đổi</span>
                <input
                  className="input"
                  value={depositReason}
                  onChange={(e) => setDepositReason(e.target.value)}
                  maxLength={300}
                  placeholder="VD: Điều chỉnh khung cọc bảo đảm tài sản theo Nghị định 13"
                  required
                />
              </label>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingDeposit || !depositChanged}
                >
                  {savingDeposit ? "Đang lưu…" : "Lưu quy định tiền cọc"}
                </button>
              </div>
            </form>

            <div
              style={{
                padding: 16,
                background: "var(--bg-elevated, #f8fafc)",
                borderRadius: 8,
                border: "1px solid var(--border-subtle, #e2e8f0)",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>
                Bộ mô phỏng tính tiền cọc theo giá thuê
              </h4>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <span className="small muted">Giá thuê mẫu:</span>
                <input
                  type="number"
                  step={500_000}
                  min={3_000_000}
                  max={50_000_000}
                  className="input"
                  style={{ width: 160 }}
                  value={simRent}
                  onChange={(e) => setSimRent(Number(e.target.value))}
                />
                <span className="small bold">{simRent.toLocaleString("vi-VN")} đ/tháng</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <div style={{ padding: 10, background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <span className="muted xs">Cọc tối thiểu ({Math.round(inputMin * 100)}%)</span>
                  <div className="bold" style={{ fontSize: 15, marginTop: 4, color: "var(--emerald-600, #059669)" }}>
                    {Math.round(simRent * inputMin).toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div style={{ padding: 10, background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <span className="muted xs">Cọc mặc định ({Math.round(inputDef * 100)}%)</span>
                  <div className="bold" style={{ fontSize: 15, marginTop: 4, color: "var(--primary-600, #2563eb)" }}>
                    {Math.round(simRent * inputDef).toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div style={{ padding: 10, background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <span className="muted xs">Cọc tối đa ({Math.round(inputMax * 100)}%)</span>
                  <div className="bold" style={{ fontSize: 15, marginTop: 4, color: "var(--amber-600, #d97706)" }}>
                    {Math.round(simRent * inputMax).toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </div>
              <p className="xs muted" style={{ margin: "10px 0 0 0" }}>
                Khoản cọc giữ chỗ 2.000.000đ của khách sẽ chuyển 100% vào tiền cọc bảo đảm, tuyệt đối không trừ vào tiền thuê tháng đầu.
              </p>
            </div>
          </div>
        )}
      </Section>

      <Section title="Tham số nền tảng khác" description="Thay đổi tham số cần phê duyệt của ban điều hành.">
        <KeyValue
          items={[
            { label: "Tiền giữ chỗ VietQR", value: "2.000.000 đ" },
            { label: "Khung tiền cọc hợp đồng", value: `${Math.round(inputMin * 100)}% – ${Math.round(inputMax * 100)}% giá thuê tháng` },
            { label: "SLA nhận ca", value: "3 phút" },
            { label: "Open Pool bán kính", value: "500 m" },
            { label: "Báo trước thoát uỷ quyền", value: "15 ngày" },
            { label: "Ngưỡng Căn hời", value: "≥ 10%" },
            { label: "Ngưỡng OCR nhập tay", value: "< 85%" },
          ]}
        />
        <p className="small muted" style={{ marginTop: 12 }}>
          Thù lao và hoa hồng Field Host chỉnh được tại{" "}
          <Link href="/admin/commission" className="link">
            Biến phí Host
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
