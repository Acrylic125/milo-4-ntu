ALTER TABLE "profiles" ADD COLUMN "working_on" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "working_on_embedding" vector(384);
