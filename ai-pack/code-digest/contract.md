# Digest: contract

## Files
- backend/src/modules/contract/contract.controller.ts (41 dòng)
- backend/src/modules/contract/contract.module.ts (10 dòng)
- backend/src/modules/contract/contract.service.ts (199 dòng)
- backend/src/modules/contract/dto/contract.dto.ts (38 dòng)
## Controller (route -> handler; guard)
- ContractController: POST /contracts/holding-agreement/sign -> signDepositAgreement; @Public
- ContractController: POST /contracts/mandate/create -> createMandate; @Public
- ContractController: GET /contracts/:id/evidence-package -> getEvidencePackage; @Public
## Service
#### contract.service.ts
- Public method: L16 `async signDepositAgreement(dto: SignDepositAgreementDto)`; L111 `async createMandate(dto: CreateMandateDto, landlordId?: string)`; L173 `async getEvidencePackage(contractId: string)`
- Prisma: doorAccessKey.upsert (L126); exclusiveMandate.create (L140); holdingDeposit.findUnique (L23); holdingDeposit.update (L66); signature.create (L52); signedDocument.create (L40); signedDocument.findUnique (L174); unit.findUnique (L114)
- $transaction: KHÔNG
- Throw: BadRequestException x1 (L20); NotFoundException x3 (L33,120,180)
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
## DTO (field: kiểu [validator])
- SignDepositAgreementDto: depositId: string [ApiProperty, IsUUID]; signatureSvg: string [ApiProperty, IsNotEmpty, IsString]; otp: string [ApiProperty, IsNotEmpty, IsString]
- CreateMandateDto: unitCode: string [ApiProperty, IsNotEmpty, IsString]; expectedRentPrice: number [ApiProperty, IsNotEmpty]; doorPin: string [ApiProperty, IsNotEmpty, IsString]; freeInspectionRequest?: boolean [ApiPropertyOptional, IsOptional]
## File khác
- contract.module.ts (export): ContractModule
