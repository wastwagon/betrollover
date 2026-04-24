# Google & Apple Login/Signup – Safe Integration Plan

## Current auth (summary)

- **Backend:** NestJS; JWT access tokens + refresh tokens; social auth via `POST /auth/google` and `POST /auth/apple`, plus `POST /auth/login` for existing password accounts.
- **User entity:** `username`, `email`, `password` (required), `displayName`, etc. No OAuth provider fields yet.
- **Frontend:** Login/register forms; Next.js API route `/api/auth/login` proxies to backend and redirects with `token` in URL; client stores token (e.g. localStorage).

---

## Goals

1. **Google:** “Sign in with Google” and “Sign up with Google” (same flow: find or create user, then issue our JWT).
2. **Apple (later):** “Sign in with Apple” and “Sign up with Apple”, same idea.
3. **Security:** No client secrets in frontend; backend only verifies provider tokens; link existing accounts by email when safe; respect age/terms.

---

## Phase 1 – Google (recommended order)

### 1.1 Database

- **Option A (simplest):** Add to `users`:
  - `provider_google_id` (nullable, unique) – Google sub (subject) from ID token.
  - `password` – make **nullable** so OAuth-only users have no password (or keep required and set a random unreachable hash for OAuth-only users; less clean).
- **Option B (scalable):** New table `user_oauth_accounts (user_id, provider, provider_id, email)` so one user can link Google + Apple + email/password. Then `users.password` nullable.

Recommendation: **Option A** for a fast first version (Google only); migrate to Option B when adding Apple and “link account” flows.

- **Migration:** Add `provider_google_id VARCHAR(255) NULL UNIQUE`; alter `password` to `NULL` (or keep NOT NULL and use a placeholder for OAuth-only). Index on `provider_google_id` for fast lookup.

### 1.2 Backend – Google

- **Env (server-only, never in frontend):**
  - `GOOGLE_CLIENT_ID` – from Google Cloud Console (OAuth 2.0 client ID, type “Web application”).
  - `GOOGLE_CLIENT_SECRET` – same console; **only used on backend** for token exchange or server-side verification.

- **Flow choice:**
  - **ID token (recommended for web):** Frontend uses Google Identity Services (GIS), gets `credential` (JWT id_token). Frontend sends **only this id_token** to your backend. Backend verifies the JWT (signature, audience, expiry) and reads `sub` + `email` (+ name). No client secret in frontend; no redirect to Google if you use “One Tap” or “Sign in with Google” button that returns id_token.
  - **Authorization code:** Frontend redirects to Google → user consents → redirect back with `code`. Frontend or Next.js server sends `code` to your backend; backend exchanges `code` for tokens using **client_secret**. Backend then uses id_token or userinfo to get profile. Requires backend to store client_secret and do HTTPS exchange.

Recommendation: **ID token flow** (frontend gets id_token from Google button; backend only verifies JWT). Simpler and keeps secret entirely server-side.

- **New endpoint:** `POST /auth/google` (or `POST /auth/oauth/google`).
  - **Body:** `{ "id_token": "eyJ..." }` (the Google JWT).
  - **Backend:**
    1. Verify JWT: use Google’s JWKS or `google-auth-library` (e.g. `OAuth2Client.verifyIdToken()`), check `aud` = your `GOOGLE_CLIENT_ID`, `exp`, `iss` (accounts.google.com or https://accounts.google.com).
    2. From payload: `sub` (Google user id), `email` (may be missing if not in scope), `email_verified`, `name`, `picture`.
    3. **Find user:** by `provider_google_id === sub` **or** by `email` (if email present and verified). If found → update `provider_google_id` if null (link Google to existing account), then call same “login” logic (create access + refresh token, return `access_token`, `refresh_token`, `user`).
    4. **Create user if not found:** generate unique `username` (e.g. `google_${sub.slice(0,8)}` or from email prefix + random), `email` from token (or “google_${sub}@placeholder.local” if email not provided), `displayName` from `name` or email, `password` = null or placeholder hash, `provider_google_id = sub`, `emailVerifiedAt = now` (Google is trusted). Create wallet, ensure tipster row, then return tokens + user.
  - **Security:** Rate-limit endpoint (e.g. same as login). Reject expired or invalid JWTs. Never trust client-supplied email without verifying it’s in the signed token.

- **Linking by email:** If you find a user by email and they don’t have `provider_google_id` set, you can set it (link Google to existing account) so next time they can use “Sign in with Google”. Optionally require password confirmation before linking (stricter).

### 1.3 Frontend – Google

- **Google Cloud Console:** Create OAuth 2.0 client (Web application), add authorized JavaScript origins (e.g. `https://yourdomain.com`, `http://localhost:3000`). No need to expose client secret; frontend only needs Client ID.
- **Script:** Load `https://accounts.google.com/gsi/client` and use “Sign in with Google” button (or One Tap). Configure `client_id` (your Google Client ID, can be public), `callback` to receive `credential` (id_token).
- **On success:** Send `credential` to your backend. Two options:
  - **A)** `POST /api/auth/google` (Next.js route) with body `{ id_token }` → route calls backend `POST /api/v1/auth/google` → backend returns tokens → route redirects to dashboard with token (same pattern as current login proxy).
  - **B)** Frontend calls backend `POST https://api.yourdomain.com/api/v1/auth/google` with `{ id_token }` and CORS; then frontend stores token and redirects (if CORS is set up).
