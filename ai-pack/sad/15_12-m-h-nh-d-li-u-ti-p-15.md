<!-- nguồn: docs/SAD_v2.md, dòng 966–1145 -->
model DispatchTicket {
  id         String       @id @default(uuid()) @db.Uuid
  viewingId  String       @map("viewing_id") @db.Uuid
  hostId     String?      @map("host_id") @db.Uuid   // null khi broadcast chưa ai nhận
  tier       Int                                     // 1, 2, 3
  slaSeconds Int          @map("sla_seconds")
  status     TicketStatus @default(OFFERED)
  offeredAt  DateTime     @default(now()) @map("offered_at") @db.Timestamptz
  acceptedAt DateTime?    @map("accepted_at") @db.Timestamptz
  viewing    Viewing      @relation(fields: [viewingId], references: [id])
  host       FieldHost?   @relation(fields: [hostId], references: [id])
  @@index([hostId, status])
  @@map("dispatch_tickets")
}

// ===== 7. CỌC GIỮ CHỖ 7 NGÀY =====
enum DepositStatus { PENDING_PAYMENT QR_EXPIRED UNC_PENDING_REVIEW PAID_HOLDING CONVERTED_TO_CONTRACT REFUNDED FORFEITED }

model HoldingDeposit {
  id                String        @id @default(uuid()) @db.Uuid
  depositCode       String        @unique @map("deposit_code") @db.VarChar(50)
  viewingId         String        @unique @map("viewing_id") @db.Uuid
  unitId            String        @map("unit_id") @db.Uuid
  attributedHostId  String?       @map("attributed_host_id") @db.Uuid
  amount            Decimal       @default(2000000) @db.Decimal(12, 2)
  vietqrRef         String        @map("vietqr_ref") @db.VarChar(100)
  paymentStatus     DepositStatus @default(PENDING_PAYMENT) @map("payment_status")
  paidAt            DateTime?     @map("paid_at") @db.Timestamptz
  expiresAt         DateTime?     @map("expires_at") @db.Timestamptz // paidAt + 7 ngày (UNC tạm: +30 phút)
  agreementDocId    String?       @unique @map("agreement_doc_id") @db.Uuid
  viewing           Viewing       @relation(fields: [viewingId], references: [id])
  unit              Unit          @relation(fields: [unitId], references: [id])
  attributedHost    FieldHost?    @relation(fields: [attributedHostId], references: [id])
  agreementDoc      SignedDocument? @relation(fields: [agreementDocId], references: [id])
  identity          IdentityVerification?
  contract          Contract?
  escrowTx          EscrowTransaction[]
  @@index([paymentStatus, expiresAt])
  @@map("holding_deposits")
}

// ===== 8. XÁC THỰC DANH TÍNH (thay OCR) =====
enum IdentityStatus { SUBMITTED VERIFIED NEEDS_REVIEW REJECTED }

model IdentityVerification {
  id                 String         @id @default(uuid()) @db.Uuid
  tenantId           String         @map("tenant_id") @db.Uuid
  depositId          String?        @unique @map("deposit_id") @db.Uuid
  providerName       String         @map("provider_name") @db.VarChar(50)
  providerRefId      String         @map("provider_reference_id") @db.VarChar(100)
  confidenceScore    Float?         @map("confidence_score")
  c06Confirmed       Boolean        @default(false) @map("c06_confirmed")
  status             IdentityStatus @default(SUBMITTED)
  verifiedDataRef    String?        @map("verified_data_ref")  // ciphertext trong Vault
  consentAt          DateTime       @map("consent_at") @db.Timestamptz
  consentVersion     String         @map("consent_version") @db.VarChar(20)
  reviewedById       String?        @map("reviewed_by_id") @db.Uuid
  verifiedAt         DateTime?      @map("verified_at") @db.Timestamptz
  rawDataPurgeAt     DateTime       @map("raw_data_purge_at") @db.Timestamptz
  rawDataPurgedAt    DateTime?      @map("raw_data_purged_at") @db.Timestamptz
  tenant             Profile        @relation(fields: [tenantId], references: [id])
  deposit            HoldingDeposit? @relation(fields: [depositId], references: [id])
  @@map("identity_verifications")
}

// ===== 9. HỢP ĐỒNG THUÊ =====
enum ContractStatus { DRAFT AWAITING_TENANT_SIGN AWAITING_LANDLORD_SIGN ACTIVE TERMINATED_SETTLED DISPUTED }

model Contract {
  id                    String         @id @default(uuid()) @db.Uuid
  contractNumber        String         @unique @map("contract_number") @db.VarChar(50)
  unitId                String         @map("unit_id") @db.Uuid
  holdingDepositId      String         @unique @map("holding_deposit_id") @db.Uuid
  tenantId              String         @map("tenant_id") @db.Uuid
  landlordId            String         @map("landlord_id") @db.Uuid
  documentId            String?        @unique @map("document_id") @db.Uuid
  leaseTermMonths       Int            @default(12) @map("lease_term_months")
  startDate             DateTime       @map("start_date") @db.Date
  endDate               DateTime       @map("end_date") @db.Date
  monthlyRentPrice      Decimal        @map("monthly_rent_price") @db.Decimal(12, 2)
  securityDepositAmount Decimal        @map("security_deposit_amount") @db.Decimal(12, 2)
  status                ContractStatus @default(DRAFT)
  unit                  Unit           @relation(fields: [unitId], references: [id])
  holdingDeposit        HoldingDeposit @relation(fields: [holdingDepositId], references: [id])
  tenant                Profile        @relation("TenantContracts", fields: [tenantId], references: [id])
  landlord              Profile        @relation("LandlordContracts", fields: [landlordId], references: [id])
  document              SignedDocument? @relation(fields: [documentId], references: [id])
  handovers             DigitalHandover[]
  @@map("contracts")
}

