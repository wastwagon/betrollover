-- Add pick_reactions table for like reactions on marketplace picks
CREATE TABLE IF NOT EXISTS "pick_reactions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "accumulator_id" integer NOT NULL REFERENCES "accumulator_tickets"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL DEFAULT 'like',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_pick_reactions_user_accumulator" UNIQUE ("user_id", "accumulator_id")
);
CREATE INDEX IF NOT EXISTS "IDX_pick_reactions_accumulator" ON "pick_reactions" ("accumulator_id");
