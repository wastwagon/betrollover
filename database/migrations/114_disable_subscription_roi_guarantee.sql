-- VIP packages are escrow + platform commission only. No ROI-period refunds.
UPDATE tipster_subscription_packages
SET roi_guarantee_enabled = false,
    roi_guarantee_min = NULL
WHERE roi_guarantee_enabled = true
   OR roi_guarantee_min IS NOT NULL;
