import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { HostDispatchClient } from "./HostDispatchClient";

export const metadata = {
  title: "Field Host Dispatch — VinStay AI",
};

export default async function HostDispatchPage() {
  let userEmail = "host.oceanpark@vinstay.vn";

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

  return <HostDispatchClient userEmail={userEmail} />;
}
