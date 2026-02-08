CREATE TABLE "financial_goal_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"account_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_goal_accounts" ADD CONSTRAINT "financial_goal_accounts_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "financial_goal_accounts" ADD CONSTRAINT "financial_goal_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "financial_goal_accounts_goal_account_idx" ON "financial_goal_accounts" ("goal_id","account_id");
--> statement-breakpoint
INSERT INTO "financial_goal_accounts" ("goal_id","account_id")
SELECT id, linked_account_id
FROM "financial_goals"
WHERE linked_account_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT IF EXISTS "financial_goals_linked_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "financial_goals" DROP COLUMN IF EXISTS "linked_account_id";
