# Deep linking — deploy `assetlinks.json` & Apple App Site Association

**Coolify / VPS:** Prefer **runtime env** on the web container — Next serves `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` from `ANDROID_SHA256_*`, `APPLE_TEAM_ID`, etc. See [`../COOLIFY_WEBVIEWGOLD_LAUNCH.md`](../COOLIFY_WEBVIEWGOLD_LAUNCH.md) and `web/lib/well-known-mobile.ts`.

The native apps expect verification files on **each host** you list in Android `intent-filter` / iOS `associated-domains`.

## Android — Digital Asset Links

1. Build **release** APK/AAB and get **SHA-256** of your **signing certificate** (Play App Signing uses the **app signing key** in Play Console, not necessarily your upload key).
2. Use [Google’s Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator) or copy `assetlinks.template.json`, replace placeholders, and host at:

   - `https://betrollover.com/.well-known/assetlinks.json`
   - `https://www.betrollover.com/.well-known/assetlinks.json` (only if www stays in DNS / App Links)

3. Response must be **`200`**, **`application/json`**, **no auth**, valid JSON array.

## iOS — Universal Links

1. Note your **Apple Team ID** and **bundle identifier** from Xcode.
2. Copy `apple-app-site-association.template.json`, replace placeholders, and host **without** `.json` in the filename. Common URLs:

   - `https://betrollover.com/.well-known/apple-app-site-association`
   - `https://www.betrollover.com/.well-known/apple-app-site-association` (if needed)

   Apple also accepts `https://betrollover.com/apple-app-site-association` (root); avoid redirects.

3. Serve as **`application/json`** (or `application/pkcs7-mime` for signed). **HTTPS** only. Documented paths: [Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).

## If the site is the Next.js app (`web/`)

1. Put the **final** JSON files under `web/public/.well-known/`:
   - `web/public/.well-known/assetlinks.json`
   - `web/public/.well-known/apple-app-site-association` (no extension)
2. These paths are **listed in the repo root `.gitignore`** — generate them locally or inject in CI (see [`CI_DEPLOY.md`](./CI_DEPLOY.md)). Private repos may `git add -f` if you prefer committing them.
3. Deploy; Next serves `public/` at the site root. `next.config.js` applies a **short cache** on `/.well-known/*` so updates propagate.
3. **www vs apex:** You already **301 www → apex** in production. Crawlers for verification hit each host you declare; if **www** still resolves, either host the same files on **www** (e.g. same CDN origin) or remove **www** from native config once you’re sure everything uses apex only.

**Do not commit real signing fingerprints** if this repo is public — use CI or a private deploy step to inject the files.
