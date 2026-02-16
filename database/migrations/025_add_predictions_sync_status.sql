-- Add predictions sync status for automatic prediction generation tracking
INSERT INTO sync_status (sync_type, status) VALUES ('predictions', 'idle')
ON CONFLICT (sync_type) DO NOTHING;
