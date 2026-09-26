import type { Session, User } from '@supabase/supabase-js';

export function fakeSupabaseUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'user@example.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as User;
}

export function fakeSession(user: User = fakeSupabaseUser(), overrides: Partial<Session> = {}): Session {
  return {
    access_token: `access-${user.id}`,
    refresh_token: `refresh-${user.id}`,
    expires_in: 3600,
    token_type: 'bearer',
    user,
    ...overrides,
  } as Session;
}

/** SupabaseService giả: mỗi method là jest.fn để test đặt kết quả từng ca. */
export function createFakeSupabase() {
  return {
    isConfigured: jest.fn(() => true),
    verifyJwtToken: jest.fn(async (_token: string): Promise<User | null> => null),
    signInWithPassword: jest.fn(async (_email: string, _password: string): Promise<any> => ({
      data: { session: null, user: null },
      error: { name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
    })),
    signUp: jest.fn(
      async (_email: string, _password: string, _options: { fullName: string; emailRedirectTo: string }): Promise<any> => ({
        data: { user: fakeSupabaseUser(), session: null },
        error: null,
      }),
    ),
    refreshSession: jest.fn(async (_refreshToken: string): Promise<any> => ({
      data: { session: null, user: null },
      error: { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found', message: 'nope' },
    })),
    signOut: jest.fn(async () => undefined),
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
