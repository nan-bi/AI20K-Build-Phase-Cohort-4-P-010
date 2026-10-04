"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries, invalidateTenantTerms } from "@/lib/tenant/queries";
import { tenantApi, errorText } from "@/lib/tenant/api";
import type { TenantBooking } from "@/lib/tenant/types";
import { toast } from "@/components/ui/Toast";

interface DepositTermsBoxProps {
  refCode: string;
  unitCode: string;
  onSuccess: (booking: TenantBooking) => void;
}

export function DepositTermsBox({
  refCode,
  unitCode,
  onSuccess,
}: DepositTermsBoxProps) {
  const { state: termsState, reload: refetch } = useApiQuery(
    tenantQueries.depositTerms(unitCode),
  );

  const [consent, setConsent] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (termsState.status === "loading") {
    return (
      <div className="card skeleton" style={{ height: 260, padding: 18 }} />
    );
  }

  if (termsState.status === "error" || termsState.status !== "ready") {
    return (
      <div
        className="card"
        style={{
          padding: 18,
          background: "var(--surface)",
          border: "1px solid var(--danger)",
        }}
      >
        <p style={{ color: "var(--danger)", margin: "0 0 10px" }}>
          {termsState.status === "error" ? termsState.message : "Không thể tải điều khoản cọc."}
        </p>
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => refetch()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const terms = termsState.data;

  const items = terms.items || [];
  const houseRules = terms.houseRules || [];

  const handleAccept = async () => {
    if (!consent || submitting) return;
    setSubmitting(true);

    const res = await tenantApi.acceptDeposit(refCode, terms.version);
    setSubmitting(false);

    if (res.ok && res.data) {
      toast(
        "Đã đồng ý điều khoản cọc, vui lòng quét VietQR để chuyển tiền giữ chỗ.",
        "success",
      );
      onSuccess(res.data);
    } else {
      if (res.code === "terms_version_stale") {
        invalidateTenantTerms(unitCode);
        setConsent(false);
        await refetch();
      }
      toast(
        errorText(res, "Không thể xác nhận điều khoản cọc. Vui lòng thử lại."),
      );
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 18,
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--r)",
        marginTop: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <ShieldCheck size={22} style={{ color: "var(--kelp)" }} />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          Điều khoản đặt cọc giữ căn ({terms.holdHours} giờ)
        </h3>
      </div>

      <ul
        style={{
          paddingLeft: 20,
          margin: "0 0 14px",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--ink)",
        }}
      >
        {items.map((it) => (
          <li key={it.id}>
            {it.text}{" "}
            {it.source && (
              <span className="muted xs">({it.source})</span>
            )}
          </li>
        ))}
      </ul>

      {houseRules.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => setShowRules((prev) => !prev)}
            style={{ padding: "4px 8px", fontSize: 13 }}
          >
            {showRules
              ? "Ẩn nội quy căn hộ"
              : `Xem ${houseRules.length} nội quy căn hộ`}
          </button>
          {showRules && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                background: "var(--paper-2)",
                borderRadius: "var(--r)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                {houseRules.map((rule) => (
                  <li key={rule.id} style={{ marginBottom: 8 }}>
                    <b>{rule.title}:</b> {rule.body}{" "}
                    {rule.source && (
                      <span className="muted xs">({rule.source})</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "10px 12px",
          background: "var(--paper-2)",
          borderRadius: "var(--r)",
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1.45,
          marginBottom: 14,
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>{terms.consentLabel}</span>
      </label>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={!consent || submitting}
        onClick={handleAccept}
      >
        <Check size={18} />{" "}
        {submitting ? "Đang xử lý..." : "Đồng ý và lấy mã VietQR"}
      </button>
    </div>
  );
}
