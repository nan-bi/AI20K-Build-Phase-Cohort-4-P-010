import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginTabs } from "./LoginTabs";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginTabs />
    </Suspense>
  );
}
