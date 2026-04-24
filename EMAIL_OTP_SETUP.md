# Social-Only Signup (Google + Apple)

Email OTP registration has been removed. BetRollover now supports account creation/sign-in through social providers only.

## Active Auth Endpoints

- `POST /auth/google` – body: `{ "id_token": "..." }`
- `POST /auth/apple` – body: `{ "id_token": "...", "user"?: {...}, "nonce"?: "..." }`
- `POST /auth/login` – email/password sign-in for existing password accounts only

## Notes

- Legacy endpoints `POST /auth/otp/send` and `POST /auth/register` are no longer available.
- Password reset remains active for existing email/password users:
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
