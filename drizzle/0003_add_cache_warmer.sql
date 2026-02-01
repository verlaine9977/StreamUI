CREATE TABLE "cache_warmer_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"media_type" text NOT NULL,
	"imdb_id" text NOT NULL,
	"title" text NOT NULL,
	"season" integer,
	"episode" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text,
	"source_url" text,
	"debrid_service" text,
	"debrid_file_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "cache_warmer_jobs" ADD CONSTRAINT "cache_warmer_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cache_warmer_jobs" ADD CONSTRAINT "cache_warmer_jobs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cache_warmer_userId_idx" ON "cache_warmer_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cache_warmer_profileId_idx" ON "cache_warmer_jobs" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "cache_warmer_status_idx" ON "cache_warmer_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_cache_job" ON "cache_warmer_jobs" USING btree ("user_id","imdb_id",COALESCE("season",-1),COALESCE("episode",-1));
