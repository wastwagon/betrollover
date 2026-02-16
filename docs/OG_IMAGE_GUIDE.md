# OG Image Guide — BetRollover

## Overview

`web/public/og-image.png` is the Open Graph image used when your site is shared on social media (Facebook, Twitter/X, LinkedIn, WhatsApp, etc.).

**Dimensions:** 1200×630 px (recommended ratio 1.91:1)  
**URL:** https://betrollover.com/og-image.png

---

## Design Features (Current Image)

| Element | Implementation |
|---------|----------------|
| **Brand** | BetRollover name, teal (#0f766e) + amber (#d97706) palette |
| **Tagline** | "Your Shield Against Losses" |
| **Geography** | "Africa's Premier Tipster Marketplace" |
| **URL** | betrollover.com |
| **Style** | Clean, professional, trustworthy |

---

## Flow: How OG Images Work

```
User shares https://betrollover.com
    ↓
Platform (Facebook, Twitter, etc.) fetches the page
    ↓
Reads <meta property="og:image" content="https://betrollover.com/og-image.png" />
    ↓
Displays og-image.png as the preview thumbnail
```

**Metadata location:** `web/app/layout.tsx` — Open Graph images are defined in the `metadata.openGraph.images` array.

---

## When to Update the OG Image

1. **Rebrand** — New logo, colors, or tagline
2. **Campaigns** — Promotional images for specific launches
3. **A/B testing** — Different images to improve click-through on shares

---

## Creating a New OG Image

### Option A: Design Tool (Figma, Canva, etc.)

1. Create canvas: **1200×630 px**
2. Use brand colors: Primary `#0f766e`, Accent `#d97706`
3. Include: BetRollover, tagline, betrollover.com
4. Export as PNG
5. Save to `web/public/og-image.png`

### Option B: Next.js Dynamic OG (Advanced)

For per-page OG images (e.g. different image for marketplace vs home):

```tsx
// app/marketplace/page.tsx
export const metadata = {
  openGraph: {
    images: ['/og-marketplace.png'],
  },
};
```

### Option C: Regenerate via AI

Provide a description of the desired design and regenerate the image, then replace `web/public/og-image.png`.

---

## Validation

Test your OG image:

- **Facebook:** https://developers.facebook.com/tools/debug/
- **Twitter:** https://cards-dev.twitter.com/validator
- **LinkedIn:** Share a post and check the preview

**Note:** These platforms cache images. Use "Scrape Again" or similar to refresh after updates.
