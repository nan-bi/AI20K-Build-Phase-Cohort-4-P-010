"use client";

import { ShieldCheck } from "lucide-react";
import type { TenantContract } from "@/lib/tenant/types";

export interface KycCaptureProps {
  refCode: string;
  contactName: string;
  minLeaseMonths?: number;
  onSuccess: (contract: TenantContract) => void;
  onCancel?: () => void;
}

/** eKYC thật chưa được cấu hình ở backend; không thu thập ảnh/CCCD khi chưa có nhà cung cấp xử lý. */
export function KycCapture({ onCancel }: KycCaptureProps) {
  return (
    <section className="card" style={{ padding: 20 }} aria-labelledby="ekyc-unavailable-title">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h2 id="ekyc-unavailable-title">Xác minh danh tính chưa khả dụng</h2>
          <p className="muted small">Backend chưa kết nối nhà cung cấp eKYC thật. Hệ thống không tạo kết quả xác minh mô phỏng và hiện chưa thể lập hợp đồng thuê.</p>
        </div>
      </div>
      {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Quay lại</button>}
    </section>
  );
}
