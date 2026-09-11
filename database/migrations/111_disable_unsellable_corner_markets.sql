-- Disable period / race corner markets — we cannot settle them (FT stats only).
UPDATE market_config SET is_enabled = false
WHERE market_name IN (
  'Total Corners (1st Half)',
  'Total Corners (2nd Half)',
  'Corners Race To',
  'Race to Corners'
);
