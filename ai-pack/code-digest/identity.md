# Digest: identity

## Files
- backend/src/modules/identity/dto/identity.dto.ts (32 dòng)
- backend/src/modules/identity/identity.controller.ts (28 dòng)
- backend/src/modules/identity/identity.module.ts (10 dòng)
- backend/src/modules/identity/identity.service.ts (133 dòng)
## Controller (route -> handler; guard)
- IdentityController: POST /identity/ekyc/verify -> verifyEkyc; @Public
- IdentityController: GET /identity/:depositId -> getEkycResult; @Public
## Service
- không có
## DTO (field: kiểu [validator])
- EkycVerificationRequestDto: depositId: string [ApiProperty, IsUUID]; consentVersion: string [ApiProperty, IsNotEmpty, IsString]; hasConsent: boolean [ApiProperty, IsBoolean]; frontCardBase64?: string [ApiPropertyOptional, IsOptional, IsString]; backCardBase64?: string [ApiPropertyOptional, IsOptional, IsString]; faceVideoBase64?: string [ApiPropertyOptional, IsOptional, IsString]
- IdentityModule: không có field
- IdentityService: fullName: 'NGUYỄN VĂN AN', [-]; idNumber: '001095012345', [-]; dob: '1995-10-15', [-]; gender: 'Nam', [-]; homeTown: 'Hà Nội', [-]; address: 'Số 18, Ngõ 42, Phố Vọng, Phường Phương Mai, Quận Đống Đa, Hà Nội', [-]; issuedDate: '2021-05-12', [-]; issuePlace: 'Cục Cảnh sát QLHC về TTXH (C06)', [-]; confidence: { [-]; fullName: 0.99, [-]; idNumber: 0.98, [-]; issuedDate: 0.96, [-]; address: 0.93, [-]; faceMatch: 0.96, [-]; verifiedAt: new Date().toISOString(), [-]; livenessDetection: { [-]; passed: true, [-]; actionVerified: ['Blink', 'Turn Left', 'Smile'], [-]; antiSpoofingScore: 0.99, [-]; where: { OR: [{ id: depositId }, { depositCode: depositId }] }, [-]; include: { viewing: { include: { tenant: true } } }, [-]; where: { depositId: deposit.id }, [-]; update: { [-]; providerName: 'FPT.AI eKYC (FPT Smart Cloud)', [-]; status: IdentityStatus.VERIFIED, [-]; verifiedDataRef: `vault:aes256:ekyc:${providerRefId}`, [-]; consentAt: new Date(), [-]; verifiedAt: new Date(), [-]; create: { [-]; tenantId: deposit.viewing.tenantId, [-]; depositId: deposit.id, [-]; providerName: 'FPT.AI eKYC (FPT Smart Cloud)', [-]; status: IdentityStatus.VERIFIED, [-]; verifiedDataRef: `vault:aes256:ekyc:${providerRefId}`, [-]; consentAt: new Date(), [-]; verifiedAt: new Date(), [-]; where: { id: deposit.viewing.tenantId }, [-]; data: { fullName: extractedData.fullName }, [-]; success: true, [-]; status: 'VERIFIED', [-]; provider: 'FPT.AI eKYC (FPT Smart Cloud) + Liveness Detection', [-]; c06Confirmed: true, [-]; confidenceScore: '98.5%', [-]; fieldConfidence: extractedData.confidence, [-]; zeroStorageCompliance: { [-]; ramPurged: true, [-]; serverStorageBytes: 0, [-]; lawCompliance: 'Nghị định 356/2025/NĐ-CP & Luật BVDLCN 2025', [-]; nextStep: 'Dữ liệu đã tự động điền vào Thỏa thuận cọc điện tử. Sẵn sàng ký số OTP.', [-]; status: 'VERIFIED', [-]; c06Confirmed: true, [-]; verifiedAt: new Date().toISOString(), [-]; extractedData: { [-]; fullName: 'NGUYỄN VĂN AN', [-]; idNumber: '001095012345', [-]; dob: '1995-10-15', [-]; address: 'Số 18, Ngõ 42, Phố Vọng, Phường Phương Mai, Quận Đống Đa, Hà Nội', [-]; issuedDate: '2021-05-12', [-]; confidence: { [-]; fullName: 0.99, [-]; idNumber: 0.98, [-]; issuedDate: 0.96, [-]; address: 0.93, [-]
## File khác
- không có
