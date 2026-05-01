CREATE TABLE IF NOT EXISTS "tax_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "tax_year" integer DEFAULT 2026 NOT NULL,
  "province" text DEFAULT 'MB' NOT NULL,
  "household" jsonb NOT NULL,
  "person_a" jsonb NOT NULL,
  "person_b" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tax_plan_scenarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "name" text NOT NULL,
  "mode" text NOT NULL,
  "overrides" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "tax_plan_scenarios" ADD CONSTRAINT "tax_plan_scenarios_plan_id_tax_plans_id_fk"
 FOREIGN KEY ("plan_id") REFERENCES "public"."tax_plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
