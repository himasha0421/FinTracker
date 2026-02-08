CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"account_id" integer,
	"symbol" text,
	"institution" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"current_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"monthly_contribution" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "investment_contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"investment_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "investment_contributions_investment_date_idx" ON "investment_contributions" ("investment_id","date");
