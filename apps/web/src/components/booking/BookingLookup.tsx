"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSearch, ChevronRight } from "lucide-react";
import { STATUS_META } from "./status";
import { dayLabel, fmtTime } from "@/lib/mock/format";
import { useNow } from "@/lib/useNow";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { tenantApi } from "@/lib/tenant/api";
import { toUnit } from "@/lib/tenant/adapters";
import { unitAddress } from "@/lib/mock/units";
import styles from "./Booking.module.css";

export function BookingLookup() {
  const router = useRouter();
  const now = useNow(60_000);
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A7: Danh sách lịch xem của tôi từ backend
  const { state: bookingsState } = useApiQuery(tenantQueries.bookings());
  const mine = bookingsState.status === "ready" ? bookingsState.data : [];
  const isLoading = bookingsState.status === "loading";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = ref.trim().toUpperCase();
    if (!cleanRef) return;
    setSubmitting(true);
    setError("");

    const res = await tenantApi.bookingByRef(cleanRef);
    setSubmitting(false);

    if (!res.ok || !res.data) {
      setError("Không tìm thấy lịch hẹn này trong tài khoản của bạn.");
      return;
    }
    router.push(`/booking/${res.data.ref}`);
  };

  return (
    <div className={`wrap ${styles.lookup}`}>
      <div className={styles.lookupMain}>
        <span className={styles.lookupIcon}>
          <CalendarSearch size={26} />
        </span>
        <h1 className={styles.h1}>Kiểm tra lịch xem phòng</h1>
        <p className="muted">Xem danh sách lịch hẹn của bạn hoặc mở nhanh bằng mã lịch hẹn.</p>

        <form className={`card ${styles.form}`} onSubmit={submit} noValidate>
          <label className="field">
            <span className="label">Mã lịch hẹn</span>
            <input
              className="input"
              placeholder="VS-XXXXX"
              value={ref}
              onChange={(e) => {
                setRef(e.target.value.toUpperCase());
                if (error) setError("");
              }}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? "Đang kiểm tra..." : "Mở lịch hẹn"}
          </button>
        </form>
      </div>

      <section className={styles.mine} aria-label="Lịch xem của tôi">
        <h2>Lịch xem của tôi</h2>
        {isLoading ? (
          <div className="skeleton" style={{ height: 120 }} />
        ) : mine.length === 0 ? (
          <p className="muted">
            Bạn chưa có lịch xem nào trong tài khoản. <Link href="/units" className="link">Tìm căn để xem</Link>
          </p>
        ) : (
          <ul className={styles.list}>
            {mine.map((b) => {
              const u = toUnit(b.unit);
              const meta = STATUS_META[b.status];
              return (
                <li key={b.ref}>
                  <Link href={`/booking/${b.ref}`} className={styles.row}>
                    <div>
                      <b>{unitAddress(u)}</b>
                      <p className="muted small">
                        {b.ref} · {fmtTime(b.slot)} {now ? dayLabel(b.slot, now).toLowerCase() : ""}
                      </p>
                    </div>
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    <ChevronRight size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
