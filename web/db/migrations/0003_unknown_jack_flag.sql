ALTER TABLE "profiles" RENAME COLUMN "working_on" TO "looking_for";--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "working_on_embedding" TO "looking_for_embedding";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'researcher'::text;--> statement-breakpoint
DROP TYPE "public"."profile_role";--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('student', 'researcher');--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'researcher'::"public"."profile_role";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE "public"."profile_role" USING "role"::"public"."profile_role";