- **Redirect:** Reuse existing post-login redirect (e.g. `?redirect=/marketplace`). Pass through from Google callback to your API then to app with token in URL or response.
- **No client secret** in frontend or in repo; only `GOOGLE_CLIENT_ID` can be in frontend (or in env as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` if you want it in env).

### 1.4 Security checklist – Google

- [ ] Verify ID token on backend (signature, `aud`, `exp`, `iss`).
- [ ] Store only `GOOGLE_CLIENT_SECRET` and secrets in backend env (e.g. Coolify).
- [ ] Rate-limit `POST /auth/google` (e.g. 10/min per IP).
- [ ] Use HTTPS in production for all auth.
- [ ] If linking by email, consider requiring email verification or password confirmation for first link.
- [ ] Treat Google email as verified (`emailVerifiedAt` set on create/link).

---

## Phase 2 – Apple (later)

### 2.1 Database

- If you stayed with Option A: add `provider_apple_id` (nullable, unique) and optionally `provider_apple_email` (Apple can hide email; you get a relay).
- If Option B: add row in `user_oauth_accounts` with `provider = 'apple'`, `provider_id = sub` from Apple JWT.

### 2.2 Backend – Apple

- **Env:** `APPLE_CLIENT_ID` (Service ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (contents of .p8 key). Used to verify the identity token and optionally exchange code.
- **Flow:** Apple can return an **identity token** (JWT) and optionally an **authorization code**. Prefer verifying the **id_token** (JWT) on backend: verify signature with Apple’s JWKS, `aud`, `exp`, `iss` (https://appleid.apple.com), `sub` (Apple user id). Email may be in token only on first auth; Apple may use a private relay email.
- **New endpoint:** `POST /auth/apple` body e.g. `{ "id_token": "...", "user": { "email", "name" } }` (Apple sends `user` only on first consent; after that only id_token). Backend verifies id_token, finds or creates user by `provider_apple_id` or email, same pattern as Google.
- **Linking:** Same idea: match by email or create new user; set `provider_apple_id` (or insert into link table).

### 2.3 Frontend – Apple

- Apple Sign In JS or “Sign in with Apple” button; redirect or popup returns `authorization.id_token` (and optionally `user` object on first time). Send id_token (and if present, user) to your backend.
- Configure Service ID and domains in Apple Developer; return URL to your app (e.g. `/auth/apple/callback` or SPA callback that posts to backend).

### 2.4 Security checklist – Apple

- [ ] Verify Apple id_token with Apple’s JWKS; check `aud`, `exp`, `iss`.
- [ ] Keep private key and secrets only on backend.
- [ ] Handle “private relay” email (store whatever Apple gives; use same user on next sign-in by `sub`).
- [ ] Rate-limit Apple auth endpoint.

---

## When login is needed (unchanged)

- After Google/Apple rollout: **login is needed** for the same actions as today (purchase, follow, create picks, dashboard, wallet, etc.). Session creation is social-first (Google/Apple), with email/password retained only for existing password users.

---

## Implementation order (recommended)

1. **DB migration:** Add `provider_google_id` (and make `password` nullable if you want true OAuth-only users).
2. **Backend:** `AuthService.googleLogin(idToken: string)` (verify token, find-or-create user, return same shape as `login()`). `AuthController POST auth/google` with throttle.
3. **Next.js route:** `POST /api/auth/google` – read body `id_token`, call backend, redirect with token (and optional `redirect` param).
4. **Frontend:** Add “Sign in with Google” on login and register pages (load GSI, on success POST id_token to `/api/auth/google`, handle redirect).
5. **Testing:** Use a test Google account; verify existing email user can link; verify new user creation and JWT.
6. **Later:** Repeat for Apple (DB, backend, route, frontend button).

---

## Env vars summary

| Var | Where | Purpose |
|-----|--------|--------|
| `GOOGLE_CLIENT_ID` | Backend + optional frontend | Verify id_token `aud`; frontend only if you pass it to Google script |
| `GOOGLE_CLIENT_SECRET` | Backend only | Not needed if you only verify id_token; needed if you use code exchange |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Frontend (optional) | For Google Sign-In button config |
| `APPLE_CLIENT_ID` | Backend | Verify Apple id_token |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Backend only | Verify Apple JWT / client secret |

---

## Optional: account linking UX

- In “Account” or “Profile”: “Link Google” / “Link Apple” so an existing email user can add OAuth and then sign in with either. Backend: same Google/Apple endpoint; when user is found by email and already logged in (or you verify session), set `provider_google_id` / `provider_apple_id` instead of creating a new user.
- “Unlink” later: set `provider_google_id` to null; require password to be set if they remove the only sign-in method.

This plan keeps secrets on the server, uses standard verification of provider tokens, and fits your current JWT + refresh-token flow so that **when login is needed** stays the same; social sign-in (Google/Apple) is the primary session path.
