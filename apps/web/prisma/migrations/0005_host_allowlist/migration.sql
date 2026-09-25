-- Admin no longer signs in with Google + an email allowlist (admins are
-- created by script, email + password).
DROP TABLE "public"."admin_allowlist";

-- Field Hosts: the row now exists before the person has an account. `email`
-- is the invite key (the Admin creates the row; signing up with that email
-- claims it), so `user_id` becomes nullable until then.
ALTER TABLE "public"."field_hosts" ADD COLUMN "email" VARCHAR(120);
UPDATE "public"."field_hosts" f SET "email" = p."email" FROM "public"."profiles" p WHERE p."id" = f."user_id";
-- Fails (rather than deleting data) if a host had no email to backfill.
ALTER TABLE "public"."field_hosts" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "field_hosts_email_key" ON "public"."field_hosts"("email");

ALTER TABLE "public"."field_hosts" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "public"."field_hosts" DROP CONSTRAINT "field_hosts_user_id_fkey";
ALTER TABLE "public"."field_hosts" ADD CONSTRAINT "field_hosts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
