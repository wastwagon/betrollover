# Implementation Plan — News, Resource Center & Ads Manager

**Goal:** Add unique features to increase time-on-site, repeat visits, and revenue.

---

## 1. News Section

### Scope

| Category | Description | Data Source |
|----------|-------------|-------------|
| **Football News** | Match reports, league updates, injury news | Admin-managed + optional RSS/API |
| **Transfers** | Rumours, gossip, confirmed deals | API-Football Transfers endpoint |
| **Confirmed Transfers** | Official transfer announcements | API-Football + admin curation |

### Data Model

```
news_articles (admin-managed)
├── id, slug, title, excerpt, content (HTML)
├── category: 'news' | 'transfer_rumour' | 'confirmed_transfer' | 'gossip'
├── image_url, source_url, published_at
├── featured (boolean), meta_description
└── created_at, updated_at

transfers (API-synced + enriched)
├── id, player_name, from_team, to_team
├── type: 'free' | 'loan' | 'transfer'
├── fee (nullable), season
├── api_transfer_id (from API-Football)
└── synced_at
```

### API-Football Integration

- **Transfers endpoint:** `GET /transfers?player={id}` or `GET /transfers?team={id}`
- Sync job: Daily cron to fetch recent transfers for tracked leagues/teams
- Store in `transfers` table; display in News UI with "Confirmed" badge

### Pages & Components

| Route | Purpose |
|-------|---------|
| `/news` | News hub: tabs for All, Transfers, Gossip, Confirmed |
| `/news/[slug]` | Article detail (admin content) |
| `/news/transfers` | Transfer feed (API + admin) |
| **Homepage** | "Latest News" widget (3–5 items) |
| **Sidebar** | "Transfer News" ticker or list |

### Backend

- **NewsModule** — CRUD for articles, public list/detail endpoints
- **TransfersService** — Sync from API-Football, cache, expose API
- **Admin:** `/admin/news` — Create/edit articles, manage categories

---

## 2. Resource Center

### Scope

| Type | Examples |
|------|----------|
| **Articles** | Value betting, bankroll management, odds explained |
| **Strategies** | Accumulator strategies, live betting, Asian handicap |
| **Tools** | Odds calculator, stake calculator, ROI tracker |
| *(Videos removed per request)* |

### Data Model

```
resource_categories
├── id, slug, name, description
├── level: 'beginner' | 'intermediate' | 'advanced'
└── sort_order

resource_items
├── id, category_id, slug, title, excerpt
├── content (HTML/Markdown)
├── type: 'article' | 'video' | 'tool' | 'strategy'
├── duration_minutes (for articles/videos)
├── video_url (YouTube/Vimeo embed)
├── tool_config (JSON — e.g. calculator type)
└── published_at, featured, sort_order
```

### Pages & Components

| Route | Purpose |
|-------|---------|
| `/resources` | Resource hub: categories, featured, search |
| `/resources/[category]` | e.g. `/resources/beginner` |
| `/resources/[category]/[slug]` | Article/video/tool detail |
| **Tools** | `/resources/tools/odds-calculator`, `/resources/tools/stake-calculator` |
| **Sidebar** | "Learn" quick links |

### Content Structure (from legacy)

- **Beginner:** 5 articles, 2 videos, 1 quiz — Understanding stats, basic markets, odds, bankroll basics
- **Intermediate:** Value betting, market analysis, risk assessment
- **Advanced:** Professional analysis, psychology, portfolio optimization

### Backend

- **ResourceModule** — Categories + items CRUD
- **Public API** — List by category/level, get by slug
- **Admin:** `/admin/resources` — Full CMS for categories and items

---

## 3. Ads Manager

### Scope

- **Ad zones** — Predefined slots (sidebar, between sections, footer)
- **Ad campaigns** — Image, link, advertiser, dates, CPM/CPC
- **Placeholder widgets** — Show "Ad space" when no active ad
- **Admin** — Create/edit ads, assign to zones, view stats

### Data Model

```
ad_zones
├── id, slug (e.g. 'sidebar', 'home-hero-below', 'footer')
├── name, description
├── width, height (recommended)
└── is_active

ad_campaigns
├── id, zone_id, advertiser_name
├── image_url, target_url
├── start_date, end_date
├── impressions, clicks (tracking)
├── status: 'draft' | 'active' | 'paused' | 'ended'
└── created_at, updated_at
```

### Ad Zone Placements (Strategic)

