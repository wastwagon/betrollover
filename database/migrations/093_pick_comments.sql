-- Threaded pick comments for marketplace social engagement
CREATE TABLE IF NOT EXISTS "pick_comments" (
  "id" SERIAL PRIMARY KEY,
  "accumulator_id" integer NOT NULL REFERENCES "accumulator_tickets"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_id" integer REFERENCES "pick_comments"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS "IDX_pick_comments_accumulator" ON "pick_comments" ("accumulator_id");
CREATE INDEX IF NOT EXISTS "IDX_pick_comments_user" ON "pick_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_pick_comments_accumulator_created" ON "pick_comments" ("accumulator_id", "createdAt" DESC);
