# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- RFC 7807–style exception filter: API errors return `{ statusCode, message, error, path, timestamp }`.
- Backup & runbook doc: `docs/BACKUP_AND_RUNBOOK.md` (DB backup, migrations, release steps).
- Commitlint config at repo root (optional; add `@commitlint/cli` to enforce).
- README: API versioning note, mobile API URL note, Docs table (CONTRIBUTING, CHANGELOG, runbook, template).
- API versioning: all routes under `/api/v1` (health and Paystack webhook excluded). Web and mobile clients updated.
- World-class template Phase 1–2: CHANGELOG, CONTRIBUTING, mobile app.json privacy/terms URLs, API versioning.
- Tipster subscription packages: create packages (name, price, duration, ROI guarantee), list by tipster.
- User subscriptions: subscribe to tipster packages via wallet debit; escrow; access to subscription-only coupons.
- Subscription escrow and ROI guarantee: daily settlement; release to tipster or refund user based on tipster ROI.
- Coupon placement: marketplace, subscription, or both; link coupons to subscription packages.
- Push notifications: web (VAPID + service worker), mobile (Expo push); register device, send from backend.
- In-app purchases: wallet top-up via Apple/Google; GET products, POST verify; mobile IAP section in wallet.
- World-class template alignment: CHANGELOG, implementation phases doc, checklist doc.

### Changed

- Tipster profile: includes subscription packages and Subscribe flow; user_id in tipster object for dashboard.
- Create Pick: placement selector (marketplace / subscription / both) and package checkboxes when subscription.
- Dashboard: Subscriptions and Subscription Packages quick actions; push notification prompt in shell.
- Accumulators: subscription-feed endpoint; create accumulator supports placement and subscription packages.
- Notifications: optional push send after create for subscription/pick_published/settlement types.
- Migrations: 042 (subscription, push, IAP tables), 043 (pick_marketplace placement).

### Fixed

- Subscription settlement ROI query TypeScript typing.
- Tipster profile subscribed state from subscriptions/me (package.id, status).
- Subscriptions page PickCard tipster shape for feed.
- Create Pick Set update for subscribedPackageIds.

---

## [1.0.0] - 2026-02-01

### Added

- Initial BetRollover v2: Next.js web, Expo mobile, NestJS API.
- Auth: register, login, JWT, email verification.
- Wallet: balance, Paystack deposit, withdrawals, payout methods.
- Marketplace: accumulator picks, escrow, purchase flow.
- Tipsters: leaderboard, profile, follow.
- Admin: users, analytics, content, migrations, seeds.
- SEO: metadata, sitemap, robots, JSON-LD.
- Docker Compose: Postgres, Redis, API, Web.

[Unreleased]: https://github.com/your-org/BetRolloverNew/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/BetRolloverNew/releases/tag/v1.0.0
