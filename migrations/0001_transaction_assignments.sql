CREATE TABLE "transaction_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"assignee" text NOT NULL,
	"share_percent" numeric(5, 2) NOT NULL,
	CONSTRAINT "transaction_assignments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO "transaction_assignments" ("transaction_id", "assignee", "share_percent")
SELECT "id", "assignee", 100 FROM "transactions" WHERE "assignee" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "assignee";
--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_assignments_transaction_id_assignee_idx" ON "transaction_assignments" ("transaction_id","assignee");
