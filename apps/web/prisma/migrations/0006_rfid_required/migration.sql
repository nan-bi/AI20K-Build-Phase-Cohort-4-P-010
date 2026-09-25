-- RFID card number is now required (Admin must provide it)
ALTER TABLE "public"."field_hosts" ALTER COLUMN "rfid_card_number" SET NOT NULL;
