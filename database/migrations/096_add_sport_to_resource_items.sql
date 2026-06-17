-- Sport tag on resource guides (NULL = applies to all sports)
ALTER TABLE resource_items
  ADD COLUMN IF NOT EXISTS sport VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS idx_resource_items_sport ON resource_items(sport);
