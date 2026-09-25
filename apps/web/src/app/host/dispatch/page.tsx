import { SignOutButton } from "@/components/auth/SignOutButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Route protection: src/middleware.ts already redirects unauthenticated
// requests to /host/login and blocks non-host roles with 403. Real
// dispatch/ticket UI (docs/UI_FLOW_SPEC.md §4) is a later phase.
export default async function HostDispatchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 640, margin: "40px auto" }}>
      <h1>Field Host — Dispatch</h1>
      <p>Đăng nhập: {user?.email}</p>
      <p style={{ color: "#666" }}>Placeholder — danh sách ticket thuộc phase nghiệp vụ tiếp theo.</p>
      <SignOutButton redirectTo="/admin/login" />
    </main>
  );
}
