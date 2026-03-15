# Payments Runbook (Paystack)

Quick reference for Paystack integration, webhook, and manual steps.

---

## URLs (production example)

| Purpose | URL | Method |
|---------|-----|--------|
| **Webhook** (Paystack calls this) | `https://api.betrollover.com/wallet/paystack-webhook` | POST |
| **Verify deposit** (user callback / manual) | `https://api.betrollover.com/api/v1/wallet/deposit/verify?ref=<reference>` | GET |

- The webhook URL has **no** `/api/v1` prefix (it is excluded from the global prefix).
- The verify URL is under `/api/v1` and requires the user to be authenticated (Bearer token). The frontend calls it when the user returns from Paystack with `?ref=xxx` in the URL.

---

## Paystack Dashboard setup

1. **Settings → API Keys & Webhooks**
   - Add **Webhook URL:** `https://api.betrollover.com/wallet/paystack-webhook`
   - Use **Test** or **Live** according to your keys.

2. **Webhook secret**
   - Set `PAYSTACK_SECRET_KEY` (and optionally a dedicated webhook secret) in the API env. The API uses the secret key to verify the Paystack signature on the webhook body.

---

## When a deposit might not be credited

1. **User returns with `?ref=xxx`**  
   The wallet page calls `GET /api/v1/wallet/deposit/verify?ref=xxx` (with auth). The backend verifies the transaction with Paystack and credits the wallet if not already done. No manual step if this succeeds.

2. **Webhook failed or delayed**  
   User can refresh the wallet page or open it again; the same verify endpoint is called with the same `ref` and is idempotent (no double credit).

3. **Manual reconciliation**  
   - In Paystack Dashboard: **Transactions** → find the payment by reference.
   - In your DB: check `wallet_transactions` and `deposit_requests` for that reference.
   - If the payment succeeded in Paystack but there is no corresponding wallet credit, an admin can credit the user’s wallet manually (via DB or future admin tool) and note the Paystack reference.

---

## Environment (API)

- **PAYSTACK_SECRET_KEY** — Used for webhook signature verification and for calling Paystack API (e.g. verify transaction). Can be set in env or in Admin → Settings.
- See [REQUIRED_ENV_PROD.md](./REQUIRED_ENV_PROD.md) for the full env checklist.
