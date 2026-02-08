CREATE TABLE "transaction_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"assignee" text NOT NULL,
	"share_percent" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_assignments" ADD CONSTRAINT "transaction_assignments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "assignee";