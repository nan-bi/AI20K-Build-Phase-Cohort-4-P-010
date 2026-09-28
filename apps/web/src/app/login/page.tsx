import Link from "next/link";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { LoginForm } from "@/components/authui/LoginForm";
import { safeNext } from "@/lib/mock/auth";

export const metadata: Metadata = { title: "Đăng nhập" };

interface LoginPageProps {
  searchParams: Promise<{ as?: string; next?: string; tab?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { as, next, tab } = await searchParams;
  return (
    <AuthLayout
      title="Đăng nhập VinStay"
      description="Dùng email hoặc số điện thoại đã đăng ký."
      footer={
        <p className="small muted">
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
      }
    >
      <LoginForm as={as} next={safeNext(next)} initialTab={tab === "landlord" ? "landlord" : undefined} />
    </AuthLayout>
  );
}
