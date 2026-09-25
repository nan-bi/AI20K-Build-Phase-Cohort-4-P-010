import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLoginTabs } from "./AdminLoginTabs";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị — VinStay AI",
};

// useSearchParams() (used to read ?error=... from the OAuth callback) opts
// this route out of static prerendering unless wrapped in Suspense.
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginTabs />
    </Suspense>
  );
}
