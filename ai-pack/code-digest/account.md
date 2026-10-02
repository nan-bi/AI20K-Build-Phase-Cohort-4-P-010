# Digest: account

## Files
- backend/src/modules/account/account.controller.ts (72 dòng)
- backend/src/modules/account/account.module.ts (10 dòng)
- backend/src/modules/account/account.service.ts (202 dòng)
- backend/src/modules/account/dto/account.dto.ts (19 dòng)
## Controller (route -> handler; guard)
- AccountController: GET /me/profile -> getProfile; @Public
- AccountController: PATCH /me/profile -> updateProfile; @Public
- AccountController: GET /me/bookings -> getBookings; @Public
- AccountController: GET /me/contracts -> getContracts; @Public
- AccountController: GET /me/favorites -> getFavorites; @Public
- AccountController: PUT /me/favorites/:unitId -> addFavorite; @Public
- AccountController: DELETE /me/favorites/:unitId -> removeFavorite; @Public
- AccountController: GET /me/notifications -> getNotifications; @Public
## Service
#### account.service.ts
- Public method: L12 `async getProfile(userId?: string)`; L41 `async updateProfile(userId: string | undefined, dto: UpdateProfileDto)`; L66 `async getBookings(userId?: string)`; L108 `async getContracts(userId?: string)`; L144 `async getFavorites()`; L169 `addFavorite(unitId: string)`; L174 `removeFavorite(unitId: string)`; L179 `getNotifications(userId?: string)`
- Prisma: contract.findMany (L110); profile.findFirst (L22); profile.findUnique (L15); profile.update (L44); unit.findMany (L146); viewing.findMany (L68)
- $transaction: KHÔNG
- Dấu mock/TODO: L21: // Demo fallback | L82: // Fallback demo bookings
## DTO (field: kiểu [validator])
- UpdateProfileDto: fullName?: string [ApiPropertyOptional, IsOptional, IsString]; phone?: string [ApiPropertyOptional, IsOptional, IsString]; email?: string [ApiPropertyOptional, IsOptional, IsString]
## File khác
- account.module.ts (export): AccountModule
