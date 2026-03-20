# BetRollover — phased release hardening (implemented + your actions)

**Quick gate:** [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) · **Coolify + WebViewGold:** [`COOLIFY_WEBVIEWGOLD_LAUNCH.md`](./COOLIFY_WEBVIEWGOLD_LAUNCH.md) · **Deep link files:** [`deep-linking/`](./deep-linking/) · **CI inject:** [`deep-linking/CI_DEPLOY.md`](./deep-linking/CI_DEPLOY.md)

## Phase A — Web (done in repo)

- **`public/manifest.json`**: Icons/shortcuts use **`/favicon.svg`** only (no broken PNG paths).
- **`app/layout.tsx`**: Icons + OG/Twitter images point at **`favicon.svg`** until you add real PNGs.
- **`next.config.js`**: **`www.betrollover.com` → `https://betrollover.com`** (301), unless `SKIP_WWW_REDIRECT=1`.

**You should:** Add when ready (better social / PWA install):

| File | Suggested |
|------|-----------|
| `web/public/BetRollover-logo.png` | 512×512 PNG (maskable safe zone) |
| `web/public/og-image.png` | 1200×630 PNG for Facebook/Twitter |

Then update `manifest.json` + `layout.tsx` to reference those again if you want raster OG cards.

---

## Phase B — Deep links (done in repo + your server)

**Android:** Two **App Links** intent filters: `https://betrollover.com` and `https://www.betrollover.com`.  
**iOS:** **Associated domains** `applinks:betrollover.com` and `applinks:www.betrollover.com`.  
**Android `Config.HOST`:** Set to **`betrollover.com`** (apex).

**You must host:**

1. **`https://betrollover.com/.well-known/assetlinks.json`** (Android)  
2. **`https://www.betrollover.com/.well-known/assetlinks.json`** (if you keep www in DNS)  
3. **`https://betrollover.com/apple-app-site-association`** (or under `.well-known/`) for iOS  
4. Same for **`www`** if Apple/Google verify that host  

Use Google [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator) and Apple’s associated domains docs. **autoVerify** fails until files are valid + HTTPS.

**Templates in repo:** `docs/deep-linking/assetlinks.template.json` and `apple-app-site-association.template.json` — copy into `web/public/.well-known/` after filling secrets (see `docs/deep-linking/README.md`).

---

## Phase C — Android release (done in repo)

- **`proguard-rules.pro`**: Baseline **keep** rules for WebView JS bridge, Gson, Billing, OneSignal, Firebase, app package.

**You should:** After each dependency major bump, run **`assembleRelease`**, install, and smoke-test **login, WebView, pay, push**.

---

## Phase D — iOS

- Entitlements now declare **applinks** hosts; **`aps-environment`** is still **`development`** in repo — switch to **`production`** for App Store push.

**You should:** Xcode signing + AASA on your domain + production APS for release.

---

## Env knobs

| Variable | Effect |
|----------|--------|
| `SKIP_WWW_REDIRECT=1` | Disables www→apex redirect in Next.js |

---

## Rollback

- Redirect: set `SKIP_WWW_REDIRECT=1`.
- Associated domains: remove applinks entries from `WebViewGold.entitlements` if AASA is not ready (avoids verification noise during dev).
