# Digest: admin

## Files
- backend/src/modules/admin/admin.controller.ts (166 dòng)
- backend/src/modules/admin/admin.module.ts (10 dòng)
- backend/src/modules/admin/admin.service.ts (512 dòng)
- backend/src/modules/admin/dto/admin.dto.ts (123 dòng)
## Controller (route -> handler; guard)
- AdminController: GET /admin/bi-funnel -> getBiFunnel; @Public
- AdminController: GET /admin/exclusive-inventory -> getInventory; @Public
- AdminController: POST /admin/consignments/:id/approve -> approveConsignment; @Public
- AdminController: POST /admin/consignments/:id/reject -> rejectConsignment; @Public
- AdminController: GET /admin/dispatch-sla -> getDispatchSla; @Public
- AdminController: POST /admin/bookings/:id/reassign -> reassignBooking; @Public
- AdminController: GET /admin/contracts -> getContracts; @Public
- AdminController: GET /admin/contracts/:id -> getContractById; @Public
- AdminController: POST /admin/contracts/:id/void-hold -> voidHold; @Public
- AdminController: POST /admin/contracts/:id/complete-exit -> completeExit; @Public
- AdminController: POST /admin/contracts/:id/remind-renewal -> remindRenewal; @Public
- AdminController: GET /admin/contract-templates -> getContractTemplates; @Public
- AdminController: GET /admin/contract-templates/:id -> getContractTemplateById; @Public
- AdminController: GET /admin/contract-parties -> getContractParties; @Public
- AdminController: GET /admin/contract-parties/:id -> getContractPartyById; @Public
- AdminController: GET /admin/commission-engine -> getCommissionEngine; @Public
- AdminController: POST /admin/commission-engine/config -> updateCommissionParam; @Public
- AdminController: GET /admin/settings/hold-policy -> getHoldPolicy; @Public
- AdminController: POST /admin/settings/hold-policy -> updateHoldPolicy; @Public
## Service
#### admin.service.ts
- Public method: L32 `async getBiFunnelAndHeatmap()`; L83 `async getExclusiveInventory()`; L142 `async approveConsignment(id: string, dto: ApproveConsignmentDto)`; L153 `async rejectConsignment(id: string, dto: RejectConsignmentDto)`; L168 `async getDispatchSlaMonitoring()`; L209 `async reassignBooking(bookingId: string, dto: ReassignBookingDto)`; L223 `async getFieldHosts()`; L275 `async getFieldHostById(id: string)`; L289 `async createFieldHost(dto: CreateFieldHostDto)`; L302 `async updateFieldHost(id: string, dto: UpdateFieldHostDto)`; L313 `async deleteFieldHost(id: string)`; L326 `async getContracts()`; L358 `async getContractById(id: string)`; L375 `async voidHold(id: string, dto: VoidHoldDto)`; L389 `async completeExit(id: string)`; L400 `async remindRenewal(id: string)`; L410 `getContractTemplates()`; L419 `getContractTemplateById(id: string)`; L430 `getContractParties()`; L438 `getContractPartyById(id: string)`; L451 `async getCommissionEngine()`; L479 `async updateCommissionParam(dto: UpdateCommissionParamDto)`; L493 `getHoldPolicy()`; L497 `updateHoldPolicy(dto: UpdateHoldPolicyDto)`
- Prisma: contract.findMany (L328); dispatchTicket.findMany (L170); feeConfig.findMany (L453); fieldHost.findMany (L225); unit.count (L39,40,41,42); unit.findMany (L85)
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
- Dấu mock/TODO: L109: this.logger.warn(`Prisma DB offline, returning mock exclusive inventory`);
## DTO (field: kiểu [validator])
- UpdateCommissionParamDto: configKey: string [ApiProperty, IsNotEmpty, IsString]; paramValue: number [ApiProperty, IsNumber]; reason: string [ApiProperty, IsNotEmpty, IsString]
- CreateFieldHostDto: email: string [ApiProperty, IsNotEmpty, IsEmail]; phone: string [ApiProperty, IsNotEmpty, IsString]; name: string [ApiProperty, IsNotEmpty, IsString]; assignedZone: string [ApiProperty, IsNotEmpty, IsString]; roles?: string[] [ApiPropertyOptional, IsOptional, IsArray]; rfidCardNumber?: string [ApiPropertyOptional, IsOptional, IsString]
- UpdateFieldHostDto: name?: string [ApiPropertyOptional, IsOptional, IsString]; phone?: string [ApiPropertyOptional, IsOptional, IsString]; assignedZone?: string [ApiPropertyOptional, IsOptional, IsString]; roles?: string[] [ApiPropertyOptional, IsOptional, IsArray]; rfidCardNumber?: string [ApiPropertyOptional, IsOptional, IsString]
- ApproveConsignmentDto: note?: string [ApiPropertyOptional, IsOptional, IsString]
- RejectConsignmentDto: note: string [ApiProperty, IsNotEmpty, IsString]
- ReassignBookingDto: hostId: string [ApiProperty, IsNotEmpty, IsString]
- VoidHoldDto: reason: 'landlord_breach' | 'force_majeure' [ApiProperty, IsNotEmpty, IsIn(['landlord_breach', 'force_majeure'])]; note: string [ApiProperty, IsNotEmpty, IsString]
- UpdateHoldPolicyDto: unitId?: string [ApiPropertyOptional, IsOptional, IsString]; hours: number [ApiProperty, IsNumber, Min(12), Max(72)]
## File khác
- admin.module.ts (export): AdminModule
