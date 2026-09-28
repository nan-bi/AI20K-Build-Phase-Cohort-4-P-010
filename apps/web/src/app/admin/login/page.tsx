import type { Metadata } from "next";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { AdminPortalTabs } from "@/components/authui/AdminPortalTabs";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

interface AdminLoginPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { tab } = await searchParams;
  return (
    <AuthLayout aside="internal" title="Đăng nhập quản trị" description="Chọn vai trò của bạn: Sale nội khu hoặc Quản trị nền tảng.">
      <AdminPortalTabs initialTab={tab === "admin" ? "admin" : undefined} />
    </AuthLayout>
  );
}
