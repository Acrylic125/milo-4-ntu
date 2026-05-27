CREATE TABLE "patents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"title" text NOT NULL,
	"links" text NOT NULL,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "profiles_embedding_idx";--> statement-breakpoint
ALTER TABLE "patents" ADD CONSTRAINT "patents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_embedding_idx" ON "patents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "links_raw";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "links";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "synopsis";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "opportunity";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "technology";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "applications";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "embedding";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "synopsis_embedding";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "opportunity_embedding";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "technology_embedding";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "applications_embedding";