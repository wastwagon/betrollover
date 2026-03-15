# Sign in with Apple – Setup

## 1. Apple Developer account

You need an [Apple Developer](https://developer.apple.com/) account (paid program).

## 2. Create an App ID (if needed)

- **Certificates, Identifiers & Profiles** → **Identifiers** → **+** → **App IDs**.
- Create an App ID (e.g. for iOS/native later) or use an existing one. Sign in with Apple can be enabled on the App ID.

## 3. Create a Services ID (for web)

- **Identifiers** → **+** → **Services IDs** → Continue.
- **Description:** e.g. "BetRollover Web".
- **Identifier:** e.g. `com.betrollover.service` (this is your **APPLE_CLIENT_ID**).
- **Enable "Sign in with Apple"** → Configure:
  - **Primary App ID:** select your App ID.
  - **Domains and Subdomains:** e.g. `betrollover.com` (no `https://`).
  - **Return URLs:** `https://betrollover.com/api/auth/apple/callback` (and for local dev: `http://localhost:6002/api/auth/apple/callback` if you test locally).
- Save, then continue and register the Services ID.

## 4. Environment variables

- **Backend:** `APPLE_CLIENT_ID` = your Services ID (e.g. `com.betrollover.service`). Used to verify the Apple identity token (`aud` claim).
- **Frontend:** `NEXT_PUBLIC_APPLE_CLIENT_ID` = same value. Used to build the redirect URL to Apple.

No client secret is required for verifying the **id_token** (JWT) on the backend; we use Apple’s JWKS to verify the signature.

## 5. Flow

1. User clicks “Sign in with Apple” on your site.
2. They are redirected to **GET /api/auth/apple**, which redirects to Apple with `client_id`, `redirect_uri`, `response_type=id_token`, `response_mode=form_post`, `scope=name email`, and a `state` (stored in a cookie).
3. User signs in with Apple; Apple **POSTs** to your **Return URL** (`/api/auth/apple/callback`) with `id_token`, optional `user` (name/email, first time only), and `state`.
4. Callback verifies `state`, sends `id_token` and `user` to your backend **POST /auth/apple**.
5. Backend verifies the JWT with Apple’s JWKS, finds or creates the user, returns your JWT; callback redirects to dashboard with token.

## 6. Private relay email

Apple may hide the user’s real email and use a private relay. We store whatever email is in the token or the first-time `user` object; if none, we create a placeholder email so the account is still created and tracked.
