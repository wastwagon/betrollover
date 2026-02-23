# JWT Refresh Tokens

**Purpose:** Long-lived sessions without requiring users to re-login when the access token expires (7 days).

---

## Flow

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | Returns `access_token`, `refresh_token`, and `user`. |
| `POST /api/v1/auth/register` | Same as login (returns both tokens). |
| `POST /api/v1/auth/refresh` | Body: `{ "refresh_token": "..." }`. Returns new `access_token` and `refresh_token`. |
| `POST /api/v1/auth/logout` | Body: `{ "refresh_token": "..." }`. Revokes the refresh token. |

---

## Client Usage

1. **On login/register:** Store both `access_token` and `refresh_token` (e.g. `localStorage` for web, `AsyncStorage` for mobile).
2. **On API 401:** Call `POST /auth/refresh` with body `{ refresh_token: storedRefreshToken }`. If successful, use the new `access_token` and optionally `refresh_token` (rotation).
3. **On logout:** Call `POST /auth/logout` with `refresh_token` to revoke it.

---

## Refresh Token Behaviour

- **Expiry:** 30 days
- **Single active:** New login revokes any existing refresh token for that user
- **Rotation:** Each refresh returns a new refresh token; the old one is invalidated
- **Revocation:** Logout deletes the token from the DB

---

## Backward Compatibility

- **Existing clients** that ignore `refresh_token` continue to work as before (7-day access token).
- **New clients** can opt in to refresh flow for longer sessions.
