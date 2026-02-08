ALTER TABLE "financial_goals" ADD COLUMN "linked_account_id" integer;
--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
