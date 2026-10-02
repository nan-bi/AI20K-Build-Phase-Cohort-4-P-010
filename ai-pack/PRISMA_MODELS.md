# Prisma Models

## Models
### Role (bảng `roles`)
- Fields: `id: String` @id, `code: String` @unique, `name: String?`, `description: String?`, `permissions: RolePermission[]` [quan hệ], `profiles: Profile[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### Permission (bảng `permissions`)
- Fields: `id: String` @id, `code: String` @unique, `resource: String`, `action: String`, `roles: RolePermission[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### RolePermission (bảng `role_permissions`)
- Fields: `roleId: String`, `permissionId: String`, `role: Role` [quan hệ] @relation, `permission: Permission` [quan hệ] @relation
- Index/unique: @@id([roleId, permissionId])
### Profile (bảng `profiles`)
- Fields: `id: String` @id, `roleId: String`, `fullName: String?`, `phoneEnc: String?`, `phoneHash: String?` @unique, `email: String?` @unique, `isPhoneVerified: Boolean`, `isActive: Boolean`, `lastLoginAt: DateTime?`, `createdAt: DateTime`, `updatedAt: DateTime`, `role: Role` [quan hệ] @relation, `claimedHostInvite: HostInvite?` [quan hệ] @relation, `ownedUnits: Unit[]` [quan hệ] @relation, `hostProfile: FieldHost?` [quan hệ], `viewings: Viewing[]` [quan hệ] @relation, `identityChecks: IdentityVerification[]` [quan hệ], `tenantContracts: Contract[]` [quan hệ] @relation, `landlordContracts: Contract[]` [quan hệ] @relation, `signatures: Signature[]` [quan hệ], `auditActions: AuditLog[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### HostInvite (bảng `host_invites`)
- Fields: `id: String` @id, `email: String` @unique, `assignedZone: String`, `rfidCardNumber: String`, `claimedById: String?` @unique, `claimedAt: DateTime?`, `createdAt: DateTime`, `claimedBy: Profile?` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### OtpCode (bảng `otp_codes`)
- Fields: `id: String` @id, `phoneHash: String`, `purpose: OtpPurpose`, `codeHash: String`, `channel: OtpChannel`, `status: OtpStatus`, `attemptCount: Int`, `lockedUntil: DateTime?`, `expiresAt: DateTime`, `verifiedAt: DateTime?`, `consumedAt: DateTime?`, `ipAddress: String?`, `userAgent: String?`, `createdAt: DateTime`
- Index/unique: @@index([phoneHash, purpose, status])
### AuthAuditLog (bảng `auth_audit_log`)
- Fields: `id: String` @id, `userId: String?`, `phoneHash: String?`, `event: String`, `ipAddress: String?`, `userAgent: String?`, `metadata: Json?`, `createdAt: DateTime`
- Index/unique: @@index([userId]); @@index([phoneHash]); @@index([event, createdAt])
### Building (bảng `buildings`)
- Fields: `id: String` @id, `buildingCode: String` @unique, `zoneName: String`, `totalFloors: Int`, `lobbyLatitude: Decimal`, `lobbyLongitude: Decimal`, `createdAt: DateTime`, `units: Unit[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### Unit (bảng `units`)
- Fields: `id: String` @id, `unitCode: String` @unique, `buildingId: String`, `landlordId: String`, `floorNumber: Int`, `layoutType: LayoutType`, `carpetAreaM2: Decimal`, `baseRentPrice: Decimal`, `managementFee: Decimal`, `parkingFeeEstimate: Decimal`, `utilityCostEstimate: Decimal`, `marketAvgPrice: Decimal`, `doorLockType: DoorLockType`, `isVerified: Boolean`, `status: UnitStatus`, `isHot: Boolean`, `createdAt: DateTime`, `updatedAt: DateTime`, `building: Building` [quan hệ] @relation, `landlord: Profile` [quan hệ] @relation, `doorKey: DoorAccessKey?` [quan hệ], `media: UnitMedia[]` [quan hệ], `mandates: ExclusiveMandate[]` [quan hệ], `viewings: Viewing[]` [quan hệ], `deposits: HoldingDeposit[]` [quan hệ], `contract: Contract[]` [quan hệ]
- Index/unique: @@index([status, buildingId]); @@index([baseRentPrice])
### UnitMedia (bảng `unit_media`)
- Fields: `id: String` @id, `unitId: String`, `url: String`, `category: String`, `order: Int`, `verifiedAt: DateTime`, `unit: Unit` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### DoorAccessKey (bảng `door_access_keys`)
- Fields: `id: String` @id, `unitId: String` @unique, `keyType: DoorLockType`, `vaultSecretRef: String?`, `physicalKeyState: PhysicalKeyState?`, `physicalKeyHolderId: String?`, `status: DoorKeyStatus`, `issuedAt: DateTime`, `lastRotatedAt: DateTime?`, `revokedAt: DateTime?`, `unit: Unit` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### SignedDocument (bảng `signed_documents`)
- Fields: `id: String` @id, `docType: DocType`, `storageKey: String`, `sha256: String?`, `tsaToken: String?`, `tsaTime: DateTime?`, `sealedAt: DateTime?`, `createdAt: DateTime`, `signatures: Signature[]` [quan hệ], `mandate: ExclusiveMandate?` [quan hệ], `deposit: HoldingDeposit?` [quan hệ], `contract: Contract?` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### Signature (bảng `signatures`)
- Fields: `id: String` @id, `documentId: String`, `signerId: String`, `signerRole: String`, `method: String`, `signatureSvg: String?`, `otpVerifiedAt: DateTime`, `ipAddress: String?`, `userAgent: String?`, `signedAt: DateTime`, `document: SignedDocument` [quan hệ] @relation, `signer: Profile` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### ExclusiveMandate (bảng `exclusive_mandates`)
- Fields: `id: String` @id, `unitId: String`, `contractNumber: String` @unique, `documentId: String?` @unique, `doorAccessConfig: Json?`, `signedAt: DateTime?`, `validUntil: DateTime?`, `status: MandateStatus`, `exitRequestedAt: DateTime?`, `exitEffectiveAt: DateTime?`, `createdAt: DateTime`, `unit: Unit` [quan hệ] @relation, `document: SignedDocument?` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### FieldHost (bảng `field_hosts`)
- Fields: `id: String` @id, `profileId: String` @unique, `assignedZone: String`, `rfidCardNumber: String?`, `dutyStatus: HostDutyStatus`, `currentLatitude: Decimal?`, `currentLongitude: Decimal?`, `rating: Decimal`, `walletBalance: Decimal`, `createdAt: DateTime`, `profile: Profile` [quan hệ] @relation, `tickets: DispatchTicket[]` [quan hệ], `attributedDeposits: HoldingDeposit[]` [quan hệ], `payouts: HostPayout[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### Viewing (bảng `viewings`)
- Fields: `id: String` @id, `bookingRefCode: String` @unique, `unitId: String`, `tenantId: String`, `viewingSlot: DateTime`, `status: ViewingStatus`, `cancelReason: String?`, `lobbyCheckInAt: DateTime?`, `completedAt: DateTime?`, `tenantRating: Int?`, `createdAt: DateTime`, `unit: Unit` [quan hệ] @relation, `tenant: Profile` [quan hệ] @relation, `tickets: DispatchTicket[]` [quan hệ], `deposit: HoldingDeposit?` [quan hệ]
- Index/unique: @@index([viewingSlot, status])
### DispatchTicket (bảng `dispatch_tickets`)
- Fields: `id: String` @id, `viewingId: String`, `hostId: String?`, `tier: Int`, `slaSeconds: Int`, `status: TicketStatus`, `offeredAt: DateTime`, `acceptedAt: DateTime?`, `viewing: Viewing` [quan hệ] @relation, `host: FieldHost?` [quan hệ] @relation
- Index/unique: @@index([hostId, status])
### HoldingDeposit (bảng `holding_deposits`)
- Fields: `id: String` @id, `depositCode: String` @unique, `viewingId: String` @unique, `unitId: String`, `attributedHostId: String?`, `amount: Decimal`, `vietqrRef: String`, `paymentStatus: DepositStatus`, `paidAt: DateTime?`, `expiresAt: DateTime?`, `agreementDocId: String?` @unique, `createdAt: DateTime`, `updatedAt: DateTime`, `viewing: Viewing` [quan hệ] @relation, `unit: Unit` [quan hệ] @relation, `attributedHost: FieldHost?` [quan hệ] @relation, `agreementDoc: SignedDocument?` [quan hệ] @relation, `identity: IdentityVerification?` [quan hệ], `contract: Contract?` [quan hệ], `escrowTx: EscrowTransaction[]` [quan hệ]
- Index/unique: @@index([paymentStatus, expiresAt])
### IdentityVerification (bảng `identity_verifications`)
- Fields: `id: String` @id, `tenantId: String`, `depositId: String?` @unique, `providerName: String`, `providerRefId: String`, `confidenceScore: Float?`, `c06Confirmed: Boolean`, `status: IdentityStatus`, `verifiedDataRef: String?`, `consentAt: DateTime`, `consentVersion: String`, `reviewedById: String?`, `verifiedAt: DateTime?`, `rawDataPurgeAt: DateTime`, `rawDataPurgedAt: DateTime?`, `createdAt: DateTime`, `tenant: Profile` [quan hệ] @relation, `deposit: HoldingDeposit?` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### Contract (bảng `contracts`)
- Fields: `id: String` @id, `contractNumber: String` @unique, `unitId: String`, `holdingDepositId: String` @unique, `tenantId: String`, `landlordId: String`, `documentId: String?` @unique, `leaseTermMonths: Int`, `startDate: DateTime`, `endDate: DateTime`, `monthlyRentPrice: Decimal`, `securityDepositAmount: Decimal`, `status: ContractStatus`, `createdAt: DateTime`, `updatedAt: DateTime`, `unit: Unit` [quan hệ] @relation, `holdingDeposit: HoldingDeposit` [quan hệ] @relation, `tenant: Profile` [quan hệ] @relation, `landlord: Profile` [quan hệ] @relation, `document: SignedDocument?` [quan hệ] @relation, `handovers: DigitalHandover[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### DigitalHandover (bảng `digital_handovers`)
- Fields: `id: String` @id, `contractId: String`, `handoverType: HandoverType`, `inspectorHostId: String?`, `inspectedAt: DateTime`, `signedByTenantAt: DateTime?`, `reportSha256: String?`, `createdAt: DateTime`, `contract: Contract` [quan hệ] @relation, `items: HandoverItem[]` [quan hệ], `utilityReadings: UtilityReading[]` [quan hệ]
- Index/unique: không khai báo @@index/@@unique/@@id
### HandoverItem (bảng `HandoverItem`)
- Fields: `id: String` @id, `handoverId: String`, `itemCategory: String`, `conditionNote: String?`, `photos: Json`
- Index/unique: không khai báo @@index/@@unique/@@id
### UtilityReading (bảng `utility_readings`)
- Fields: `id: String` @id, `handoverId: String`, `utilityType: String`, `meterIndex: Decimal`, `photoKey: String`, `recordedAt: DateTime`, `handover: DigitalHandover` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### EscrowTransaction (bảng `escrow_transactions`)
- Fields: `id: String` @id, `depositId: String`, `transType: String`, `amount: Decimal`, `bankRefNumber: String` @unique, `executedAt: DateTime`, `deposit: HoldingDeposit` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### HostPayout (bảng `host_payouts`)
- Fields: `id: String` @id, `hostId: String`, `amount: Decimal`, `period: String`, `status: String`, `transRef: String?`, `settledAt: DateTime?`, `createdAt: DateTime`, `host: FieldHost` [quan hệ] @relation
- Index/unique: không khai báo @@index/@@unique/@@id
### FeeConfig (bảng `fee_configs`)
- Fields: `id: String` @id, `configKey: String` @unique, `paramValue: Decimal`, `paramUnit: String`, `updatedBy: String`, `updatedAt: DateTime`
- Index/unique: không khai báo @@index/@@unique/@@id
### AuditLog (bảng `audit_logs`)
- Fields: `id: String` @id, `actorId: String`, `actorRole: String`, `actionType: String`, `entityName: String`, `entityId: String`, `oldValue: Json?`, `newValue: Json?`, `ipAddress: String?`, `userAgent: String?`, `createdAt: DateTime`, `actor: Profile` [quan hệ] @relation
- Index/unique: @@index([actionType, createdAt]); @@index([entityName, entityId])

## Enums
- `OtpPurpose`: PHONE_VERIFY, TENANT_VIEWING, TENANT_DEPOSIT_SIGN
- `OtpChannel`: ZALO, SMS
- `OtpStatus`: PENDING, VERIFIED, CONSUMED
- `UnitStatus`: AVAILABLE, HOLDING, RENTED, UNLISTED, MAINTENANCE
- `LayoutType`: STUDIO, ONE_BED_PLUS, TWO_BED_ONE_BATH, TWO_BED_TWO_BATH, THREE_BED
- `DoorLockType`: ELECTRONIC_PIN, PHYSICAL_KEY
- `DoorKeyStatus`: ACTIVE, REVOKED
- `PhysicalKeyState`: AT_DESK, WITH_HOST
- `DocType`: MANDATE, DEPOSIT_AGREEMENT, LEASE, HANDOVER_REPORT
- `MandateStatus`: PENDING_INSPECTION, ACTIVE, EXIT_REQUESTED, TERMINATED, EXPIRED
- `HostDutyStatus`: ONLINE_AVAILABLE, BUSY_VIEWING, OFF_DUTY
- `ViewingStatus`: PENDING_CONFIRMATION, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED
- `TicketStatus`: OFFERED, ACCEPTED, CHECKED, COMPLETED, EXPIRED, ESCALATED, CANCELLED
- `DepositStatus`: PENDING_PAYMENT, QR_EXPIRED, UNC_PENDING_REVIEW, PAID_HOLDING, CONVERTED_TO_CONTRACT, REFUNDED, FORFEITED
- `IdentityStatus`: SUBMITTED, VERIFIED, NEEDS_REVIEW, REJECTED
- `ContractStatus`: DRAFT, AWAITING_TENANT_SIGN, AWAITING_LANDLORD_SIGN, ACTIVE, TERMINATED_SETTLED, DISPUTED
- `HandoverType`: CHECK_IN, CHECK_OUT

## Khác biệt giữa schema.sql và schema.prisma
- Bảng chỉ có trong Prisma: audit_logs, auth_audit_log, buildings, contracts, digital_handovers, dispatch_tickets, door_access_keys, escrow_transactions, exclusive_mandates, fee_configs, HandoverItem, host_invites, host_payouts, identity_verifications, otp_codes, permissions, profiles, role_permissions, roles, signatures, signed_documents, unit_media, utility_readings
- Bảng chỉ có trong SQL: không thấy
- Cột khác biệt: field_hosts: chỉ Prisma=assigned_zone,current_latitude,current_longitude,duty_status,profile_id,wallet_balance; chỉ SQL=assigned_block,email,full_name,phone,status,updated_at; holding_deposits: chỉ Prisma=agreement_doc_id,amount,attributed_host_id,deposit_code,paid_at,vietqr_ref; chỉ SQL=deposit_amount,signed_agreement_url,signed_at,tenant_id_card_data,vietqr_payment_code; units: chỉ Prisma=building_id,carpet_area_m2,door_lock_type,is_verified,landlord_id; chỉ SQL=block_name,door_access_code,landlord_name,landlord_phone,net_area_sqm,verified_images; viewings: chỉ Prisma=completed_at,lobby_check_in_at,tenant_id,tenant_rating; chỉ SQL=host_id,notes,tenant_name,tenant_phone,updated_at
