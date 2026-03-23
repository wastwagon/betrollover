-- Admin "Reject" sets status to 'rejected' (see admin.service updateWithdrawalStatus).
-- Migration 044 added 'cancelled' but omitted 'rejected', causing CHECK violations → 500 on PATCH.

ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected'));
