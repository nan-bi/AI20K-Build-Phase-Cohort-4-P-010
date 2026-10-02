# Digest: prisma

## Files
- backend/src/prisma/prisma.module.ts (9 dòng)
- backend/src/prisma/prisma.service.ts (32 dòng)
## Controller (route -> handler; guard)
- không có
## Service
#### prisma.service.ts
- Public method: L19 `async onModuleInit()`; L28 `async onModuleDestroy()`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
- Dấu mock/TODO: L24: this.logger.warn('⚠️ Prisma could not connect to PostgreSQL immediately (check DATABASE_URL). Continuing in mo...
## DTO (field: kiểu [validator])
- không có
## File khác
- prisma.module.ts (export): PrismaModule
