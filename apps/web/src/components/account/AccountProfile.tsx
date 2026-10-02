"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { accountApi } from "@/lib/apiClient";
import { refreshSession, useSession } from "@/lib/auth/client";
import { fmtDate, fmtPhone } from "@/lib/mock/format";
import { tenantLatestKyc } from "@/lib/mock/selectors-tenant";
import { setTenantProfile } from "@/lib/mock/actions";
import { useMock } from "@/lib/mock/store";

export function AccountProfile() {
  const state = useMock();
  const { user } = useSession();
  // SĐT chỉ có khi khách đã nhập và xác thực OTP Zalo (lúc đặt lịch xem). Chưa có thì để trống, không điền số giả.
  const phone = state.tenantProfile?.phone ?? "";
  const [name, setName] = useState(user?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    accountApi.getProfile().then((res) => {
      if (!res.ok || !res.data) return;
      if (res.data.fullName) setName(res.data.fullName);
      setPhoneVerified(Boolean(res.data.isPhoneVerified));
    });
  }, []);

  if (!state.ready) return <div className="skeleton" style={{ height: 320 }} />;

  const kyc = phone ? tenantLatestKyc(state, phone) : undefined;
  const email = user?.email ?? "";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fullName = name.trim();
    if (!fullName) return;
    setSaving(true);
    const res = await accountApi.updateProfile({ fullName });
    setSaving(false);
    if (!res.ok) return toast("Không lưu được thay đổi. Thử lại sau.");
    if (phone) setTenantProfile({ name: fullName, phone }); // giữ tên mặc định khi đặt lịch ở bản mock
    await refreshSession();
    toast("Đã lưu thay đổi", "success");
  };

  return (
    <div>
      <PageHeader title="Hồ sơ của bạn" description="Thông tin dùng để đặt lịch xem và ký hợp đồng." />

      <Section title="Thông tin cá nhân">
        <form className="stack" onSubmit={onSubmit}>
          <Field label="Họ tên">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </Field>
          <Field
            label="Số điện thoại"
            hint={phone ? undefined : "Bạn sẽ nhập và xác thực số (OTP Zalo) ở lần đặt lịch xem đầu tiên."}
          >
            <div className="row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input className="input" value={phone ? fmtPhone(phone) : ""} placeholder="Chưa có số điện thoại" disabled />
              {phone && (
                <StatusBadge tone={phoneVerified ? "ok" : "warn"}>{phoneVerified ? "Đã xác thực Zalo" : "Chưa xác thực"}</StatusBadge>
              )}
            </div>
          </Field>
          <Field label="Email" hint="Email đăng nhập, không thể thay đổi.">
            <input className="input" type="email" value={email} disabled />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </form>
      </Section>

      <Section title="Xác minh danh tính" description="Áp dụng khi bạn đặt cọc giữ chỗ căn hộ.">
        {kyc ? (
          <p>
            <StatusBadge tone="ok">Đã xác minh CCCD ngày {fmtDate(kyc.verifiedAt)}</StatusBadge>
          </p>
        ) : (
          <p>
            <StatusBadge tone="neutral">Chưa xác minh — sẽ làm khi đặt cọc</StatusBadge>
          </p>
        )}
      </Section>
    </div>
  );
}
