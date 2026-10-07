"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";
import { tenantApi, errorText } from "@/lib/tenant/api";

/** DEMO (xoá khi có webhook ngân hàng thật): giả lập ngân hàng báo có cọc. Chỉ hiện khi NEXT_PUBLIC_DEMO_TOOLS=true. */
export function DemoPayButton({ refCode, onDone }: { refCode: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (process.env.NEXT_PUBLIC_DEMO_TOOLS !== "true") return null;

  async function pay() {
    setBusy(true);
    const res = await tenantApi.demoPayDeposit(refCode);
    setBusy(false);
    if (!res.ok) return toast(errorText(res));
    toast("Đã giả lập ngân hàng báo có", "success");
    onDone();
  }

  return (
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={pay}>
        {busy ? "Đang xử lý..." : "Demo: giả lập đã chuyển khoản 2.000.000đ"}
      </button>
    </div>
  );
}
