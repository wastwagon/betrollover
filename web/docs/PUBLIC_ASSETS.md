# Public assets

The app ships **`public/favicon.svg`** plus marketing PNGs used by the UI and social metadata.

| File | Purpose |
|------|---------|
| `BetRollover-logo.png` | 512×512 app / PWA icon, Apple touch icon, JSON-LD `Organization.logo` |
| `og-image.png` | 1200×630 Open Graph / X `summary_large_image` |
| `images/marketing/hero-panel.png` | Home hero (`HomeHero`, `next/image` + `priority`) |
| `images/marketing/marketplace-strip.png` | Marketplace banner strip + optional empty state |

Wiring:

- `app/layout.tsx` → `metadata.icons`, `openGraph.images`, `twitter.images`
- `public/manifest.json` → `icons` / shortcut icons
- `components/JsonLdScript.tsx` → organization logo URL

See also: `docs/IMAGERY_STRATEGY.md`, `docs/RELEASE_PHASES.md`, `docs/RELEASE_CHECKLIST.md`.
