import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthException } from '../../modules/auth/auth.errors';
import { SessionCookieService } from '../../modules/auth/session/session-cookies.service';
import { AuthenticatedUser } from '../../modules/auth/session/authenticated-user';
import { fakeConfig } from '../../modules/auth/testing/fake-config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { HOST_ROLES_KEY } from '../decorators/host-roles.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'u1',
  email: 'u@example.com',
  fullName: null,
  role: 'tenant',
  portal: 'tenant',
  isPhoneVerified: false,
  isHostVerified: false,
  hostRoles: [],
  ...overrides,
});

function context(request: Record<string, unknown>, metadata: Record<string, unknown> = {}) {
  const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { reflector, ctx };
}

const codeOf = async (promise: Promise<unknown> | (() => unknown)) => {
  try {
    await (typeof promise === 'function' ? promise() : promise);
    return 'no-error';
  } catch (err) {
    return err instanceof AuthException ? err.code : `other:${(err as Error).message}`;
  }
};

describe('SupabaseAuthGuard', () => {
  const build = (env: Record<string, string>, metadata: Record<string, unknown>, authenticate = jest.fn()) => {
    const config = fakeConfig(env);
    return { authenticate, make: (reflector: Reflector) => new SupabaseAuthGuard(reflector, { authenticate } as any, new SessionCookieService(config), config) };
  };

  it('route @Public không cần token', async () => {
    const { reflector, ctx } = context({ headers: {} }, { [IS_PUBLIC_KEY]: true });
    const { make, authenticate } = build({}, {});
    expect(await make(reflector).canActivate(ctx)).toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('thiếu token → 401 unauthorized', async () => {
    const { reflector, ctx } = context({ headers: {}, cookies: {} });
    expect(await codeOf(build({}, {}).make(reflector).canActivate(ctx))).toBe('unauthorized');
  });

  it('nhận token từ cookie hoặc Bearer (Bearer ưu tiên) và gắn request.user', async () => {
    const authenticate = jest.fn(async () => user());

    const viaCookie: any = { headers: {}, cookies: { vs_access: 'cookie-token' } };
    let { reflector, ctx } = context(viaCookie);
    await build({}, {}, authenticate).make(reflector).canActivate(ctx);
    expect(authenticate).toHaveBeenLastCalledWith('cookie-token');
    expect(viaCookie.user).toMatchObject({ id: 'u1' });

    const viaBearer: any = { headers: { authorization: 'Bearer header-token' }, cookies: { vs_access: 'cookie-token' } };
    ({ reflector, ctx } = context(viaBearer));
    await build({}, {}, authenticate).make(reflector).canActivate(ctx);
    expect(authenticate).toHaveBeenLastCalledWith('header-token');
  });

  it('token không hợp lệ → 401', async () => {
    const { reflector, ctx } = context({ headers: { authorization: 'Bearer nope' }, cookies: {} });
    expect(await codeOf(build({}, {}, jest.fn(async () => null)).make(reflector).canActivate(ctx))).toBe('unauthorized');
  });

  describe('header x-demo-role', () => {
    const request = () => ({ headers: { 'x-demo-role': 'ops_admin' }, cookies: {} }) as any;

    it('tắt mặc định', async () => {
      const { reflector, ctx } = context(request());
      expect(await codeOf(build({}, {}).make(reflector).canActivate(ctx))).toBe('unauthorized');
    });

    it('bật bằng AUTH_DEMO_MODE=true', async () => {
      const req = request();
      const { reflector, ctx } = context(req);
      expect(await build({ AUTH_DEMO_MODE: 'true' }, {}).make(reflector).canActivate(ctx)).toBe(true);
      expect(req.user).toMatchObject({ role: 'ops_admin', portal: 'admin' });
    });

    it('bị vô hiệu ở production dù cờ bật', async () => {
      const { reflector, ctx } = context(request());
      expect(await codeOf(build({ AUTH_DEMO_MODE: 'true', NODE_ENV: 'production' }, {}).make(reflector).canActivate(ctx))).toBe('unauthorized');
    });
  });
});

describe('RolesGuard', () => {
  const run = (roles: string[] | undefined, current: AuthenticatedUser | undefined) => {
    const { reflector, ctx } = context({ user: current }, roles ? { [ROLES_KEY]: roles } : {});
    return () => new RolesGuard(reflector).canActivate(ctx);
  };

  it('route không yêu cầu vai trò → cho qua', () => {
    expect(run(undefined, undefined)()).toBe(true);
  });

  it('đúng vai trò → cho qua; sai vai trò → 403', () => {
    expect(run(['ops_admin'], user({ role: 'ops_admin' }))()).toBe(true);
    expect(() => run(['ops_admin'], user({ role: 'tenant' }))()).toThrow(/ops_admin/);
  });

  it('chưa có Profile (role null) → 403', () => {
    expect(() => run(['tenant'], user({ role: null }))()).toThrow();
  });

  it('Field Host chưa có hồ sơ Field Host (Admin chưa tạo) không được dùng quyền Host', async () => {
    expect(await codeOf(run(['field_host'], user({ role: 'field_host', isHostVerified: false })))).toBe('host_not_provisioned');
    expect(run(['field_host'], user({ role: 'field_host', isHostVerified: true }))()).toBe(true);
  });

  describe('@HostRoles', () => {
    const runWith = (roles: string[] | undefined, hostRoles: string[], current: AuthenticatedUser | undefined) => {
      const { reflector, ctx } = context(
        { user: current },
        { ...(roles ? { [ROLES_KEY]: roles } : {}), [HOST_ROLES_KEY]: hostRoles },
      );
      return () => new RolesGuard(reflector).canActivate(ctx);
    };
    const host = (hostRoles: string[], over: Partial<AuthenticatedUser> = {}) =>
      user({ role: 'field_host', portal: 'host', isHostVerified: true, hostRoles: hostRoles as never, ...over });

    it('Host thiếu vai → host_role_missing kèm errors.required; đủ vai → qua', async () => {
      expect(await codeOf(runWith(['field_host'], ['sale'], host(['inspector'])))).toBe('host_role_missing');
      try {
        runWith(['field_host'], ['sale'], host(['inspector']))();
      } catch (err) {
        expect((err as AuthException).getResponse()).toMatchObject({ errors: { required: ['sale'] } });
      }
      expect(runWith(['field_host'], ['sale'], host(['sale']))()).toBe(true);
      expect(runWith(['field_host'], ['sale'], host(['inspector', 'sale']))()).toBe(true);
    });

    it('chỉ cần một trong các vai yêu cầu', () => {
      expect(runWith(['field_host'], ['sale', 'inspector'], host(['inspector']))()).toBe(true);
    });

    it('@Roles("field_host","ops_admin") + @HostRoles("sale"): ops_admin không bị kiểm vai con', () => {
      expect(runWith(['field_host', 'ops_admin'], ['sale'], user({ role: 'ops_admin', portal: 'admin' }))()).toBe(true);
    });

    it('Host chưa có hồ sơ + @HostRoles → host_not_provisioned (không phải host_role_missing)', async () => {
      expect(await codeOf(runWith(['field_host'], ['sale'], host([], { isHostVerified: false })))).toBe('host_not_provisioned');
    });

    it('@HostRoles đứng một mình ngầm hiểu chỉ Field Host: tenant → 403', () => {
      expect(() => runWith(undefined, ['sale'], user({ role: 'tenant' }))()).toThrow(/field_host/);
      expect(runWith(undefined, ['sale'], host(['sale']))()).toBe(true);
    });
  });
});
