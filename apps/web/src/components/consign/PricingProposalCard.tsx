"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { vnd } from "@/lib/format";
import { landlordApi } from "@/lib/landlord/api";
import { pricingDecisionOutcome, pricingDiff } from "@/lib/landlord/pricing";
import type { PricingProposal } from "@/lib/landlord/types";
import styles from "./Consign.module.css";

interface Props {
  consignmentId: string;
  proposal: PricingProposal;
  /** Gọi khi cần tải lại hồ sơ (đồng ý xong, hoặc 409). */
  onReload: () => void;
}

const signed = (n: number) => `${n > 0 ? "+" : "−"}${vnd(Math.abs(n))}đ`;

/** Thẻ so sánh 2 cột "Bạn khai" / "Thẩm định đề xuất" + 2 nút quyết định (Q1 = b: không đồng ý ⇒ đóng hồ sơ). */
export function PricingProposalCard({ consignmentId, proposal, onReload }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const diff = pricingDiff(proposal);

  async function decide(decision: "accept" | "decline") {
    if (busy) return;
    setBusy(decision);
    const res = await landlordApi.decidePricing(consignmentId, decision);
    setBusy(null);
    setConfirmDecline(false);
    const out = pricingDecisionOutcome(res);
    if (out.kind === "done") {
      toast(decision === "accept" ? "Đã đồng ý giá mới — căn đã được niêm yết." : "Đã đóng hồ sơ ký gửi.", "success");
      onReload();
    } else if (out.kind === "reload") {
      toast(out.message, "info");
      onReload();
    } else if (out.kind === "leave") {
      toast(out.message);
      router.push("/landlord/units");
    } else {
      toast(out.message);
    }
  }

  return (
    <section className="card" aria-labelledby="pricing-proposal" style={{ borderColor: "var(--amber)" }}>
      <h2 id="pricing-proposal" style={{ margin: 0, fontSize: "var(--fs-17)" }}>
        Thẩm định đề xuất giá khác bạn khai
      </h2>
      <p className="small muted" style={{ margin: "var(--s-1) 0 var(--s-3)" }}>
        Căn chỉ được đăng khi bạn đồng ý giá mới. Nếu không đồng ý, hồ sơ ký gửi này sẽ đóng lại.
      </p>

      <div className={styles.compareGrid}>
        <div className={styles.compareCol}>
          <p className={styles.compareHead}>Bạn khai</p>
          <div className={styles.compareRow}>
            <span>Giá thuê</span>
            <b>{vnd(proposal.original.rent)}đ</b>
          </div>
          <div className={styles.compareRow}>
            <span>Tiền cọc bảo đảm</span>
            <b>{vnd(proposal.original.securityDeposit)}đ</b>
          </div>
        </div>
        <div className={`${styles.compareCol} ${styles.compareColNew}`}>
          <p className={styles.compareHead}>Thẩm định đề xuất</p>
          <div className={styles.compareRow}>
            <span>Giá thuê</span>
            <b>{vnd(proposal.rent)}đ</b>
          </div>
          {diff.rentChanged && <span className={styles.delta}>{signed(diff.rentDelta)}/tháng so với bạn khai</span>}
          <div className={styles.compareRow}>
            <span>Tiền cọc bảo đảm</span>
            <b>{vnd(proposal.securityDeposit)}đ</b>
          </div>
          {diff.depositChanged && <span className={styles.delta}>{signed(diff.depositDelta)} so với bạn khai</span>}
        </div>
      </div>

      {proposal.reason && (
        <p style={{ margin: "var(--s-3) 0 0", fontSize: "var(--fs-14)" }}>
          <b>Lý do của thẩm định viên:</b> {proposal.reason}
        </p>
      )}

      <div className={styles.proposalActions}>
        <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void decide("accept")}>
          {busy === "accept" ? "Đang gửi…" : "Đồng ý giá mới"}
        </button>
        <button type="button" className="btn btn-quiet" disabled={busy !== null} onClick={() => setConfirmDecline(true)}>
          Không đồng ý — đóng hồ sơ
        </button>
      </div>

      <Modal
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        title="Không đồng ý giá đề xuất?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDecline(false)} disabled={busy !== null}>
              Quay lại
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void decide("decline")} disabled={busy !== null}>
              {busy === "decline" ? "Đang gửi…" : "Đóng hồ sơ"}
            </button>
          </>
        }
      >
        <p style={{ margin: 0 }}>Căn sẽ không được đăng và hồ sơ ký gửi này đóng lại.</p>
      </Modal>
    </section>
  );
}
