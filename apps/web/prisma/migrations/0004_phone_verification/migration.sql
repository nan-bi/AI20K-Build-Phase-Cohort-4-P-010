-- OTP no longer logs anyone in (Google / email + password do). Zalo OTP only
-- proves a phone number is real, in its own flow, and records it here.
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'phone_verify';

ALTER TABLE "public"."profiles" ADD COLUMN "phone_verified_at" TIMESTAMP(3);
