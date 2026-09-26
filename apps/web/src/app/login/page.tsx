import type { Metadata } from "next";
import { isRole, safeNext } from "@/lib/mock/auth";
import { LoginPicker } from "./LoginPicker";

export const metadata: Metadata = { title: "Đăng nhập demo" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string; next?: string }> }) {
  const { as, next } = await searchParams;
  return <LoginPicker preferred={isRole(as) ? as : undefined} next={safeNext(next)} />;
}
