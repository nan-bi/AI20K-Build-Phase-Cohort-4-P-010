# Digest: supabase

## Files
- backend/src/supabase/supabase.module.ts (9 dòng)
- backend/src/supabase/supabase.service.ts (125 dòng)
## Controller (route -> handler; guard)
- không có
## Service
#### supabase.service.ts
- Public method: L43 `getClient(): SupabaseClient`; L48 `isConfigured(): boolean`; L59 `async verifyJwtToken(token: string): Promise<User | null>`; L74 `signInWithPassword(email: string, password: string)`; L78 `signUp(email: string, password: string, options: { fullName: string; emailRedirectTo: string })`; L86 `refreshSession(refreshToken: string)`; L91 `async signOut(accessToken: string): Promise<void>`; L101 `createUser(params: { email: string; password: string; emailConfirm?: boolean })`; L109 `async deleteUser(userId: string): Promise<void>`; L115 `async uploadFile(bucket: string, path: string, fileBuffer: Buffer, contentType: string)`; L122 `async getSignedUrl(bucket: string, path: string, expiresIn = 3600)`
- $transaction: KHÔNG
- Gọi ngoài: supabase.co@L7, supabaseUrl.includes@L27, supabaseClient.auth@L61, supabaseClient.auth@L93, supabaseClient.auth@L102, supabaseClient.auth@L110, supabaseClient.storage@L116, supabaseClient.storage@L123
- Import thư viện ngoài (ngoài @nestjs): @supabase/supabase-js
- Dấu mock/TODO: L7: const MOCK_URL = 'https://mock.supabase.co';
## DTO (field: kiểu [validator])
- không có
## File khác
- supabase.module.ts (export): SupabaseModule
