# Security & SEO Enhancements — Go-Live Checklist

This document summarizes the security and SEO improvements added to BetRollover for production readiness.

---

## Security Enhancements

### 1. Backend (NestJS) — Helmet Security Headers

**Location:** `backend/src/main.ts`

Helmet adds industry-standard HTTP security headers:

- **X-DNS-Prefetch-Control** — Controls browser DNS prefetching
- **X-Frame-Options** — Prevents clickjacking (SAMEORIGIN)
- **X-Content-Type-Options** — Prevents MIME sniffing (nosniff)
- **X-XSS-Protection** — Legacy XSS filter for older browsers
- **Strict-Transport-Security** — HSTS (when served over HTTPS)

CSP and COEP are disabled to avoid breaking Paystack embeds and inline scripts. You can tighten these later if needed.

### 2. Backend — Login Rate Limiting

**Location:** `backend/src/modules/auth/auth.controller.ts`

- **Login:** 5 attempts per 5 minutes per IP (brute-force protection)
- **OTP send:** 5 per 15 min (already existed)
- **Register:** 5 per hour (already existed)
- **Resend verification:** 3 per 5 min (already existed)

### 3. Next.js — Security Headers

**Location:** `web/next.config.js`

Headers applied to all routes:

- X-DNS-Prefetch-Control
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

---

## SEO Enhancements

### 1. Metadata (Open Graph & Twitter)

**Location:** `web/app/layout.tsx`, `web/lib/site-config.ts`

- **metadataBase** — Resolves relative URLs for OG images
- **Open Graph** — Title, description, locale (en_GH), images
- **Twitter Cards** — summary_large_image
- **Keywords** — football tips, betting tips, tipster marketplace, etc.
- **Robots** — index, follow (configurable per-page)
- **Canonical URL** — Set via `NEXT_PUBLIC_APP_URL`

### 2. Dynamic Sitemap

**Location:** `web/app/sitemap.ts`

Generates `/sitemap.xml` with:

- Home, marketplace, predictions, leaderboard, tipsters
- Coupons archive, about, contact, terms, privacy
- Login, register

Uses `NEXT_PUBLIC_APP_URL` for correct URLs.

### 3. Dynamic robots.txt

**Location:** `web/app/robots.ts`

Generates `/robots.txt` with:

- **Allow:** Public pages (marketplace, predictions, leaderboard, etc.)
- **Disallow:** Admin, dashboard, profile, wallet, my-picks, my-purchases, notifications, create-pick, api-proxy
- **Sitemap:** Points to `/sitemap.xml`

### 4. JSON-LD Structured Data

**Location:** `web/app/layout.tsx`

WebSite schema with SearchAction for marketplace search. Helps search engines understand your site.

---

## Environment Variables for Production

Add to your production `.env`:

```bash
# Required for correct SEO URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Already required
APP_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Premium SEO (Africa + Global)

### Implemented

- **hreflang** — Home, marketplace, predictions, leaderboard use Africa locales (en-GH, en-NG, en-ZA, en-KE, x-default)
- **Organization schema** — JSON-LD with areaServed: Ghana, Nigeria, Kenya, South Africa
- **WebSite schema** — Linked to Organization, inLanguage for Africa
- **Africa keywords** — Ghana, Nigeria, Kenya, South Africa betting tips in metadata
- **Open Graph alternateLocale** — en_NG, en_ZA, en_KE for social sharing
- **Image optimization** — AVIF/WebP formats, responsive sizes in next.config
- **googleBot directives** — max-snippet, max-image-preview for rich results

### Optional: Further Improvements

### 1. OG Image (Recommended)

Add a dedicated Open Graph image (1200×630 px) for social sharing:

- Place at `web/public/og-image.png`
- Update `web/app/layout.tsx` metadata: `images: [{ url: '/og-image.png', width: 1200, height: 630 }]`

### 2. Google / Yandex Verification

When you have verification codes, add to `web/app/layout.tsx`:

```ts
verification: {
  google: 'your-google-verification-code',
  yandex: 'your-yandex-verification-code',
},
```

### 3. HSTS (Production)

If using a reverse proxy (Nginx, Cloudflare), enable HSTS there. Do not enable in Next.js unless you are certain all traffic is HTTPS.

### 4. Content Security Policy (CSP)

If you want stricter CSP, add a custom policy in `next.config.js` or `backend/src/main.ts`. Test thoroughly—CSP can break Paystack, analytics, or inline scripts.

---

## Pre-Existing Build Note

The `/verify-email` page has a `useSearchParams()` Suspense boundary issue that can cause build failures. Wrap the component using `useSearchParams` in `<Suspense>` to fix. This is unrelated to the security/SEO changes.
