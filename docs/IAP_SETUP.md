# In-App Purchase (IAP) Setup

**Purpose:** Server-side receipt verification for App Store and Google Play wallet top-ups.

> **Note:** BetRollover is currently **web-only** (no native iOS/Android apps). IAP API endpoints and `WalletIapService` have been removed. This doc is kept for reference if native apps are reintroduced.

---

## Current Behavior

| Env vars set | Behavior |
|--------------|----------|
| Neither | IAP credits **trust the client**. The server records `transactionId` to prevent duplicates but does **not** verify the receipt with Apple/Google. **Not safe for production.** |
| Both | *(Planned)* Server verifies receipts before crediting. |

---

## Production Requirements

For production IAP, you **must** configure server-side verification:

### Apple (App Store)

1. In [App Store Connect](https://appstoreconnect.apple.com) → Your App → App Information → In-App Purchase
2. Create an **App-Specific Shared Secret** (or use the primary shared secret)
3. Set in env: `APPLE_SHARED_SECRET=your_secret`

### Google (Play Store)

1. Create a [Google Cloud service account](https://console.cloud.google.com) with Play Developer API access
2. In Play Console → Users and permissions → invite the service account with "View financial data" and "Manage orders"
3. Set in env: `GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json`  
   Or: `GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'` (JSON string)

---

## Recommendation

- **Development / staging:** IAP can run without verification for testing.
- **Production:** Do **not** enable IAP until `APPLE_SHARED_SECRET` and `GOOGLE_SERVICE_ACCOUNT_JSON` are set and the verification logic is implemented. Until then, IAP is vulnerable to fake purchases.

---

## Implementation Status

**Removed (web-only):** `WalletIapService`, `GET /wallet/iap/products`, and `POST /wallet/iap/verify` have been removed. The `in_app_purchases` table remains (migration 042) for schema history. This doc is for reference if native apps are reintroduced.
