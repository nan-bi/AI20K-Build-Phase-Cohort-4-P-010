# Digest: matchmaker

## Files
- backend/src/modules/matchmaker/dto/matchmaker-request.dto.ts (27 dòng)
- backend/src/modules/matchmaker/matchmaker.controller.ts (21 dòng)
- backend/src/modules/matchmaker/matchmaker.module.ts (12 dòng)
- backend/src/modules/matchmaker/matchmaker.service.ts (76 dòng)
## Controller (route -> handler; guard)
- MatchmakerController: POST /matchmaker/recommend -> recommend; @Public
## Service
#### matchmaker.service.ts
- Public method: L16 `async findTopRecommendations(dto: MatchmakerRequestDto)`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
## DTO (field: kiểu [validator])
- MatchmakerRequestDto: maxAllInBudget: number [ApiProperty, IsNumber, Min(3000000)]; preferredLayout?: LayoutType [ApiPropertyOptional, IsOptional, IsEnum(LayoutType)]; motorbikes: number [ApiProperty, IsNumber]; cars: number [ApiProperty, IsNumber]; occupants: number [ApiProperty, IsNumber]
## File khác
- matchmaker.module.ts (export): MatchmakerModule
