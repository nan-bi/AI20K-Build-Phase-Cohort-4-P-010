import { SignOutButton } from "@/components/auth/SignOutButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Route protection: src/middleware.ts already redirects unauthenticated
// requests to /landlord/login and blocks non-landlord roles with 403. Real
// dashboard UI (docs/UI_FLOW_SPEC.md §3) is a later phase.
export default async function LandlordDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 640, margin: "40px auto" }}>
      <h1>Landlord Dashboard</h1>
      <p>Đăng nhập: {user?.email}</p>
      <p style={{ color: "#666" }}>
        Placeholder — trạng thái căn hộ / audit trail / yêu cầu thoát ủy quyền thuộc phase
        nghiệp vụ tiếp theo.
      </p>
      <SignOutButton redirectTo="/login?tab=landlord" />
    </main>
  );
}
