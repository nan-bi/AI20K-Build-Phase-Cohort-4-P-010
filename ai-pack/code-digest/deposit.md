# Digest: deposit

## Files
- backend/src/modules/deposit/deposit.controller.ts (48 dòng)
- backend/src/modules/deposit/deposit.module.ts (10 dòng)
- backend/src/modules/deposit/deposit.service.ts (234 dòng)
- backend/src/modules/deposit/dto/deposit.dto.ts (46 dòng)
## Controller (route -> handler; guard)
- DepositController: POST /deposits/generate-vietqr -> generateVietQr; @Public
- DepositController: POST /deposits/webhook-vietqr -> processWebhook; @Public
- DepositController: POST /deposits/:id/host-receipt -> uploadHostReceipt; @Public
- DepositController: GET /deposits/:id -> getDepositStatus; @Public
## Service
#### deposit.service.ts
- Public method: L16 `async generateVietQr(dto: GenerateVietQrDto)`; L105 `async processWebhook(dto: VietQrWebhookDto)`; L182 `async uploadHostReceipt(depositId: string, dto: UploadHostReceiptDto)`; L195 `async getDepositStatus(id: string)`
- Prisma: escrowTransaction.create (L137); fieldHost.update (L148); holdingDeposit.findFirst (L197); holdingDeposit.findUnique (L109); holdingDeposit.update (L123); holdingDeposit.upsert (L37); unit.update (L132); viewing.findFirst (L20)
- $transaction: CÓ (L122)
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
- Dấu mock/TODO: L84: depositId: 'dep-demo-' + Date.now(),
## DTO (field: kiểu [validator])
- GenerateVietQrDto: viewingId: string [ApiProperty, IsString]; hostId?: string [ApiPropertyOptional, IsOptional, IsString]; amount?: number [ApiPropertyOptional, IsOptional, IsNumber]
- VietQrWebhookDto: depositCode: string [ApiProperty, IsNotEmpty, IsString]; amount: number [ApiProperty, IsNumber]; bankRefNumber: string [ApiProperty, IsNotEmpty, IsString]
- UploadHostReceiptDto: receiptUrl: string [ApiProperty, IsNotEmpty, IsString]; note?: string [ApiPropertyOptional, IsOptional, IsString]
## File khác
- deposit.module.ts (export): DepositModule
