# Digest: audit

## Files
- backend/src/modules/audit/audit.module.ts (9 dòng)
- backend/src/modules/audit/audit.service.ts (64 dòng)
## Controller (route -> handler; guard)
- không có
## Service
#### audit.service.ts
- Public method: L22 `async log(data: CreateAuditLogDto)`; L49 `async getRecentLogs(limit = 50)`
- Prisma: auditLog.create (L31); auditLog.findMany (L50)
- $transaction: KHÔNG
## DTO (field: kiểu [validator])
- không có
## File khác
- audit.module.ts (export): AuditModule
