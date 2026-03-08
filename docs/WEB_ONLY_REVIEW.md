# Web-Only Project Review (Mobile App Removed)

BetRollover v2 is **mobile-first web only**. Native iOS/Android app development has been removed; the Next.js web app is the single client.

---

## ✅ Removed / Updated

| Item | Status |
|------|--------|
| **`mobile/` directory** | Removed (Expo/React Native app) |
| **README** | Describes mobile-first web only; no Mobile stack row |
| **`.gitignore`** | No `.expo/` entry |
| **`scripts/setup.sh`** | No `mobile` install or start instructions |
| **`packages/shared-types`** | JSDoc: "web, backend" (no mobile) |
| **Push service** | Sends only to **web** (VAPID); Expo push code removed |
| **Push API** | Only `platform: 'web'` accepted; `ios`/`android` return 400 with clear message |
| **IAP** | `WalletIapService`, `GET /wallet/iap/products`, `POST /wallet/iap/verify` removed; `in_app_purchases` table retained (migration 042) |
| **Docs** | MOBILE_APP_REVIEW, MOBILE_DEVELOPMENT_PLAN, MOBILE_NAVIGATION_AUDIT removed; IAP_SETUP, CONTENT_RATING, STACK_TEMPLATE, STORE_APPROVAL, IMPLEMENTATION_PLAN updated with web-only notes |
| **Backend dependency** | `expo-server-sdk` removed from `backend/package.json` |
| **CHANGELOG** | Updated to reflect web-only and removal of mobile app |

---

## Retained (No Code Impact)

| Item | Reason |
|------|--------|
| **`in_app_purchases` table** | Created by migration 042; kept for schema history. Entity file removed; no IAP code in codebase. |
| **`docs/IAP_SETUP.md`** | Reference only; notes that IAP was removed. |
| **`docs/CONTENT_RATING.md`** | Reference if native apps are added later. |
| **`docs/STORE_APPROVAL_AUDIT.md`** | Reference if native apps are added later. |

---

## Final cleanup (latest pass)

- **CHANGELOG:** IAP line updated to "API and service removed".
- **IAP_SETUP.md:** Note updated to state endpoints and service removed.
- **PROJECT_UNIFICATION_FLOW_REVIEW.md:** Notification table row for IAP credit set to "(removed — web-only)".
- **SIMPLE_DEPLOY_GUIDE.md:** Example commit messages no longer mention IAP.
- **.env.example:** IAP env vars commented with "Not used (web-only)".
- **InAppPurchase entity:** File deleted; no IAP code remains. Table `in_app_purchases` still exists (migration 042).

---

## Summary

All mobile-app leftovers have been safely removed: push is web-only, IAP service/endpoints/entity are removed, and docs are updated. The product is consistently **web-only** (mobile-first Next.js).
