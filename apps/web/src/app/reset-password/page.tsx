import type { Metadata } from "next";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { ResetPasswordForm } from "@/components/authui/ResetPasswordForm";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  return (
    <AuthLayout title="Đặt lại mật khẩu" description="Chọn một mật khẩu mới cho tài khoản của bạn.">
      <ResetPasswordForm hasToken={!!token} />
    </AuthLayout>
  );
}
