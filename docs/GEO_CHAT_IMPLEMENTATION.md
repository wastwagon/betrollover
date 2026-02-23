# Geo-Location Tagging in Chat

**Purpose:** Show country flag beside username in chat so users know where others are registered from.  
**Date:** February 2026

---

## Implementation Summary

### Phase 1: Chat Display (Done)

- **Backend:** `ChatService` now includes `countryCode` and `flagEmoji` in message user payload.
- **Web:** Community page shows flag emoji beside username (with `title` tooltip for country code).
- **Mobile:** Community tab shows flag beside username.

### Phase 2: IP Geolocation at Registration (Done)

- **Flow:** On `POST /auth/register`, client IP is extracted from `X-Forwarded-For`, `X-Real-IP`, or `req.ip`.
- **Service:** `resolveIpToCountry()` in `backend/src/common/geo.util.ts` calls ip-api.com (free, no key).
- **Fallback:** Localhost and private IPs skip lookup; on failure or empty result, defaults to Ghana (GHA, 🇬🇭).
- **Storage:** `UsersService.create()` accepts `country`, `countryCode`, `flagEmoji`; new users get geo-tagged.

### Data Flow

```
Registration (with IP) → resolveIpToCountry(ip) → country, countryCode
                    → countryCodeToFlagEmoji(code) → flagEmoji
                    → UsersService.create({ country, countryCode, flagEmoji })
Chat message → User has countryCode, flagEmoji → API returns them → UI displays flag
```

### Privacy

- Only **country** is stored (no city, no IP).
- Default for localhost/failure: Ghana.
- Consider adding "hide country in chat" in profile (Phase 3, optional).

### ip-api.com

- Free, no API key.
- 45 requests/minute for non-commercial.
- Skips localhost and private IPs (returns null).

---

## Phase 3 (Optional, Not Implemented)

- Update existing users' country on next login (IP → country).
- Profile setting to hide country in chat.