| Zone ID | Location | Size | Notes |
|---------|----------|------|-------|
| `sidebar` | Right sidebar (desktop) | 300×250 | High visibility |
| `home-below-hero` | Below hero, above stats | 728×90 or 970×250 | Premium |
| `between-sections` | Between How It Works & Features | 728×90 | Mid-page |
| `footer` | Above footer links | 728×90 | Site-wide |
| `marketplace-sidebar` | Marketplace page sidebar | 300×250 | High intent |
| `news-sidebar` | News page sidebar | 300×250 | Engagement |
| `resource-sidebar` | Resource Center sidebar | 300×250 | Learning intent |

### Frontend Components

- **AdSlot** — Renders ad or placeholder by zone slug
- **Placeholder** — "Advertise here — Contact ads@betrollover.com" with dashed border
- Used in: Homepage, Marketplace, News, Resources, Leaderboard

### Backend

- **AdsModule** — Zones + campaigns CRUD
- **Public API** — `GET /ads/zone/:slug` — Returns active ad for zone (or null)
- **Tracking** — Impression + click endpoints (optional)
- **Admin:** `/admin/ads` — Zones config, campaign CRUD, basic stats

---

## 4. Implementation Phases

### Phase 1 — Foundation (Week 1)

1. **Database migrations**
   - `news_articles`, `transfers`
   - `resource_categories`, `resource_items`
   - `ad_zones`, `ad_campaigns`

2. **Backend modules**
   - NewsModule (articles CRUD)
   - ResourceModule (categories + items)
   - AdsModule (zones + campaigns)

3. **Admin pages**
   - `/admin/news` — Articles
   - `/admin/resources` — Categories + items
   - `/admin/ads` — Zones + campaigns

### Phase 2 — Public Pages (Week 2)

1. **News**
   - `/news` hub with tabs
   - `/news/[slug]` article page
   - Homepage "Latest News" widget

2. **Resource Center**
   - `/resources` hub
   - `/resources/[category]/[slug]` detail
   - Seed 5–10 starter articles

3. **Ad placeholders**
   - `AdSlot` component
   - Place in homepage, marketplace, sidebar layouts

### Phase 3 — Integrations & Polish (Week 3)

1. **API-Football transfers**
   - TransfersService + sync job
   - `/news/transfers` feed

2. **Resource tools**
   - Odds calculator (client-side)
   - Stake calculator

3. **Ads**
   - Impression/click tracking (optional)
   - Admin stats dashboard

### Phase 4 — Nav & Discovery

1. **Header/footer**
   - Add News, Resources to main nav
   - Footer links

2. **SEO**
   - Metadata for `/news`, `/resources`
   - Sitemap entries

---

## 5. File Structure (New)

```
backend/src/modules/
├── news/
│   ├── news.module.ts
│   ├── news.controller.ts (public + admin)
│   ├── news.service.ts
│   └── entities/news-article.entity.ts
├── transfers/
│   ├── transfers.service.ts (sync from API-Football)
│   └── entities/transfer.entity.ts
├── resources/
│   ├── resources.module.ts
│   ├── resources.controller.ts
│   ├── resources.service.ts
│   └── entities/
│       ├── resource-category.entity.ts
│       └── resource-item.entity.ts
└── ads/
    ├── ads.module.ts
    ├── ads.controller.ts (public zone fetch + admin CRUD)
    ├── ads.service.ts
    └── entities/
        ├── ad-zone.entity.ts
        └── ad-campaign.entity.ts

web/
├── app/
│   ├── news/
│   │   ├── page.tsx (hub)
│   │   └── [slug]/page.tsx
│   ├── resources/
│   │   ├── page.tsx (hub)
│   │   ├── [category]/page.tsx
│   │   └── [category]/[slug]/page.tsx
│   └── admin/
│       ├── news/page.tsx
│       ├── resources/page.tsx
│       └── ads/page.tsx
└── components/
    ├── AdSlot.tsx
    ├── NewsWidget.tsx
    ├── LatestTransfers.tsx
    └── ResourceCard.tsx
```

---

## 6. Dependencies & APIs

| Item | Source |
|------|--------|
| **Transfers data** | API-Football (existing key) — `/transfers` |
| **News articles** | Admin-managed (no external API for gossip) |
| **Resource content** | Admin-managed; videos = YouTube embed URLs |
| **Ad images** | Upload to storage or external URLs |

---

## 7. Revenue & Engagement Impact

| Feature | Engagement | Revenue |
|---------|------------|---------|
| **News** | Return visits, longer sessions | Indirect (retention) |
| **Resource Center** | Learning loop, authority | Indirect (trust → conversions) |
| **Ads** | — | Direct (CPM/CPC from sponsors) |

---

## 8. Next Steps

1. **Approve plan** — Confirm scope and phases
2. **Phase 1** — Migrations + backend modules + admin UIs
3. **Phase 2** — Public pages + placeholders
4. **Phase 3** — API-Football transfers + tools + tracking

Ready to proceed with Phase 1 when you confirm.
