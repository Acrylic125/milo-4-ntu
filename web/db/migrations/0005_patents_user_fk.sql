ALTER TABLE "patents" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'patents'
			AND column_name = 'profile_id'
	) AND EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = 'user_search_profiles'
	) THEN
		EXECUTE '
			UPDATE "patents" pat
			SET "user_id" = usp."user_id"
			FROM "user_search_profiles" usp
			WHERE pat."user_id" IS NULL
				AND pat."profile_id" = usp."id"
		';
	ELSIF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'patents'
			AND column_name = 'profile_id'
	) AND EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = 'profiles'
	) THEN
		EXECUTE '
			UPDATE "patents" pat
			SET "user_id" = p."user_id"
			FROM "profiles" p
			WHERE pat."user_id" IS NULL
				AND pat."profile_id" = p."id"
		';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "patents" DROP CONSTRAINT IF EXISTS "patents_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "patents" DROP CONSTRAINT IF EXISTS "patents_user_id_unique";
--> statement-breakpoint
ALTER TABLE "patents" DROP CONSTRAINT IF EXISTS "patents_user_id_user_id_fk";
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'patents_user_id_user_id_fk'
	) THEN
		ALTER TABLE "patents"
		ADD CONSTRAINT "patents_user_id_user_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
		ON DELETE cascade
		ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patents_user_id_idx" ON "patents" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patents_user_id_links_unique" ON "patents" USING btree ("user_id", "links");
--> statement-breakpoint
ALTER TABLE "patents" DROP COLUMN IF EXISTS "profile_id";
