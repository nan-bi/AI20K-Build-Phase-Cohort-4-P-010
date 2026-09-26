"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage, postJson } from "./authApi";
import styles from "./auth.module.css";

export function RfidVerifyStep({ hostId, onDone: _onDone }: { hostId: string; onDone: () => void }) {
  const router = useRouter();
  const [rfid, setRfid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { ok, code } = await postJson("/auth/verify-rfid", { hostId, rfid });
      if (!ok) {
        setError(errorMessage(code));
        return;
      }
      router.push("/host/dispatch");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className={styles.cardHeading}>Xác nhận mã RFID</h1>
      <p className={styles.cardHelp}>
        Nhập mã thẻ RFID mà Admin đã cấp cho bạn để hoàn tất đăng nhập.
      </p>
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          Mã RFID
          <input
            className={styles.input}
            type="text"
            required
            autoFocus
            value={rfid}
            onChange={(e) => setRfid(e.target.value)}
            placeholder="Ví dụ: RFID-S1-0001"
          />
        </label>
        <button type="submit" className={styles.primaryButton} disabled={loading}>
          Xác nhận
        </button>
      </form>
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
