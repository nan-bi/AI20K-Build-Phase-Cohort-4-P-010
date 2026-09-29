import Link from "next/link";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { DEMO_USERS } from "@/lib/mock/auth";
import styles from "./Admin.module.css";

/** Cài đặt: tài khoản quản trị và tham số nền tảng — chỉ hiển thị, không chỉnh sửa được ở đây. */
export function AdminSettings() {
  const admin = DEMO_USERS.admin;
  return (
    <div className={styles.page}>
      <PageHeader title="Cài đặt" description="Tài khoản quản trị và các tham số vận hành nền tảng." />

      <Section title="Tài khoản quản trị">
        <KeyValue
          items={[
            { label: "Họ và tên", value: admin.name },
            { label: "Email", value: "ops@vinstay.vn" },
            { label: "Vai trò", value: "Trưởng vận hành" },
          ]}
        />
      </Section>

      <Section title="Tham số nền tảng" description="Thay đổi tham số cần phê duyệt của ban điều hành.">
        <KeyValue
          items={[
            { label: "Tiền giữ chỗ", value: "2.000.000 đ" },
            { label: "Thời gian giữ chỗ", value: "7 ngày" },
            { label: "SLA nhận ca", value: "3 phút" },
            { label: "Open Pool bán kính", value: "500 m" },
            { label: "Báo trước thoát uỷ quyền", value: "15 ngày" },
            { label: "Ngưỡng Căn hời", value: "≥ 10%" },
            { label: "Ngưỡng OCR nhập tay", value: "< 85%" },
          ]}
        />
        <p className="small muted" style={{ marginTop: 12 }}>
          Thù lao và hoa hồng Field Host chỉnh được tại{" "}
          <Link href="/admin/commission" className="link">
            Biến phí Host
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
