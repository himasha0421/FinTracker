CREATE TABLE "investment_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "group_id" integer;
--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_group_id_investment_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."investment_groups"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "investments_group_id_idx" ON "investments" ("group_id");
