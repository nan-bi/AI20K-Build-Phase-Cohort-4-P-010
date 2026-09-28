"use client";

import Link from "next/link";
import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDate, fmtPhone } from "@/lib/mock/format";
import { tenantLatestKyc } from "@/lib/mock/selectors-tenant";
import { setTenantProfile } from "@/lib/mock/actions";
import { useMock } from "@/lib/mock/store";

export function AccountProfile() {
  const state = useMock();
  const profile = state.tenantProfile ?? { name: DEMO_USERS.tenant.name, phone: DEMO_USERS.tenant.phone! };
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState("");

  if (!state.ready) return <div className="skeleton" style={{ height: 320 }} />;

  const kyc = tenantLatestKyc(state, profile.phone);

  return (
    <div>
      <PageHeader title="Hồ sơ của bạn" description="Thông tin dùng để đặt lịch xem và ký hợp đồng." />

      <Section title="Thông tin cá nhân">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setTenantProfile({ name: name.trim() || profile.name, phone: profile.phone });
            toast("Đã lưu thay đổi", "success");
          }}
        >
          <Field label="Họ tên">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Số điện thoại">
            <div className="row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input className="input" value={fmtPhone(profile.phone)} disabled />
              <StatusBadge tone="ok">Đã xác thực Zalo</StatusBadge>
            </div>
          </Field>
          <Field label="Email" hint="Chỉ hiển thị trong phiên demo này">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@vidu.com" />
          </Field>
          <button type="submit" className="btn btn-primary">
            Lưu thay đổi
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

      <Section title="Bảo mật">
        <Link href="/forgot-password" className="btn btn-quiet">
          Đổi mật khẩu
        </Link>
      </Section>
    </div>
  );
}
