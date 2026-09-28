import Link from "next/link";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { RegisterForm } from "@/components/authui/RegisterForm";

export const metadata: Metadata = { title: "Đăng ký" };

interface RegisterPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { role } = await searchParams;
  const initialRole = role === "landlord" ? "landlord" : role === "tenant" ? "tenant" : undefined;
  return (
    <AuthLayout
      title="Tạo tài khoản"
      description="Vài bước để bắt đầu dùng VinStay."
      footer={
        <p className="small muted">
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      }
    >
      <RegisterForm initialRole={initialRole} />
    </AuthLayout>
  );
}
