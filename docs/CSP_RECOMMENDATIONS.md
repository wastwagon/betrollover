# Content Security Policy (CSP) – Recommendations

CSP is currently **disabled** in `backend/src/main.ts` (`contentSecurityPolicy: false`) to avoid breaking Paystack and Google/Apple Sign-In. When you are ready to enable it, use the guidance below.

---

## Why CSP is disabled

- **Paystack** may load scripts or frames from `https://js.paystack.co` and use inline styles/scripts.
- **Google Sign-In** loads from `https://accounts.google.com` (GSI).
- **Apple Sign-In** uses redirects to `https://appleid.apple.com` (no script on your origin).

Enabling a strict CSP without testing can break payment or OAuth flows.

---

## Recommended approach

1. **UGC first**  
   Ensure all user-generated content is sanitized or escaped (Phase 3.1). This reduces XSS risk even without CSP.

2. **Enable CSP in report-only**  
   Use `Content-Security-Policy-Report-Only` with a `report-uri` or `report-to` to see violations without blocking. Fix or allowlist reported sources.

3. **Minimal allowlist when enabling**  
   In Helmet, something like:

   - `default-src 'self'`
   - `script-src 'self' 'unsafe-inline' https://js.paystack.co https://accounts.google.com` (adjust if your frontend loads more)
   - `frame-src 'self' https://js.paystack.co https://accounts.google.com`
   - `style-src 'self' 'unsafe-inline'` (if you use inline styles)
   - `connect-src 'self' https://api.paystack.co https://your-api-domain.com` (and frontend API URL)

4. **Test**  
   After enabling, test: login (email + Google + Apple), deposit flow (Paystack), and any page that loads third-party scripts.

---

## Where to change

- **Backend:** `backend/src/main.ts` — replace `contentSecurityPolicy: false` with a `directives` object (see [helmet CSP](https://helmetjs.github.io/docs/csp/)).
- **Next.js (if you add CSP there):** `web/next.config.js` headers.

Once CSP is enabled, revisit this doc and tighten directives (e.g. remove `'unsafe-inline'` where possible).
