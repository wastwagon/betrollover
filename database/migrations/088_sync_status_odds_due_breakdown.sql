-- Add odds due breakdown counters to sync_status for admin observability
ALTER TABLE sync_status
  ADD COLUMN IF NOT EXISTS last_sync_due_missing INTEGER NULL,
  ADD COLUMN IF NOT EXISTS last_sync_due_stale INTEGER NULL;

