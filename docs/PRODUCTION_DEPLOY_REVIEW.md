# Production Deploy Review – API Versioning Fix

**Date:** 2026-02-19  
**Scope:** Frontend API URL changes (getApiUrl for /api/v1)  
**Status:** Ready for production after verification

---

## Summary of Changes

All client-side API calls now use `getApiUrl()` instead of raw `NEXT_PUBLIC_API_URL`. This ensures requests go to `/api/v1/...` instead of the base URL, which was causing 404s in production.

---

## Verification Checklist

### 1. getApiUrl() Behavior (site-config.ts)

| Scenario | getApiBaseUrl() | getApiUrl() | Result |
|----------|-----------------|-------------|--------|
| **Production** (NEXT_PUBLIC_API_URL=https://api.betrollover.com) | https://api.betrollover.com | https://api.betrollover.com/api/v1 | ✓ Correct |
| **Proxy mode** (NEXT_PUBLIC_API_URL unset) | /api/backend | /api/backend | ✓ Proxy adds api/v1 |
| **Local dev** (NEXT_PUBLIC_API_URL=http://localhost:6001) | http://localhost:6001 | http://localhost:6001/api/v1 | ✓ Correct |

### 2. Backend Route Mapping (all under setGlobalPrefix('api/v1'))

| Frontend path | Backend controller | Verified |
|---------------|--------------------|----------|
| /users/me | users.controller @Controller('users') | ✓ |
| /auth/* | auth.controller @Controller('auth') | ✓ |
| /ads/zone/:slug, /ads/click/:id | ads.controller @Controller('ads') | ✓ |
| /fixtures/* | fixtures.controller @Controller('fixtures') | ✓ |
| /accumulators/* | accumulators.controller @Controller('accumulators') | ✓ |
| /tipsters/* | tipsters.controller @Controller('tipsters') | ✓ |
| /leaderboard | leaderboard.controller @Controller('leaderboard') | ✓ |
| /resources/categories | resources.controller @Controller('resources') | ✓ |
| /pages/:slug | content.controller @Controller('pages') | ✓ |
| /notifications/* | notifications.controller @Controller('notifications') | ✓ |
| /admin/* | admin.controller @Controller('admin') | ✓ |
| /wallet/* | wallet.controller @Controller('wallet') | ✓ |
| /subscriptions/* | subscriptions.controller @Controller('subscriptions') | ✓ |

### 3. Special Cases

- **Profile avatar:** Uses `getApiBaseUrl()` (not getApiUrl) because avatars are at `/uploads/avatars/...` (API root, not under /api/v1). ✓ Correct.
- **Proxy route** (/api/backend/[[...path]]): Receives path like `users/me`, prepends `api/v1/`, forwards to backend. ✓ Correct.
- **Admin 403:** admin/stats and admin/settings return 403 for non-admins. Expected behavior, not a bug.

---

## Pre-Deploy Steps (Recommended)

1. **Run full test locally:**
   ```bash
   bash scripts/test-before-commit.sh
   ```

2. **Verify Coolify env vars** (before redeploy):
   - **API service:** `APP_URL=https://betrollover.com` (for CORS)
   - **Web service:** `NEXT_PUBLIC_API_URL=https://api.betrollover.com`, `NEXT_PUBLIC_APP_URL=https://betrollover.com`
   - **Web build args:** Same as above (Coolify may need these at build time)

3. **Optional – Staging first:** If you have a staging environment, deploy there and smoke-test before production.

---

## Rollback Plan

If issues occur after deploy:

1. **Immediate:** Revert the commit and redeploy the previous web image.
2. **Root cause:** Check browser Network tab for failed requests. If 404s return, the revert was correct. If CORS errors, fix `APP_URL` on the API service.

---

## Files Changed (for reference)

- **Components:** AdSlot, BecomeTipsterCard, HomeStats, ContentPage
- **Pages:** tipsters, tipsters/[username], leaderboard, my-picks, create-pick, marketplace, resources, register, forgot-password, verify-email, notifications, profile, wallet, dashboard, my-purchases, subscriptions
- **Admin:** analytics, marketplace, fixtures, email, notifications, escrow, wallet, news/create, deposits, content, resources, ai-predictions, purchases, picks, ads, ads/create, users, settings, layout, withdrawals

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Double /api/v1 in URL | Low | getApiUrl() returns base+"/api/v1"; paths are relative (e.g. /users/me). No duplication. |
| Proxy mode broken | Low | When base is /api/backend, proxy adds api/v1. Tested. |
| Avatar URLs broken | Low | Profile correctly uses getApiBaseUrl() for /uploads. |
| Build-time env missing | Medium | Ensure NEXT_PUBLIC_* are set in Coolify build args for web. |
