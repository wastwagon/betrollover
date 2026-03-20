# CI: inject `assetlinks.json` & AASA before `next build`

**Prefer (BetRollover web):** set **`ANDROID_SHA256_CERT_FINGERPRINT`**, **`APPLE_TEAM_ID`**, etc. on the **running** web container — no build-time files needed (`web/lib/well-known-mobile.ts`). Use this doc only if you want static files in `public/.well-known/` instead.

Verification files live at:

- `https://betrollover.com/.well-known/assetlinks.json`
- `https://betrollover.com/.well-known/apple-app-site-association` (no `.json` extension)

They are **gitignored** at `web/public/.well-known/` so a public repo does not accidentally commit deploy-specific values. **Private** repos can `git add -f` those paths instead of CI injection.

## 1. Store secrets / payloads

In your CI provider (GitHub Actions, Coolify, etc.), store:

| Secret | Contents |
|--------|----------|
| `ASSETLINKS_JSON` | Full JSON body for `assetlinks.json` (array, valid UTF-8) |
| `AASA_JSON` | Full JSON body for Apple (same format as `apple-app-site-association.template.json`) |

Generate payloads from `docs/deep-linking/*.template.json` and [Google’s asset links tool](https://developers.google.com/digital-asset-links/tools/generator).

## 2. Bash step (before `npm run build` in `web/`)

```bash
mkdir -p web/public/.well-known
printf '%s' "$ASSETLINKS_JSON" > web/public/.well-known/assetlinks.json
printf '%s' "$AASA_JSON" > web/public/.well-known/apple-app-site-association
```

Ensure CI exports `ASSETLINKS_JSON` and `AASA_JSON` (or write them from a file mount).

## 3. www host

If Android/iOS still list **`www.betrollover.com`**, either:

- Serve the **same** files on www (same deployment, both hostnames), or  
- Remove www from native manifests/entitlements and rely on **apex only** (after redirects are stable).

## 4. Smoke test after deploy

```bash
curl -sSI "https://betrollover.com/.well-known/assetlinks.json" | head -5
curl -sS "https://betrollover.com/.well-known/assetlinks.json" | jq .
```

Or from the repo:

```bash
bash scripts/check-deep-links-remote.sh
PUBLIC_SITE_URL=https://staging.example.com bash scripts/check-deep-links-remote.sh
```

**GitHub Actions sketch:** see [`github-actions.example.yml`](./github-actions.example.yml).

Expect **HTTP 200**, **`Content-Type: application/json`** (or acceptable variant), valid JSON.
