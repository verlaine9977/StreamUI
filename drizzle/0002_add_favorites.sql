CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"imdb_id" text NOT NULL,
	"tmdb_id" integer,
	"trakt_id" integer,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"slug" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_profileId_idx" ON "favorites" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_favorite" ON "favorites" USING btree ("profile_id","imdb_id");
