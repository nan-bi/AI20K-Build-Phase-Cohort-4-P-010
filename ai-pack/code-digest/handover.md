# Digest: handover

## Files
- backend/src/modules/handover/dto/handover.dto.ts (56 dòng)
- backend/src/modules/handover/handover.controller.ts (28 dòng)
- backend/src/modules/handover/handover.module.ts (10 dòng)
- backend/src/modules/handover/handover.service.ts (117 dòng)
## Controller (route -> handler; guard)
- HandoverController: POST /handovers -> createHandover; @Public
- HandoverController: GET /handovers/contracts/:contractId -> getHandoverByContract; @Public
## Service
#### handover.service.ts
- Public method: L29 `async createHandover(dto: CreateDigitalHandoverDto, hostId?: string)`; L108 `async getHandoverByContract(contractId: string)`
- Prisma: contract.findUnique (L32); digitalHandover.create (L44); digitalHandover.findMany (L109)
- $transaction: KHÔNG
- Throw: NotFoundException x1 (L38)
## DTO (field: kiểu [validator])
- HandoverItemInputDto: itemCategory: string [ApiProperty, IsNotEmpty, IsString]; conditionNote: string [ApiProperty, IsString]; isNormalWear: boolean [ApiProperty]
- UtilityReadingInputDto: utilityType: string [ApiProperty, IsNotEmpty, IsString]; meterIndex: number [ApiProperty, IsNumber]; photoKey: string [ApiProperty, IsNotEmpty, IsString]
- CreateDigitalHandoverDto: contractId: string [ApiProperty, IsUUID]; handoverType: HandoverType [ApiProperty, IsEnum(HandoverType)]; items: HandoverItemInputDto[] [ApiProperty, IsArray, ValidateNested({ each: true }), Type(() => HandoverItemInputDto)]; utilityReadings: UtilityReadingInputDto[] [ApiProperty, IsArray, ValidateNested({ each: true }), Type(() => UtilityReadingInputDto)]
## File khác
- handover.module.ts (export): HandoverModule
