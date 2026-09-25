-- This migration targets an existing Supabase project: the "auth" schema and
-- "auth"."users" table are owned and already created by Supabase Auth, so
-- this migration does NOT create them (unlike a plain `prisma migrate diff`
-- against an empty database, which would try to and collide with Supabase's
-- own auth.users table). Only the FK from "profiles" to "auth"."users" is
-- added below. Everything else here is ours.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('tenant', 'host', 'landlord', 'admin');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "HostOperationalStatus" AS ENUM ('active', 'busy', 'off_duty');

-- CreateEnum
CREATE TYPE "LandlordStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('landlord_signup', 'landlord_login', 'host_login', 'tenant_viewing', 'tenant_deposit_sign');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('zalo', 'sms');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('pending', 'verified', 'expired', 'consumed');

-- CreateEnum
CREATE TYPE "LayoutType" AS ENUM ('Studio', '1PN+', '2PN_1WC', '2PN_2WC', '3PN');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('available', 'holding', 'rented');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('pending', 'confirmed', 'completed', 'no_show', 'cancelled');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('pending', 'paid', 'expired', 'refunded');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(120),
    "role" "UserRole" NOT NULL,
    "full_name" VARCHAR(100),
    "status" "ProfileStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_hosts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_block" TEXT NOT NULL DEFAULT 'Vinhomes Ocean Park - The Sapphire 1',
    "rfid_card_number" TEXT,
    "status" "HostOperationalStatus" NOT NULL DEFAULT 'active',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlords" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "LandlordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landlords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_allowlist" (
    "id" UUID NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_allowlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL DEFAULT 'zalo',
    "status" "OtpStatus" NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "consumed_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_log" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20),
    "user_id" UUID,
    "event" VARCHAR(50) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "unit_code" VARCHAR(50) NOT NULL,
    "block_name" VARCHAR(20) NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "layout_type" "LayoutType" NOT NULL,
    "net_area_sqm" DECIMAL(5,2) NOT NULL,
    "base_rent_price" DECIMAL(12,2) NOT NULL,
    "management_fee" DECIMAL(12,2) NOT NULL,
    "parking_fee_estimate" DECIMAL(12,2) NOT NULL DEFAULT 150000.00,
    "utility_cost_estimate" DECIMAL(12,2) NOT NULL DEFAULT 600000.00,
    "market_avg_price" DECIMAL(12,2) NOT NULL,
    "door_access_code" VARCHAR(50),
    "verified_images" JSONB NOT NULL DEFAULT '[]',
    "status" "UnitStatus" NOT NULL DEFAULT 'available',
    "is_hot" BOOLEAN NOT NULL DEFAULT false,
    "landlord_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewings" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "host_id" UUID,
    "tenant_name" VARCHAR(100) NOT NULL,
    "tenant_phone" VARCHAR(15) NOT NULL,
    "viewing_slot" TIMESTAMP(3) NOT NULL,
    "booking_ref_code" VARCHAR(100) NOT NULL,
    "status" "ViewingStatus" NOT NULL DEFAULT 'confirmed',
    "cancel_reason" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holding_deposits" (
    "id" UUID NOT NULL,
    "viewing_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "tenant_id_card_data" JSONB,
    "deposit_amount" DECIMAL(12,2) NOT NULL DEFAULT 2000000.00,
    "vietqr_payment_code" VARCHAR(100) NOT NULL,
    "payment_status" "DepositStatus" NOT NULL DEFAULT 'pending',
    "signed_agreement_url" VARCHAR(255),
    "signed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holding_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "field_hosts_user_id_key" ON "field_hosts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "landlords_user_id_key" ON "landlords"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_allowlist_email_key" ON "admin_allowlist"("email");

-- CreateIndex
CREATE INDEX "otp_codes_phone_purpose_status_idx" ON "otp_codes"("phone", "purpose", "status");

-- CreateIndex
CREATE INDEX "auth_audit_log_phone_idx" ON "auth_audit_log"("phone");

-- CreateIndex
CREATE INDEX "auth_audit_log_user_id_idx" ON "auth_audit_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_unit_code_key" ON "units"("unit_code");

-- CreateIndex
CREATE INDEX "units_status_idx" ON "units"("status");

-- CreateIndex
CREATE INDEX "units_layout_type_base_rent_price_idx" ON "units"("layout_type", "base_rent_price");

-- CreateIndex
CREATE INDEX "units_is_hot_idx" ON "units"("is_hot");

-- CreateIndex
CREATE UNIQUE INDEX "viewings_booking_ref_code_key" ON "viewings"("booking_ref_code");

-- CreateIndex
CREATE INDEX "viewings_viewing_slot_idx" ON "viewings"("viewing_slot");

-- CreateIndex
CREATE INDEX "viewings_unit_id_status_idx" ON "viewings"("unit_id", "status");

-- CreateIndex
CREATE INDEX "viewings_host_id_idx" ON "viewings"("host_id");

-- CreateIndex
CREATE UNIQUE INDEX "holding_deposits_viewing_id_key" ON "holding_deposits"("viewing_id");

-- CreateIndex
CREATE UNIQUE INDEX "holding_deposits_vietqr_payment_code_key" ON "holding_deposits"("vietqr_payment_code");

-- CreateIndex
CREATE INDEX "holding_deposits_payment_status_idx" ON "holding_deposits"("payment_status");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_hosts" ADD CONSTRAINT "field_hosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlords" ADD CONSTRAINT "landlords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "landlords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "field_hosts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holding_deposits" ADD CONSTRAINT "holding_deposits_viewing_id_fkey" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holding_deposits" ADD CONSTRAINT "holding_deposits_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

