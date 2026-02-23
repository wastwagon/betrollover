-- Add cost settings and support for per-campaign analytics
ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS cost_per_click DECIMAL(10, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_mille DECIMAL(10, 4) DEFAULT 0;

COMMENT ON COLUMN ad_campaigns.cost_per_click IS 'Cost per click (CPC) in platform currency';
COMMENT ON COLUMN ad_campaigns.cost_per_mille IS 'Cost per 1000 impressions (CPM) in platform currency';
