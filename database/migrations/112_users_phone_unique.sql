-- Unique phones for email-or-phone signup. Multiple NULLs remain allowed.
-- If two accounts already share a number, keep the oldest and clear the rest.
UPDATE users u
SET phone = NULL
WHERE u.phone IS NOT NULL
  AND btrim(u.phone) <> ''
  AND EXISTS (
    SELECT 1 FROM users older
    WHERE older.phone = u.phone
      AND older.id < u.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users (phone)
  WHERE phone IS NOT NULL AND btrim(phone) <> '';
