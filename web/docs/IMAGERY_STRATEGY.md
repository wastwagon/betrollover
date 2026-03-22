# Adding more images to BetRollover (review + playbook)

## Current state (codebase)

| Area | What you use today |
|------|-------------------|
| **Home hero** | `hero-cinematic.avif` / `.webp` — photoreal multi-sport art, **~40–55 KB** combined transfer with `<picture>`. |
| **Home “how it works”** | **Inline SVG** components (`HomeStepArtwork`) — sharp at any size, no HTTP requests. |
| **Marketplace / tipsters / picks** | `next/image` on **avatars, team badges, pick visuals**, news covers, discover cards. |
| **Ads** | `next/image` with **`unoptimized`** (good: avoids optimizer quirks on random upload formats). |
| **Brand** | `public/favicon.svg` only — no dedicated marketing PNG set yet. |

So you already have **moderate** image use on **data-driven** pages; the **marketing** surface is mostly **vector/CSS**.

---

## If you want “much more” imagery — best places

1. **Hero (home)** — Optional **right-side or background** illustration (stadium abstract, shield motif, phone mockup). One **WebP + JPEG fallback** or **single high-quality JPEG** (~80–150 KB) avoids iOS WebKit WebP edge cases.  
2. **How it works / Learn / About** — Section **thumb images** or **icons-as-illustrations** (you can keep SVGs or add `public/images/guides/...`).  
3. **Empty states** — Marketplace / no results / wallet — small **illustrations** improve perceived quality.  
4. **Sport hubs** (`/marketplace/[sport]`) — **Sport banner** images (stored in `public/images/sports/football.jpg` etc.).  
5. **SEO / social** — `og-image.png` (1200×630) + optional **`BetRollover-logo.png`** in `public/` for Schema + shares.  
6. **News & resources** — You already support images in content; ensure **consistent aspect ratios** + **lazy loading** below the fold.

---

## Performance rules (especially with **WebView / WKWebView**)

1. **Above-the-fold hero** — Prefer **one JPEG or PNG** or tested **WebP**; avoid dozens of large optimiser URLs on first paint.  
2. **`next/image`** — Keep using it; set explicit **`width` / `height`** (or **`fill` + container**) and **`sizes`** so mobile doesn’t download desktop widths.  
3. **Remote / user uploads** — For **untrusted** URLs (ads, legacy uploads), **`unoptimized`** (as in `AdSlot`) is reasonable; enforce **max dimensions** on the API.  
4. **Lazy load** — Next Image lazy-loads by default **below the fold**; for hero, use **`priority`** only for **one** LCP candidate.  
5. **Monitor LCP** — After adding images, run **Lighthouse (mobile)**; LCP should stay **&lt; 2.5 s** on a mid-tier phone.  

---

## File layout suggestion

```
web/public/
  favicon.svg
  images/
    marketing/hero-home.jpg      # optional
    sports/football.jpg
    sports/basketball.jpg
    empty-states/no-picks.svg
  og-image.png                   # 1200×630 for social
  BetRollover-logo.png          # optional; update metadata + JsonLd
```

Reference in code: `/images/marketing/hero-home.jpg` (no import needed).

---

## Quick wins without a designer

- Reuse **same sport banners** across marketplace filters.  
- Use **high-quality stock** with licence (sports, stadiums abstract) — export **JPEG 1600w** max, compress.  
- Keep **inline SVGs** for step cards if you want zero extra requests; add **one** hero raster if you want a richer first impression.

---

## Related

- `web/docs/PUBLIC_ASSETS.md` — OG / logo filenames.  
- `next.config.js` — `images.formats`: AVIF/WebP; if WebView shows decode errors, test offending URL in Safari and consider **JPEG** for that asset only.
