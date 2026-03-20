# Launch WebViewGold apps (production web on Coolify)

Your **web** stack is already live on a VPS with **Coolify**. The WebViewGold projects in this repo are already aimed at the same canonical URL as the site:

| Layer | Value |
|--------|--------|
| **Android** `Config.HOME_URL` / `HOST` | `https://betrollover.com` / `betrollover.com` |
| **iOS** `webviewurl` / `host` | `https://betrollover.com` / `betrollover.com` |

If production ever uses a **different** hostname, change **`Config.java`**, **`Config.swift`**, and **`HOME_URL`** together, then rebuild the store binaries.

---

## 1. Coolify — web service (nothing special for WebView, but must be correct)

The in-app browser loads the **same** Next app users get in Chrome. Confirm in the **web** resource:

1. **Build arguments** (see `web/Dockerfile.prod`) — required at **image build** time:
   - `NEXT_PUBLIC_APP_URL=https://betrollover.com` (no trailing slash)
   - `NEXT_PUBLIC_API_URL=https://api.betrollover.com` (or whatever your live API base is; **no** `/api/v1` suffix)

2. **Runtime env** — backend/CORS must allow your real front-end origin (e.g. `https://betrollover.com`). The WebView is still a normal browser context hitting that origin + API.

3. **Memory / build** — Dockerfile already sets `NEXT_BUILD_LOW_MEMORY=1` and a modest Node heap. If builds still OOM on a small VPS, give the build more RAM or bump the web build timeout in Coolify.

4. **www → apex** — `next.config.js` redirects `www.betrollover.com` → `https://betrollover.com` unless `SKIP_WWW_REDIRECT=1`. Keep redirect **on** in production unless you are debugging hostname issues.

---

## 2. Deep linking (recommended before store launch) — **Coolify env only**

The Next app now serves verification URLs from **runtime environment variables** (no JSON files in git, no manual `public/.well-known/` copies).

### In Coolify → your **web** application → **Environment variables** (runtime)

Add **at least**:

| Variable | Where to get the value |
|----------|-------------------------|
| `ANDROID_SHA256_CERT_FINGERPRINT` | Google Play Console → your app → **Release** → **Setup** → **App integrity** → **App signing** → **App signing key certificate** — copy **SHA-256** (format `AA:BB:…` is fine). |
| `APPLE_TEAM_ID` | [Apple Developer](https://developer.apple.com/account) → **Membership** → **Team ID** (10 characters). |

**Optional** (defaults match this repo’s apps):

| Variable | Default |
|----------|---------|
| `ANDROID_PACKAGE_NAME` | `com.betrollover.app` |
| `APPLE_BUNDLE_ID` | `com.betrollover.app` |

**Multiple SHA-256 fingerprints** (e.g. upload key + Play signing): use `ANDROID_SHA256_CERT_FINGERPRINTS` with comma-separated values.

**Full JSON instead:** you can set `ASSETLINKS_JSON` and/or `APPLE_APP_SITE_ASSOCIATION_JSON` to the exact file contents (must be valid JSON). See templates in [`deep-linking/`](./deep-linking/).

### Deploy

1. Save env vars → **redeploy** the web service (restart picks up new env).
2. Verify:

   ```bash
   bash scripts/check-deep-links-remote.sh
   ```

If either endpoint returns **404**, the corresponding env is missing or invalid — check Coolify logs / variable names (typos).

**Note:** If you later add static files under `web/public/.well-known/`, those can override the routes for that path only.

Native apps are already configured: Android **App Links** (apex + www), iOS **Associated Domains** — see [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

---

## 3. Android (WebViewGold) — store checklist

1. Open **`webviewgold-Android`** in Android Studio; set **applicationId** / signing if not already `com.betrollover.app`.
2. **OneSignal / Firebase / Play Billing / Ads** — follow WebViewGold docs; use **live** keys and the same logical “production” project as your marketing site.
3. Build **release** AAB (`minifyEnabled true` — `proguard-rules.pro` is already filled in this repo). Install on a device and smoke-test: load home, login, paywall, back button, file upload if you use it.
4. **Play Console:** create app, upload AAB, complete Data safety, content rating, testers → production.

---

## 4. iOS (WebViewGold) — store checklist

**Bundle IDs** in App Store Connect should match Xcode: main app `com.betrollover.app`, OneSignal extension `com.betrollover.app.OneSignalNotificationServiceExtension`. See [`ios/APP_STORE_CONNECT_BUNDLE_IDS.md`](./ios/APP_STORE_CONNECT_BUNDLE_IDS.md) for the full list (including `com.betrollover.service`).

1. Open **`webviewgold-iOS/WebViewGold.xcodeproj`** in Xcode.
2. **Signing & capabilities:** push notifications, associated domains (already in `WebViewGold.entitlements`), any IAP capability you use.
3. **`aps-environment`:** keep **`development`** for dev/TestFlight testing; set to **`production`** for **App Store** release (same file is noted in-repo).
4. Archive → upload to App Store Connect → TestFlight → App Review.

---

## 5. After launch

- Monitor **Crashes** (Play / Xcode Organizer) and **OneSignal** delivery.
- If the site shows a cookie banner or strict CSP, retest **in the app** — WebView behavior can differ slightly from desktop Chrome.

---

## Quick reference — docs in this repo

| Topic | Doc |
|--------|-----|
| Phases + env knobs | [`RELEASE_PHASES.md`](./RELEASE_PHASES.md) |
| Pre-flight checklist | [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) |
| AASA / assetlinks templates & CI | [`deep-linking/README.md`](./deep-linking/README.md) |

If your Coolify URL is **not** `betrollover.com`, say what domain you use and we can align `Config` + `NEXT_PUBLIC_APP_URL` in one pass.
