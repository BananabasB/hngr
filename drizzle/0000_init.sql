-- 1. Create Enums
CREATE TYPE "public"."game_event_severity" AS ENUM('minor', 'normal', 'major', 'critical');
CREATE TYPE "public"."game_event_type" AS ENUM('kill', 'death', 'alliance', 'item_found', 'winner', 'game_start', 'game_end');
CREATE TYPE "public"."season_status" AS ENUM('draft', 'active', 'completed', 'archived');
CREATE TYPE "public"."simulation_event_status" AS ENUM('approved', 'pending', 'rejected');
CREATE TYPE "public"."simulation_event_type" AS ENUM('kill', 'kill2', 'alliance', 'find', 'feast', 'generic', 'training', 'combat');

-- 2. Create Tables
CREATE TABLE "custom_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" timestamp with time zone NOT NULL,
	"location" text,
	"max_attendees" integer,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "event_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_attendees_event_id_user_id_unique" UNIQUE("event_id","user_id")
);

CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "friendships_user_id_friend_id_unique" UNIQUE("user_id","friend_id")
);

CREATE TABLE "game_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"event_type" "game_event_type" NOT NULL,
	"description" text NOT NULL,
	"participant_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"district_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"event_data" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"severity" "game_event_severity" DEFAULT 'normal' NOT NULL
);

CREATE TABLE "game_tributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"tribute_id" uuid,
	"district" integer NOT NULL,
	"position" integer NOT NULL,
	"custom_tribute_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_tributes_game_id_district_position_unique" UNIQUE("game_id","district","position")
);

CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"season_id" uuid,
	"name" text NOT NULL,
	"tribute_data" jsonb NOT NULL,
	"game_number" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_season_id_game_number_unique" UNIQUE("season_id","game_number")
);

CREATE TABLE "nomination_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomination_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nomination_reports_nomination_id_reporter_id_unique" UNIQUE("nomination_id","reporter_id")
);

CREATE TABLE "nomination_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomination_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nomination_votes_nomination_id_user_id_unique" UNIQUE("nomination_id","user_id")
);

CREATE TABLE "nominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nominator_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"tribute_name" text NOT NULL,
	"tribute_pronouns" jsonb DEFAULT '{"subject":"they","object":"them","possessive":"their","reflexive":"themselves"}'::jsonb NOT NULL,
	"tribute_image_url" text,
	"tribute_bio" text,
	"message" text,
	"income" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);

CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "season_status" DEFAULT 'draft' NOT NULL,
	"current_game_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "simulation_event_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"type" "simulation_event_type" NOT NULL,
	"roles" jsonb NOT NULL,
	"text_template" text NOT NULL,
	"effect_json" jsonb,
	"status" "simulation_event_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "tributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"pronouns" jsonb DEFAULT '{"subject":"they","object":"them","possessive":"their","reflexive":"themselves"}'::jsonb NOT NULL,
	"image_url" text,
	"bio" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"display_name" text,
	"avatar_url" text,
	"is_plus" boolean DEFAULT false NOT NULL,
	"plus_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- 3. Apply Foreign Keys
ALTER TABLE "custom_events" ADD CONSTRAINT "custom_events_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_custom_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."custom_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- 4. Corrected Column Type Changes (Added USING clause)
ALTER TABLE "game_events" ALTER COLUMN "game_id" TYPE uuid USING "game_id"::uuid;
ALTER TABLE "game_tributes" ALTER COLUMN "game_id" TYPE uuid USING "game_id"::uuid;

-- Add remaining FKs
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_tributes" ADD CONSTRAINT "game_tributes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_tributes" ADD CONSTRAINT "game_tributes_tribute_id_tributes_id_fk" FOREIGN KEY ("tribute_id") REFERENCES "public"."tributes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "games" ADD CONSTRAINT "games_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "games" ADD CONSTRAINT "games_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nomination_reports" ADD CONSTRAINT "nomination_reports_nomination_id_nominations_id_fk" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nomination_reports" ADD CONSTRAINT "nomination_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nomination_votes" ADD CONSTRAINT "nomination_votes_nomination_id_nominations_id_fk" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nomination_votes" ADD CONSTRAINT "nomination_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nominations" ADD CONSTRAINT "nominations_nominator_id_users_id_fk" FOREIGN KEY ("nominator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nominations" ADD CONSTRAINT "nominations_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "simulation_event_templates" ADD CONSTRAINT "simulation_event_templates_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tributes" ADD CONSTRAINT "tributes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- 5. Create Indexes
CREATE INDEX "idx_custom_events_creator_id" ON "custom_events" ("creator_id");
CREATE INDEX "idx_custom_events_is_public" ON "custom_events" ("is_public");
CREATE INDEX "idx_custom_events_event_date" ON "custom_events" ("event_date");
CREATE INDEX "idx_event_attendees_event_id" ON "event_attendees" ("event_id");
CREATE INDEX "idx_event_attendees_user_id" ON "event_attendees" ("user_id");
CREATE INDEX "idx_friendships_user_id" ON "friendships" ("user_id");
CREATE INDEX "idx_friendships_friend_id" ON "friendships" ("friend_id");
CREATE INDEX "idx_friendships_status" ON "friendships" ("status");
CREATE INDEX "idx_game_events_game_id" ON "game_events" ("game_id");
CREATE INDEX "idx_game_events_event_type" ON "game_events" ("event_type");
CREATE INDEX "idx_game_events_timestamp" ON "game_events" ("timestamp");
CREATE INDEX "idx_game_tributes_game_id" ON "game_tributes" ("game_id");
CREATE INDEX "idx_game_tributes_tribute_id" ON "game_tributes" ("tribute_id");
CREATE INDEX "idx_games_owner_id" ON "games" ("owner_id");
CREATE INDEX "idx_games_season_id" ON "games" ("season_id");
CREATE INDEX "idx_games_is_current" ON "games" ("is_current");
CREATE INDEX "idx_nomination_reports_nomination_id" ON "nomination_reports" ("nomination_id");
CREATE INDEX "idx_nomination_reports_reporter_id" ON "nomination_reports" ("reporter_id");
CREATE INDEX "idx_nomination_votes_nomination_id" ON "nomination_votes" ("nomination_id");
CREATE INDEX "idx_nomination_votes_user_id" ON "nomination_votes" ("user_id");
CREATE INDEX "idx_nominations_nominator_id" ON "nominations" ("nominator_id");
CREATE INDEX "idx_nominations_recipient_id" ON "nominations" ("recipient_id");
CREATE INDEX "idx_nominations_status" ON "nominations" ("status");
CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX "idx_notifications_read" ON "notifications" ("read");
CREATE INDEX "idx_notifications_created_at" ON "notifications" ("created_at");
CREATE INDEX "idx_seasons_owner_id" ON "seasons" ("owner_id");
CREATE INDEX "idx_seasons_status" ON "seasons" ("status");
CREATE INDEX "idx_simulation_event_templates_creator_id" ON "simulation_event_templates" ("creator_id");
CREATE INDEX "idx_simulation_event_templates_status" ON "simulation_event_templates" ("status");
CREATE INDEX "idx_tributes_owner_id" ON "tributes" ("owner_id");
CREATE INDEX "idx_tributes_is_public" ON "tributes" ("is_public");
