# Digest: landlord

## Files
- backend/src/modules/landlord/dto/landlord.dto.ts (96 dòng)
- backend/src/modules/landlord/landlord.controller.ts (93 dòng)
- backend/src/modules/landlord/landlord.module.ts (10 dòng)
- backend/src/modules/landlord/landlord.service.ts (297 dòng)
## Controller (route -> handler; guard)
- LandlordController: GET /landlord/dashboard -> getDashboard; @Public
- LandlordController: GET /landlord/units -> getLandlordUnits; @Public
- LandlordController: GET /landlord/units/:id -> getLandlordUnitById; @Public
- LandlordController: GET /landlord/units/:unitId/audit-trail -> getUnitDoorAuditTrail; @Public
- LandlordController: POST /landlord/consignments -> createConsignment; @Public
- LandlordController: GET /landlord/consignments/:id -> getConsignmentById; @Public
- LandlordController: POST /landlord/consignments/:id/sign -> signConsignment; @Public
- LandlordController: GET /landlord/finance -> getLandlordFinance; @Public
- LandlordController: POST /landlord/mandates/request-exit -> requestExitMandate; @Public
- LandlordController: POST /landlord/mandates/cancel-exit -> cancelExitMandate; @Public
## Service
#### landlord.service.ts
- Public method: L16 `async getLandlordDashboard(landlordId?: string)`; L111 `async getLandlordUnits(landlordId?: string)`; L156 `async getLandlordUnitById(id: string)`; L185 `async getUnitDoorAuditTrail(unitId: string)`; L214 `async createConsignment(dto: CreateConsignmentDto)`; L230 `async getConsignmentById(id: string)`; L245 `async signConsignment(id: string, dto: SignConsignmentDto)`; L256 `async getLandlordFinance(landlordId?: string)`; L274 `async requestExitMandate(dto: RequestExitMandateDto)`; L288 `async cancelExitMandate(dto: CancelExitMandateDto)`
- Prisma: auditLog.findMany (L187); unit.findFirst (L158); unit.findMany (L21,113)
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
## DTO (field: kiểu [validator])
- RequestExitMandateDto: mandateId: string [ApiProperty, IsNotEmpty, IsString]; reason: string [ApiProperty, IsNotEmpty, IsString]
- CancelExitMandateDto: mandateId: string [ApiProperty, IsNotEmpty, IsString]
- CreateConsignmentDto: building: string [ApiProperty, IsNotEmpty, IsString]; floor: number [ApiProperty, IsNumber]; door: string [ApiProperty, IsNotEmpty, IsString]; layout: string [ApiProperty, IsNotEmpty, IsString]; areaM2: number [ApiProperty, IsNumber]; askRent: number [ApiProperty, IsNumber]; suggestedDeposit?: number [ApiPropertyOptional, IsOptional, IsNumber]; leaseTerm?: number [ApiPropertyOptional, IsOptional, IsNumber]; furnished?: boolean [ApiPropertyOptional, IsOptional, IsBoolean]; locks?: string[] [ApiPropertyOptional, IsOptional, IsArray]; doorCode?: string [ApiPropertyOptional, IsOptional, IsString]; note?: string [ApiPropertyOptional, IsOptional, IsString]; draft?: boolean [ApiPropertyOptional, IsOptional, IsBoolean]
- SignConsignmentDto: ownershipWarranted: boolean [ApiProperty, IsBoolean]; otp?: string [ApiPropertyOptional, IsOptional, IsString]
## File khác
- landlord.module.ts (export): LandlordModule
