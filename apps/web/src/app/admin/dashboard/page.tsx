import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const metadata = {
  title: "Admin Dashboard — VinStay AI",
};

export default async function AdminDashboardPage() {
  let userEmail = "admin@vinstay.vn";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) userEmail = user.email;
    } catch {
      // fallback
    }
  }

  const cookieStore = await cookies();
  const devUser = cookieStore.get("vinstay_dev_user")?.value;
  if (devUser) userEmail = devUser;

  return <AdminDashboardClient userEmail={userEmail} />;
}
