# BetRollover Implementation Phases

> **Notifications**: All user notifications are delivered via email (SendGrid). In-app notifications exist for display only; email is the primary channel.

---

## Phase 1: Polish & Discovery ✓
- [x] Verify notification email links point to correct pages
- [x] Add sort by follower count on `/tipsters`

---

## Phase 2: Performance & Reliability ✓
- [x] Pagination for marketplace (limit/offset, Load more)
- [x] Feed offset support for dashboard
- [x] Redis caching for leaderboard (5 min TTL)
- [x] Error boundaries (error.tsx, global-error.tsx)

---

## Phase 3: Testing ✓
- [x] Unit tests: TipsterFollowService (follow/unfollow/isFollowing/getFollowedTipsters)
- [x] Unit tests: notification-types config
- [x] E2E tests: smoke (home, tipsters, leaderboard, login)
  - Run `npx playwright install` before first E2E run
  - `npm run test:e2e` in web/

---

## Phase 4: Social & Engagement ✓
- [x] Reactions on picks (like, count, hasReacted)
- [x] Email notification when followed tipster posts new pick
- [x] Analytics: view count tracking (POST /accumulators/:id/view)

---

## Phase 5: Future Ideas
- Tipster bio links / social handles
- In-app messaging (optional; email remains primary)
