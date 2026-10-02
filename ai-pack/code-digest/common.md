# Digest: common

## Files
- backend/src/common/decorators/current-user.decorator.ts (11 dòng)
- backend/src/common/decorators/public.decorator.ts (4 dòng)
- backend/src/common/decorators/roles.decorator.ts (4 dòng)
- backend/src/common/filters/http-exception.filter.ts (68 dòng)
- backend/src/common/guards/guards.spec.ts (125 dòng)
- backend/src/common/guards/roles.guard.ts (37 dòng)
- backend/src/common/guards/supabase-auth.guard.ts (60 dòng)
- backend/src/common/interceptors/logging.interceptor.ts (28 dòng)
- backend/src/common/interceptors/transform.interceptor.ts (30 dòng)
## Controller (route -> handler; guard)
- không có
## Service
#### roles.guard.ts
- Public method: L10 `canActivate(context: ExecutionContext): boolean`
- $transaction: KHÔNG
- Throw: ForbiddenException x2 (L22,27)
#### supabase-auth.guard.ts
- Public method: L28 `async canActivate(context: ExecutionContext): Promise<boolean>`
- $transaction: KHÔNG
- Dấu mock/TODO: L24: // Header x-demo-role bỏ qua xác thực hoàn toàn — chỉ tồn tại khi bật tường minh và không phải production. | L39: const demoRole = this.demoMode ? request.headers['x-demo-role'] : undefined; | L42: id: request.headers['x-demo-userid'] || '00000000-0000-0000-0000-000000000001', | L44: fullName: 'Demo User',
#### logging.interceptor.ts
- Public method: L15 `intercept(context: ExecutionContext, next: CallHandler): Observable<any>`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): rxjs, rxjs/operators
#### transform.interceptor.ts
- Public method: L19 `intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>>`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): rxjs, rxjs/operators
## DTO (field: kiểu [validator])
- không có
## File khác
- current-user.decorator.ts (export): CurrentUser
- public.decorator.ts (export): IS_PUBLIC_KEY, Public
- roles.decorator.ts (export): ROLES_KEY, Roles
- http-exception.filter.ts (export): HttpExceptionFilter
