# Digest: dispatch

## Files
- backend/src/modules/dispatch/dispatch.controller.ts (84 dòng)
- backend/src/modules/dispatch/dispatch.module.ts (10 dòng)
- backend/src/modules/dispatch/dispatch.service.ts (249 dòng)
- backend/src/modules/dispatch/dto/dispatch.dto.ts (54 dòng)
## Controller (route -> handler; guard)
- DispatchController: GET /dispatch/tickets -> getHostTickets; @Public
- DispatchController: POST /dispatch/tickets/:id/accept -> acceptTicket; @Public
- DispatchController: POST /dispatch/tickets/:id/reject -> rejectTicket; @Public
- DispatchController: POST /dispatch/tickets/:id/claim -> claimTicket; @Public
- DispatchController: POST /dispatch/tickets/:id/elevator-rfid -> swipeElevatorRfid; @Public
- DispatchController: POST /dispatch/tickets/:id/reveal-key -> revealDoorKey; @Public
- DispatchController: POST /dispatch/tickets/:id/emergency -> reportEmergency; @Public
- DispatchController: POST /dispatch/tickets/:id/no-show -> reportNoShow; @Public
- DispatchController: POST /dispatch/tickets/:id/not-interested -> reportNotInterested; @Public
## Service
#### dispatch.service.ts
- Public method: L16 `async getHostTickets(hostId?: string)`; L67 `async acceptTicket(ticketId: string, hostId?: string)`; L121 `async rejectTicket(ticketId: string, dto: RejectTicketDto)`; L131 `async claimTicket(ticketId: string, hostId?: string)`; L142 `async swipeElevatorRfid(ticketId: string)`; L152 `async revealDoorKey(ticketId: string)`; L219 `async reportEmergency(ticketId: string, dto: EmergencyReportDto)`; L230 `async reportNoShow(ticketId: string, dto: NoShowDto)`; L240 `async reportNotInterested(ticketId: string, dto: NotInterestedDto)`
- Prisma: dispatchTicket.findMany (L23); dispatchTicket.findUnique (L69,154); dispatchTicket.update (L81); fieldHost.findFirst (L77)
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
- Dấu mock/TODO: L43: id: 't-demo-001', | L49: id: 'v-demo-001',
## DTO (field: kiểu [validator])
- AcceptTicketDto: hostId?: string [ApiPropertyOptional, IsOptional, IsString]
- RejectTicketDto: reason: string [ApiProperty, IsNotEmpty, IsString]; hostId?: string [ApiPropertyOptional, IsOptional, IsString]
- ClaimTicketDto: hostId?: string [ApiPropertyOptional, IsOptional, IsString]
- EmergencyReportDto: kind: 'smart_lock' | 'physical_key' [ApiProperty, IsNotEmpty, IsIn(['smart_lock', 'physical_key'])]; note?: string [ApiPropertyOptional, IsOptional, IsString]
- NoShowDto: reason?: string [ApiPropertyOptional, IsOptional, IsString]
- NotInterestedDto: reason?: string [ApiPropertyOptional, IsOptional, IsString]
## File khác
- dispatch.module.ts (export): DispatchModule
