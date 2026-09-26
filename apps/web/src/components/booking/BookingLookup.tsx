"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSearch, ChevronRight } from "lucide-react";
import { STATUS_META } from "./status";
import { dayLabel, fmtPhone, fmtTime, isValidVnPhone, normalizePhone } from "@/lib/mock/format";
import { bookingByRef, bookingsOfPhone } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { TENANT_DEMO } from "@/lib/mock/seed";
import { unitAddress, unitById } from "@/lib/mock/units";
import { useDemoUser } from "@/lib/mock/useRole";
import { useNow } from "@/lib/useNow";
import styles from "./Booking.module.css";

export function BookingLookup() {
  const router = useRouter();
  const state = useMock();
  const user = useDemoUser();
  const now = useNow(60_000);
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const myPhone = state.tenantProfile?.phone ?? (user?.role === "tenant" ? user.phone : undefined);
  const mine = myPhone ? bookingsOfPhone(state, normalizePhone(myPhone)).sort((a, b) => b.slot.localeCompare(a.slot)) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = bookingByRef(state, ref);
    if (!isValidVnPhone(phone) || !b || b.tenant.phone !== normalizePhone(phone)) {
      setError("Không tìm thấy lịch hẹn khớp mã và số điện thoại này. Kiểm tra lại tin Zalo xác nhận của bạn.");
      return;
    }
    router.push(`/booking/${b.ref}?phone=${b.tenant.phone}`);
  };

  return (
    <div className={`wrap ${styles.lookup}`}>
      <div className={styles.lookupMain}>
        <span className={styles.lookupIcon}>
          <CalendarSearch size={26} />
        </span>
        <h1 className={styles.h1}>Kiểm tra lịch xem phòng</h1>
        <p className="muted">Nhập mã lịch hẹn trong tin Zalo và số điện thoại đã đặt. Không cần tài khoản.</p>

        <form className={`card ${styles.form}`} onSubmit={submit} noValidate>
          <label className="field">
            <span className="label">Mã lịch hẹn</span>
            <input className="input" placeholder="VS-XXXXX" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" />
          </label>
          <label className="field">
            <span className="label">Số điện thoại đã đặt lịch</span>
            <input className="input" type="tel" inputMode="tel" placeholder="0912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg btn-block">
            Xem trạng thái
          </button>
          <p className="muted xs">
            Thử nhanh với lịch mẫu:{" "}
            <button type="button" className="link" onClick={() => { setRef("VS-4F7K2"); setPhone(TENANT_DEMO.phone); setError(""); }}>
              VS-4F7K2 · {fmtPhone(TENANT_DEMO.phone)}
            </button>
          </p>
        </form>
      </div>

      <section className={styles.mine} aria-label="Lịch hẹn trên thiết bị này">
        <h2>Lịch hẹn trên thiết bị này</h2>
        {mine.length === 0 ? (
          <p className="muted">Bạn chưa đặt lịch nào. <Link href="/units" className="link">Tìm căn để xem</Link></p>
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
