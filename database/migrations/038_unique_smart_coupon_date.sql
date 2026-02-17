-- Clean up duplicate smart coupons before adding constraint
-- Keeps the newest entry (highest ID) for each date
DELETE FROM smart_coupons 
WHERE id NOT IN (
    SELECT MAX(id) 
    FROM smart_coupons 
    GROUP BY date
);

-- Add unique constraint to prevent future duplicates at the DB level
ALTER TABLE smart_coupons ADD CONSTRAINT unique_smart_coupon_date UNIQUE (date);
