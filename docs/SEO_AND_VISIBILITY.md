# SEO & Visibility — Getting More Audience

This doc summarises what’s in place and practical next steps to grow visibility and audience for BetRollover.

**Positioning:** Ghana-based; **global audience standard**. All major global sports covered; worldwide coverage and multi-currency (GHS + others).

---

## What’s Already in Place

| Area | Implementation |
|------|----------------|
| **Metadata** | Root layout: title template, description, keywords, Open Graph, Twitter cards, `metadataBase`, `robots` |
| **Canonical & languages** | Key pages use `alternates.canonical` and `languages` (hreflang) for EN/FR |
| **Sitemap** | `/sitemap.xml` — all public pages including EN + FR; high-value pages (marketplace, tipsters, discover) with daily/weekly `changefreq` |
| **Robots** | `/robots.txt` — allow public pages; disallow `/admin/`, `/dashboard`, `/profile`, `/wallet`, etc.; sitemap URL and host set |
| **Structured data** | Organization + WebSite (with SearchAction, keywords, inLanguage); FAQPage on How It Works; Article on news and on **Learn** page; Person on tipster profiles; Breadcrumb on home |
| **Keywords** | `site-config`: Africa-focused and long-tail terms (e.g. “betting tips Ghana”, “football tips today”, “tipster platform”) |
| **Social** | Telegram in Organization `sameAs`; OG images and Twitter card; optional real Twitter/Facebook when you add them |

---

## Next Steps to Grow Audience

### 1. Google Search Console (GSC)

- Add the property: [Search Console](https://search.google.com/search-console) → Add property → URL prefix `https://betrollover.com`
- Verify via DNS (TXT) or HTML tag (add to layout if needed)
- Submit sitemap: `https://betrollover.com/sitemap.xml`
- Use **Performance** to see queries, clicks, impressions; **Coverage** to fix any indexing issues
- Use **URL Inspection** for important URLs (home, marketplace, how-it-works) to request indexing after big updates

### 2. Content for SEO

- **Learn page (`/learn`):** Static rich content — glossary (escrow, ROI, win rate, settlement, accumulator, void, coupon, tipster), "How to evaluate a tipster", "Getting the most from the marketplace". Good for long-tail queries and E-E-A-T. Linked from Discover, Resources, and footer.
- **Discover / News / Resources:** Publish regularly. Target phrases like “football tips today”, “Ghana betting tips”, “tipster strategy”, “escrow sports picks”
- **How It Works / About:** Already target “escrow tipster”, “verified tipsters”, “refund if tips lose” — keep these pages updated when you change product
- **Landing intent:** Consider short pages or sections for “free football tips”, “tipster marketplace Ghana”, “buy sports picks” with clear CTAs to register or marketplace

### 3. Technical Checks

- **Core Web Vitals:** Use Lighthouse (Chrome DevTools or PageSpeed Insights). Aim for green LCP, FID, CLS
- **Mobile:** Site is mobile-first; test on real devices and in GSC’s mobile usability report
- **HTTPS:** Enforce everywhere (redirect HTTP → HTTPS)
- **OG image:** Ensure `/og-image.png` (1200×630) exists in `web/public/` and looks good when shared

### 4. Off-Site Visibility

- **Backlinks:** Get listed on relevant directories (sports, Ghana/Nigeria/Kenya business or betting-adjacent), partner sites, and quality guest posts
- **Telegram / Social:** Link to site from Telegram, and (when you have them) Twitter/Facebook; use same handle/brand as in `sameAs`
- **Referral programme:** Your existing Invite & Earn helps word-of-mouth; mention it in support and on social

### 5. Positioning: Ghana-based, Global Audience Standard

- **Messaging:** BetRollover is **Ghana-based** with a **global audience standard**. Copy and SEO emphasise **all major global sports** (football, basketball, tennis, MMA, rugby, hockey, etc.) and **worldwide coverage** — leagues and tipsters from every region. GHS and multi-currency.
- **Keywords:** Mix of global terms (“global sports tips”, “Premier League tips”, “NBA picks”, “international tipster”) and regional (“betting tips Ghana”, “Nigeria tipsters”) for discoverability everywhere.
- **French:** French routes and hreflang in place for French-speaking users worldwide; add French content in Discover/News/Resources to capture Francophone search.

---

## Quick Checklist

- [ ] Verify site in Google Search Console and submit sitemap
- [ ] Add real Twitter (and optional Facebook) URLs to `sameAs` in `JsonLdScript` when available
- [ ] Confirm `og-image.png` exists and looks good
- [ ] Publish and link 2–4 pieces of content (news/guides) targeting main keywords
- [ ] Run Lighthouse on home, marketplace, how-it-works; fix any critical issues
- [ ] Optional: Add more FAQ or HowTo structured data on other key pages (e.g. marketplace, support)

---

## Files Touched for SEO

- `web/lib/site-config.ts` — `SITE_DESCRIPTION`, `SITE_KEYWORDS`, `TELEGRAM_ADS_URL`
- `web/app/layout.tsx` — default metadata, OG, Twitter, robots
- `web/app/sitemap.ts` — URL list, priorities, `changefreq`
- `web/app/robots.ts` — allow/disallow, sitemap, host
- `web/components/JsonLdScript.tsx` — Organization, WebSite (SearchAction, keywords, inLanguage, sameAs)
- `web/components/FaqJsonLd.tsx` — FAQPage for How It Works
- `web/components/BreadcrumbJsonLd.tsx` — BreadcrumbList (e.g. home)
- `web/app/learn/` — Learn page (glossary, how to evaluate tipsters, marketplace guide) with Article JSON-LD and full metadata
- Page-level: `metadata` / `generateMetadata` and JSON-LD on home, how-it-works, learn, marketplace, discover, tipsters, news, etc.
