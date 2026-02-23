# In-App Purchase (IAP) Setup

**Purpose:** Server-side receipt verification for App Store and Google Play wallet top-ups.

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

The `WalletIapService` currently:

- ✅ Prevents duplicate credits (checks `transactionId` in DB)
- ⚠️ Does **not** yet call Apple/Google APIs to verify receipts
- When env vars are set, the verification logic should be added (see `backend/src/modules/wallet/wallet-iap.service.ts`)
