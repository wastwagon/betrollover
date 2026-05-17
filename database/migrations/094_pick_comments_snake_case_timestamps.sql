-- Align pick_comments timestamp columns with TypeORM SnakeNamingStrategy (created_at / deleted_at).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pick_comments' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE pick_comments RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pick_comments' AND column_name = 'deletedAt'
  ) THEN
    ALTER TABLE pick_comments RENAME COLUMN "deletedAt" TO deleted_at;
  END IF;
END $$;

DROP INDEX IF EXISTS "IDX_pick_comments_accumulator_created";
CREATE INDEX IF NOT EXISTS "IDX_pick_comments_accumulator_created" ON pick_comments (accumulator_id, created_at DESC);
