import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

// Route protection: src/middleware.ts already redirects unauthenticated
// requests to /admin/login and blocks non-admin roles with 403 before this
// page renders — this is a placeholder for the real BI dashboard
// (docs/UI_FLOW_SPEC.md §5), out of scope for the auth phase.
export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 480, margin: "64px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Admin Dashboard</h1>
      <p style={{ marginTop: 8, color: "var(--slate)" }}>Đăng nhập: {user?.email}</p>
      <p style={{ marginTop: 16, color: "var(--slate)", fontSize: "0.9rem" }}>
        Placeholder — BI dashboard / inventory / dispatch monitor / commission engine
        thuộc phase nghiệp vụ tiếp theo.
      </p>
      <SignOutButton redirectTo="/admin/login" />
    </main>
  );
}
