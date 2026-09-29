import Link from "next/link";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { RegisterForm } from "@/components/authui/RegisterForm";
import { safeNext } from "@/lib/mock/auth";

export const metadata: Metadata = { title: "Đăng ký" };

interface RegisterPageProps {
  searchParams: Promise<{ role?: string; next?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { role, next } = await searchParams;
  const initialRole = role === "landlord" ? "landlord" : role === "tenant" ? "tenant" : undefined;
  const targetNext = safeNext(next);
  return (
    <AuthLayout
      title="Tạo tài khoản"
      description="Vài bước để bắt đầu dùng VinStay."
      footer={
        <p className="small muted">
          Đã có tài khoản? <Link href={targetNext ? `/login?next=${encodeURIComponent(targetNext)}` : "/login"}>Đăng nhập</Link>
        </p>
      }
    >
      <RegisterForm initialRole={initialRole} next={targetNext} />
    </AuthLayout>
  );
}
