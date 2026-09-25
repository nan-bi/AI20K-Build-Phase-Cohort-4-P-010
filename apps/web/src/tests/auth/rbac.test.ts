import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/auth/role";

function fakeUser(appMetadata: Record<string, unknown>): User {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    app_metadata: appMetadata,
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

describe("roleFromUser", () => {
  it("reads the user_role claim stamped by the custom access token hook", () => {
    const user = fakeUser({ user_role: "admin" });
    expect(roleFromUser(user)).toBe("admin");
  });

  it("returns undefined when no role claim is present", () => {
    const user = fakeUser({});
    expect(roleFromUser(user)).toBeUndefined();
  });

  it("returns undefined for a non-string role claim", () => {
    const user = fakeUser({ user_role: 123 });
    expect(roleFromUser(user)).toBeUndefined();
  });

  it("recognizes each of the 4 roles", () => {
    for (const role of ["tenant", "host", "landlord", "admin"]) {
      expect(roleFromUser(fakeUser({ user_role: role }))).toBe(role);
    }
  });
});
