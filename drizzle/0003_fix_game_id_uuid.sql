-- 3. Fix casts: cast game_id columns to UUID using explicit cast
-- This migration ensures existing text-based UUIDs in game_events.game_id and game_tributes.game_id
-- are safely converted to UUID type without data loss. Idempotent guards added.
DO $$
BEGIN
  -- If game_events.game_id is not uuid, cast it
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='game_events' AND column_name='game_id') <> 'uuid' THEN
    EXECUTE 'ALTER TABLE "game_events" ALTER COLUMN "game_id" TYPE uuid USING "game_id"::uuid';
  END IF;
END$$;

DO $$
BEGIN
  -- If game_tributes.game_id is not uuid, cast it
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='game_tributes' AND column_name='game_id') <> 'uuid' THEN
    EXECUTE 'ALTER TABLE "game_tributes" ALTER COLUMN "game_id" TYPE uuid USING "game_id"::uuid';
  END IF;
END$$;

-- Re-add foreign keys (safe to run multiple times)
DO $$BEGIN
  BEGIN
    ALTER TABLE IF EXISTS "game_events" DROP CONSTRAINT IF EXISTS "game_events_game_id_games_id_fk";
  EXCEPTION WHEN OTHERS THEN END;
  BEGIN
    ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN OTHERS THEN END;
END$$;

DO $$BEGIN
  BEGIN
    ALTER TABLE IF EXISTS "game_tributes" DROP CONSTRAINT IF EXISTS "game_tributes_game_id_games_id_fk";
  EXCEPTION WHEN OTHERS THEN END;
  BEGIN
    ALTER TABLE "game_tributes" ADD CONSTRAINT "game_tributes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN OTHERS THEN END;
END$$;
