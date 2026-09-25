/**
 * Helper to check if Supabase is properly configured in environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anon && !url.includes("mock-") && url.startsWith("http"));
}

/**
 * Small helper so a missing env var provides a safe dev fallback or fails loudly in prod.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (name === "NEXT_PUBLIC_SUPABASE_URL") return "https://mock-dev.supabase.co";
    if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") return "mock-dev-anon-key";
    if (name === "SUPABASE_SERVICE_ROLE_KEY") return "mock-dev-service-role-key";
    if (name === "OTP_TOKEN_SECRET") return "local-dev-otp-secret-CHANGE-IN-PROD";
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const supabaseUrl = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const supabaseServiceRoleKey = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY");

