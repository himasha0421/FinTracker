ALTER TABLE "financial_goals" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'generic' NOT NULL;
ALTER TABLE "financial_goals" ADD COLUMN IF NOT EXISTS "home_purchase_details" jsonb;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "registered_type" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "owner_person_key" text;
