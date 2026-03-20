# Release checklist (BetRollover)

Use this as a short gate before store submission. Details: [`RELEASE_PHASES.md`](./RELEASE_PHASES.md).

## Web

- [ ] `SITE_URL` / env points to **canonical** `https://betrollover.com`
- [ ] Optional: add `web/public/BetRollover-logo.png` (512) + `og-image.png` (1200×630); update `manifest.json` + `layout.tsx`
- [ ] Staging: `SKIP_WWW_REDIRECT=1` if www redirect breaks testing

## Mobile — deep links

- [ ] `assetlinks.json` + `apple-app-site-association` present in `web/public/.well-known/` at build/deploy (or injected via CI — [`deep-linking/CI_DEPLOY.md`](./deep-linking/CI_DEPLOY.md))
- [ ] `https://betrollover.com/.well-known/assetlinks.json` live and valid (see [`deep-linking/README.md`](./deep-linking/README.md))
- [ ] `bash scripts/check-deep-links-remote.sh` passes (HTTP 200 + JSON for assetlinks + AASA)
- [ ] Same on **www** if www remains in Android/iOS host lists
- [ ] AASA file on same host(s), `application/json`, HTTPS 200
- [ ] `adb shell pm get-app-links com.betrollover.app` shows **verified** (after install)

## Android

- [ ] Release build with **minify** on: smoke **WebView, login, IAP, push, ads consent**
- [ ] ProGuard: bump deps → re-run release build if crashes

## iOS

- [ ] `WebViewGold.entitlements`: **`aps-environment`** = **`production`** for App Store
- [ ] Signing / capabilities match **Associated Domains** + push

## Post-release

- [ ] Spot-check **Open in app** from email / browser on both platforms
