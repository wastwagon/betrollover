# Public assets

The app ships **`public/favicon.svg`** plus marketing PNGs used by the UI and social metadata.

| File | Purpose |
|------|---------|
| `BetRollover-logo.png` | 512×512 app / PWA icon, Apple touch icon, JSON-LD `Organization.logo` |
| `og-image.png` | 1200×630 Open Graph / X `summary_large_image` |
| `images/marketing/marketplace-strip.png` | Marketplace banner strip + optional empty state |

### File size budget (what to aim for)

| Asset | Where it shows | Good target |
|-------|----------------|-------------|
| `marketplace-strip.png` | Short strip (`h-28`–`md:h-40` ≈ 112–160px tall) | **~200 KB** or less; a wide panoramic (e.g. 1600×320–400) beats a tall 16:9 |

**Home hero** uses **`HomeHeroBackdrop`** (CSS mesh + inline SVG) — no raster file, negligible transfer size and no LCP image request.

Replace files under `public/images/marketing/` when you export new art; **commit** optimized PNGs (or WebP) so deploys stay fast.

**Suggested pixel sizes** (if re-exporting)

- **Marketplace strip:** **1600 × 320–400** (5:1-ish) matches the UI better than a full hero aspect ratio.

Wiring:

- `app/layout.tsx` → `metadata.icons`, `openGraph.images`, `twitter.images`
- `public/manifest.json` → `icons` / shortcut icons
- `components/JsonLdScript.tsx` → organization logo URL

See also: `docs/IMAGERY_STRATEGY.md`, `docs/RELEASE_PHASES.md`, `docs/RELEASE_CHECKLIST.md`.
