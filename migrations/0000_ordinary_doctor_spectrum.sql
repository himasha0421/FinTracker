CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"type" text NOT NULL,
	"icon" text DEFAULT 'wallet',
	"color" text DEFAULT 'green'
);
--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_amount" numeric(12, 2) NOT NULL,
	"current_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"target_date" timestamp NOT NULL,
	"status" text DEFAULT 'in-progress' NOT NULL,
	"icon" text DEFAULT 'target',
	"color" text DEFAULT 'blue'
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"account_id" integer NOT NULL,
	"category" text,
	"type" text NOT NULL,
	"icon" text DEFAULT 'credit-card',
	"assignee" text DEFAULT 'None' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
