import type { Metadata } from "next";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { ForgotPasswordForm } from "@/components/authui/ForgotPasswordForm";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Quên mật khẩu" description="Nhập email hoặc số điện thoại để nhận mã xác thực.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
