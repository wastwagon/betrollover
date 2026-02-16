# AI Tipster System – Implementation Fix Plan

**Created:** February 2025  
**Status:** ✅ Complete

---

## Phase 1: Quick Fixes (No New Routes)

| # | Task | Files | Est. |
|---|------|-------|------|
| 1.1 | Fix LoadingSkeleton – add `className` prop | `web/components/LoadingSkeleton.tsx` | 5 min |
| 1.2 | Add Copy Bet toast feedback | `web/app/predictions/page.tsx` | 10 min |

---

## Phase 2: Follow API (Backend)

| # | Task | Files | Est. |
|---|------|-------|------|
| 2.1 | Create TipsterFollow entity | `backend/.../entities/tipster-follow.entity.ts` | 10 min |
| 2.2 | Register entity + add follow service | `predictions.module.ts`, new `tipster-follow.service.ts` | 15 min |
| 2.3 | Add follow/unfollow endpoints | `tipsters.controller.ts` | 15 min |
| 2.4 | Add `is_following` to tipster profile when authenticated | `tipsters-api.service.ts` | 10 min |

---

## Phase 3: Tipster Profile Page

| # | Task | Files | Est. |
|---|------|-------|------|
| 3.1 | Create `/tipsters/[username]/page.tsx` | `web/app/tipsters/[username]/page.tsx` | 20 min |
| 3.2 | Link TipsterCard to profile | `web/components/TipsterCard.tsx` | 5 min |
| 3.3 | Link PredictionCard tipster to profile | `web/components/PredictionCard.tsx` | 5 min |
| 3.4 | Wire Follow button with API (tipsters page + profile) | `TipsterCard`, tipsters page, profile page | 15 min |

---

## Phase 4: Prediction Detail + View Tracking

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.1 | Add view increment to `GET /predictions/:id` | `predictions-api.service.ts` | 10 min |
| 4.2 | Create `/predictions/[id]/page.tsx` | `web/app/predictions/[id]/page.tsx` | 20 min |
| 4.3 | Link PredictionCard to detail | `web/components/PredictionCard.tsx` | 5 min |

---

## Phase 5: Leaderboard Page

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.1 | Create `/leaderboard/page.tsx` | `web/app/leaderboard/page.tsx` | 15 min |
| 5.2 | Add Leaderboard to SiteHeader nav | `web/components/SiteHeader.tsx` | 5 min |

---

## Phase 6: Admin & Dashboard Links

| # | Task | Files | Est. |
|---|------|-------|------|
| 6.1 | Add AI Predictions to AdminSidebar | `web/components/AdminSidebar.tsx` | 10 min |
| 6.2 | Add Today's AI Predictions to user dashboard | `web/app/dashboard/page.tsx` | 10 min |

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

**Total estimated time:** ~2.5 hours

---

## API Contract Additions

### Follow Endpoints (auth required)

```
POST   /tipsters/:username/follow   → { success: true }
DELETE /tipsters/:username/follow   → { success: true }
```

### Tipster Profile (optional auth)

When `Authorization: Bearer <token>` is present, response includes:
```json
{
  "tipster": { ... },
  "is_following": true
}
```

### Prediction Detail (view auto-increment)

`GET /predictions/:id` – increments `views` on first fetch (or every fetch; document behavior).

---

## Dependencies

- Phase 2 must complete before Phase 3.4 (Follow button)
- Phase 4.1 (view tracking) can run in parallel with Phase 3
- Phases 5 and 6 are independent
