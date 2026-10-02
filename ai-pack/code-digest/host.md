# Digest: host

## Files
- backend/src/modules/host/dto/host.dto.ts (46 dòng)
- backend/src/modules/host/host.controller.ts (44 dòng)
- backend/src/modules/host/host.module.ts (10 dòng)
- backend/src/modules/host/host.service.ts (155 dòng)
## Controller (route -> handler; guard)
- HostController: GET /host/inspections -> getInspections; @Public
- HostController: POST /host/inspections/:consignmentId/accept -> acceptInspection; @Public
- HostController: POST /host/inspections/:consignmentId/report -> submitInspectionReport; @Public
- HostController: GET /host/earnings -> getEarnings; @Public
## Service
#### host.service.ts
- Public method: L11 `async getInspections(hostId?: string)`; L71 `async acceptInspection(consignmentId: string, dto: AcceptInspectionDto)`; L82 `async submitInspectionReport(consignmentId: string, dto: SubmitInspectionReportDto)`; L95 `async getEarnings(hostId?: string)`
- Prisma: exclusiveMandate.findMany (L13); fieldHost.findFirst (L97)
- $transaction: KHÔNG
- Dấu mock/TODO: L38: // Fallback demo inspection items
## DTO (field: kiểu [validator])
- AcceptInspectionDto: hostId?: string [ApiPropertyOptional, IsOptional, IsString]
- SubmitInspectionReportDto: hostId?: string [ApiPropertyOptional, IsOptional, IsString]; declared?: any[] [ApiPropertyOptional, IsOptional, IsArray]; inventory?: any[] [ApiPropertyOptional, IsOptional, IsArray]; netAreaM2?: number [ApiPropertyOptional, IsOptional, IsNumber]; furnishing?: string [ApiPropertyOptional, IsOptional, IsString]; recommendation: 'approve' | 'reject' [ApiProperty, IsNotEmpty, IsIn(['approve', 'reject'])]; note?: string [ApiPropertyOptional, IsOptional, IsString]
## File khác
- host.module.ts (export): HostModule
