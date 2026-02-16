-- Store leagues count for fixtures sync (so admin page can show "639 fixtures across N leagues")
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS last_sync_leagues INT DEFAULT 0;
