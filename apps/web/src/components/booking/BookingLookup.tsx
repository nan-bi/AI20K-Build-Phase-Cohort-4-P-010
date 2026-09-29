"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSearch, ChevronRight } from "lucide-react";
import { STATUS_META } from "./status";
import { dayLabel, fmtTime } from "@/lib/mock/format";
import { bookingByRef } from "@/lib/mock/selectors";
import { accountPhone, ownsBooking, tenantBookings } from "@/lib/mock/selectors-tenant";
import { useMock } from "@/lib/mock/store";
import { unitAddress, unitById } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Booking.module.css";

export function BookingLookup() {
  const router = useRouter();
  const state = useMock();
  const now = useNow(60_000);
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  const phone = accountPhone(state);
  const mine = tenantBookings(state, phone);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = ref.trim().toUpperCase();
    const b = bookingByRef(state, cleanRef);
    if (!b || !ownsBooking(state, b)) {
      setError("Không tìm thấy lịch hẹn này trong tài khoản của bạn.");
      return;
    }
    router.push(`/booking/${b.ref}`);
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
          <button type="submit" className="btn btn-primary btn-lg btn-block">
            Mở lịch hẹn
          </button>
        </form>
      </div>

      <section className={styles.mine} aria-label="Lịch xem của tôi">
        <h2>Lịch xem của tôi</h2>
        {mine.length === 0 ? (
          <p className="muted">
            Bạn chưa có lịch xem nào trong tài khoản. <Link href="/units" className="link">Tìm căn để xem</Link>
          </p>
        ) : (
          <ul className={styles.list}>
            {mine.map((b) => {
              const u = unitById(b.unitId)!;
              const meta = STATUS_META[b.status];
              return (
                <li key={b.id}>
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
