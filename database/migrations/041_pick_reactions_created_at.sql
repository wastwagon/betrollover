-- Normalize pick_reactions timestamp column to created_at (TypeORM SnakeNamingStrategy)
-- Safe to run: only renames if column is currently "createdAt"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pick_reactions' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE pick_reactions RENAME COLUMN "createdAt" TO created_at;
  END IF;
END $$;
