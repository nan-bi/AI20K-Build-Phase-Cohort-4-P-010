import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLoginTabs } from "./AdminLoginTabs";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginTabs />
    </Suspense>
  );
}
