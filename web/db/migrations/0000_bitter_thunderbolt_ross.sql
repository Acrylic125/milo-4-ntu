CREATE TYPE "public"."profile_role" AS ENUM('researcher', 'founder');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"contact" text NOT NULL,
	"links_raw" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synopsis" text DEFAULT '' NOT NULL,
	"opportunity" text DEFAULT '' NOT NULL,
	"technology" text DEFAULT '' NOT NULL,
	"applications" text DEFAULT '' NOT NULL,
	"role" "profile_role" DEFAULT 'researcher' NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"embedding" vector(384),
	"synopsis_embedding" vector(384),
	"opportunity_embedding" vector(384),
	"technology_embedding" vector(384),
	"applications_embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "profiles_embedding_idx" ON "profiles" USING hnsw ("embedding" vector_cosine_ops);