// ===== 10. HỘ CHIẾU BÀN GIAO =====
enum HandoverType { CHECK_IN CHECK_OUT }

model DigitalHandover {
  id               String       @id @default(uuid()) @db.Uuid
  contractId       String       @map("contract_id") @db.Uuid
  handoverType     HandoverType @map("handover_type")
  inspectorHostId  String?      @map("inspector_host_id") @db.Uuid
  inspectedAt      DateTime     @default(now()) @map("inspected_at") @db.Timestamptz
  signedByTenantAt DateTime?    @map("signed_by_tenant_at") @db.Timestamptz
  reportSha256     String?      @map("report_sha256") @db.VarChar(64)
  contract         Contract     @relation(fields: [contractId], references: [id])
  items            HandoverItem[]
  utilityReadings  UtilityReading[]
  @@map("digital_handovers")
}
model HandoverItem {
  id            String   @id @default(uuid()) @db.Uuid
  handoverId    String   @map("handover_id") @db.Uuid
  itemCategory  String   @map("item_category") @db.VarChar(50)
  conditionNote String?  @map("condition_note")
  photos        Json     @default("[]")   // [{key, sha256, takenAt, lat, lng}]
  isNormalWear  Boolean  @default(true) @map("is_normal_wear")
  deductionCost Decimal  @default(0) @map("deduction_cost") @db.Decimal(12, 2)
  handover      DigitalHandover @relation(fields: [handoverId], references: [id], onDelete: Cascade)
  @@map("handover_items")
}
model UtilityReading {
  id           String   @id @default(uuid()) @db.Uuid
  handoverId   String   @map("handover_id") @db.Uuid
  utilityType  String   @map("utility_type") @db.VarChar(20)   // ELECTRICITY | WATER
  meterIndex   Decimal  @map("meter_index") @db.Decimal(10, 2) // Host nhập tay
  photoKey     String   @map("photo_key")
  recordedAt   DateTime @default(now()) @map("recorded_at") @db.Timestamptz
  handover     DigitalHandover @relation(fields: [handoverId], references: [id], onDelete: Cascade)
  @@map("utility_readings")
}

// ===== 11. TIỀN, BIẾN PHÍ, AUDIT =====
model EscrowTransaction {           // 🔵 🟡 đổi tên/cấu trúc nếu mô hình ký quỹ thay đổi
  id              String   @id @default(uuid()) @db.Uuid
  depositId       String   @map("deposit_id") @db.Uuid
  transType       String   @map("trans_type") @db.VarChar(50)   // INBOUND_DEPOSIT | REFUND | DEDUCTION
  amount          Decimal  @db.Decimal(12, 2)
  bankRefNumber   String   @unique @map("bank_ref_number") @db.VarChar(100) // idempotency
  executedAt      DateTime @default(now()) @map("executed_at") @db.Timestamptz
  deposit         HoldingDeposit @relation(fields: [depositId], references: [id])
  @@map("escrow_transactions")
}
model HostPayout {
  id           String    @id @default(uuid()) @db.Uuid
  hostId       String    @map("host_id") @db.Uuid
  amount       Decimal   @db.Decimal(12, 2)
  period       String    @db.VarChar(50)
  status       String    @default("PENDING") @db.VarChar(20)
  transRef     String?   @map("trans_ref") @db.VarChar(100)
  settledAt    DateTime? @map("settled_at") @db.Timestamptz
  host         FieldHost @relation(fields: [hostId], references: [id])
  @@map("host_payouts")
}
model FeeConfig {                   // gồm cả holding_duration_days = 7
  id          String   @id @default(uuid()) @db.Uuid
  configKey   String   @unique @map("config_key") @db.VarChar(50)
  paramValue  Decimal  @map("param_value") @db.Decimal(12, 2)
  paramUnit   String   @map("param_unit") @db.VarChar(20)
  updatedBy   String   @map("updated_by") @db.Uuid
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz
  @@map("fee_configs")
}
model AuditLog {                    // append-only: trigger chặn UPDATE/DELETE
  id          String   @id @default(uuid()) @db.Uuid
  actorId     String   @map("actor_id") @db.Uuid
  actorRole   String   @map("actor_role") @db.VarChar(30)
  actionType  String   @map("action_type") @db.VarChar(100)  // DOOR_KEY_REVEAL, IDENTITY_READ, FEE_CONFIG_UPDATE…
  entityName  String   @map("entity_name") @db.VarChar(50)
  entityId    String   @map("entity_id") @db.VarChar(100)
  oldValue    Json?    @map("old_value")
  newValue    Json?    @map("new_value")   // gồm ticket_id với DOOR_KEY_REVEAL
  ipAddress   String?  @map("ip_address") @db.VarChar(45)
  userAgent   String?  @map("user_agent")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  actor       Profile  @relation(fields: [actorId], references: [id])
  @@index([actionType, createdAt])
  @@index([entityName, entityId])
  @@map("audit_logs")
}
```

**Ghi chú schema:** (1) không có cột PIN/ảnh CCCD/dữ liệu định danh plaintext; (2) `AuditLog` append-only bằng trigger PostgreSQL, 🔵 có thể thêm hash-chain; (3) `system` actor cần một Profile kỹ thuật riêng nếu muốn ghi `actorId` — hoặc cho phép `actorId` null với `actor_role = 'system'` (🟡).
