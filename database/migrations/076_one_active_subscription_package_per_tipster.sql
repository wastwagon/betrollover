-- One active VIP package per tipster (enforced in DB + app).
-- Deactivate older duplicates so the unique partial index can be created.

UPDATE tipster_subscription_packages p
SET status = 'inactive'
WHERE p.status = 'active'
  AND p.id IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY tipster_user_id ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
      FROM tipster_subscription_packages
      WHERE status = 'active'
    ) ranked
    WHERE ranked.rn > 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_pkg_one_active_per_tipster
  ON tipster_subscription_packages (tipster_user_id)
  WHERE status = 'active';
