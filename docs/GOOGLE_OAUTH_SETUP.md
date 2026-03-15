# What to Get from Google (for Sign in with Google)

Do this in **Google Cloud Console**: https://console.cloud.google.com/

---

## 1. Create or select a project

- Go to **APIs & Services** → **OAuth consent screen** (or **Credentials**).
- Create a project (e.g. “BetRollover”) or pick an existing one.

---

## 2. OAuth consent screen (if not already done)

- **User type:** External (so any Google user can sign in).
- **App name:** BetRollover (or your app name).
- **User support email:** your email.
- **Developer contact:** your email.
- **Scopes:** Add **email**, **profile**, **openid** (needed for id_token with email/name).
- Save.

---

## 3. Create OAuth 2.0 credentials

- Go to **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
- **Application type:** **Web application**.
- **Name:** e.g. “BetRollover Web”.
- **Authorized JavaScript origins:**
  - `https://yourdomain.com` (your production domain)
  - `http://localhost:3000` (or the port you use for local dev)
  - Add any other origins where your login page runs (e.g. preview URLs).
- **Authorized redirect URIs:**  
  For the **ID token** flow (button on your site), you don’t need a redirect URI for Google; the button returns the token to your page. If you later use the “redirect” flow, add e.g. `https://yourdomain.com/auth/google/callback`.
- Click **Create**.

---

## 4. Copy the values you need

After creation you’ll see:

| What to copy | Where to use it |
|--------------|------------------|
| **Client ID** (looks like `xxx.apps.googleusercontent.com`) | Backend env `GOOGLE_CLIENT_ID`; frontend env `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (for the Google button config). |
| **Client secret** | Backend env `GOOGLE_CLIENT_SECRET` only. **Never** put this in the frontend or in the repo. |

---

## 5. Where to set them

- **Backend (e.g. Coolify / .env):**
  - `GOOGLE_CLIENT_ID=your_client_id_here`
  - `GOOGLE_CLIENT_SECRET=your_client_secret_here`
- **Frontend (e.g. Coolify / .env):**
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here`  
  (same Client ID as above; no secret here.)

---

## 6. Optional: restrict Client ID (production)

In Google Cloud, you can restrict the OAuth client by “Application restrictions” (e.g. HTTP referrer to your domain) and “API restrictions” so only the APIs you need are allowed. Not required for basic Sign in with Google to work.

---

Once you have **Client ID** and **Client secret**, add them to your backend and frontend env as above; the code will use them to verify Google sign-ins and show the button.
