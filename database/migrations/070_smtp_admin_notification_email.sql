-- Optional inbox for platform/admin alerts (withdrawals, support, etc.). Merged with admin user emails; deduplicated when sending.
ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS admin_notification_email VARCHAR(255);
