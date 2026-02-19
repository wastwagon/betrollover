# World-Class Development Template
## Complete Guide: Stack, Phases, Versioning & Releases

**Document Version:** 1.0.0  
**Last Updated:** February 2026  
**Based on:** BetRollover v2 Stack

---

# Part 1 — Technology Stack & Structure

## 1.1 Monorepo Structure

```
PROJECT_SLUG/
├── docker-compose.yml       # Postgres, Redis, API, Web
├── .env.example
├── README.md
├── CHANGELOG.md             # Version history (keep updated)
├── packages/
│   └── shared-types/        # Shared DTOs, API contracts, domain types
│       ├── src/index.ts
│       └── package.json
├── backend/                 # NestJS API
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── web/                     # Next.js (web app)
│   ├── app/
│   ├── package.json
│   └── Dockerfile
├── mobile/                  # Expo (iOS/Android app)
│   ├── app/
│   ├── package.json
│   └── app.json
├── database/
│   ├── init/
│   ├── migrations/
│   └── seeds/
└── scripts/
```

---

## 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Web** | Next.js (React) | 14.x | SSR, SEO, App Router |
| **Web** | Tailwind CSS | 3.x | Utility-first styling |
| **Web** | TypeScript | 5.x | Type safety |
| **Mobile** | Expo | 50.x | iOS/Android |
| **Mobile** | React Native | 0.73.x | Cross-platform UI |
| **API** | NestJS | 10.x | Node.js backend |
| **API** | TypeORM | 0.3.x | ORM for PostgreSQL |
| **Database** | PostgreSQL | 16 | Primary data store |
| **Cache** | Redis | 7 | Sessions, rate limit |
| **Dev** | Docker Compose | Latest | Local dev stack |

---

## 1.3 Master Checklist

| Area | Key Items |
|------|-----------|
| **API** | Versioning (`/api/v1/`), shared types, rate limiting, Helmet |
| **iOS App Store** | Privacy policy, Terms, Sign in with Apple, age rating |
| **Google Play** | Privacy policy, Data Safety form, target API 34+ |
| **Website / SEO** | Metadata, sitemap, robots, JSON-LD, Core Web Vitals |
| **Database** | Migrations, indexes, prepared statements, backups |
| **UI/UX** | Mobile-first, 44px+ touch targets, WCAG 2.1 AA |
| **Security** | HTTPS, JWT, rate limiting, CORS, Helmet, npm audit |

---

# Part 2 — Project Development Phases

## 2.1 Phase 1: Discovery (Pre-Development)

| Activity | Deliverables |
|----------|--------------|
| Requirements gathering | PRD (Product Requirements Document) |
| Stakeholder alignment | Scope, timeline, success criteria |
| Technical feasibility | Tech stack selection, proof of concept |
| User research | Personas, user flows |
| Risk assessment | Technical, legal, compliance risks |

**Exit criteria:** Signed-off scope, clear requirements, stack confirmed.

---

## 2.2 Phase 2: Design

| Activity | Deliverables |
|----------|--------------|
| Architecture design | System diagram, API design, data model |
| Database schema | ERD, migration plan |
| UI/UX design | Wireframes, mockups, design system |
| Security design | Auth flow, data protection, compliance |
| Store preparation | Privacy policy draft, terms draft |

**Exit criteria:** Architecture approved, design system ready, store docs drafted.

---

## 2.3 Phase 3: Build (Development)

| Activity | Deliverables |
|----------|--------------|
| Sprint planning | Backlog, sprint goals |
| Backend development | API, auth, business logic |
| Web development | Pages, components, integrations |
| Mobile development | Screens, navigation, API integration |
| Shared types | DTOs, API contracts |
| Database | Migrations, seeds |

**Sprint cadence:** 1–2 weeks. Use feature branches, code review, CI.

**Exit criteria:** Features complete, unit tests passing, E2E smoke tests passing.

---

## 2.4 Phase 4: Test

| Activity | Deliverables |
|----------|--------------|
| Unit tests | Backend (Jest), critical paths |
| Integration tests | API endpoints, auth flow |
| E2E tests | Web (Playwright), key flows |
| Mobile tests | Device/simulator testing |
| Performance | Lighthouse, load testing |
| Security | npm audit, dependency scan |
| Accessibility | WCAG 2.1 AA audit |
| Store compliance | Privacy, terms, data safety |

**Exit criteria:** All tests passing, no critical bugs, store compliance verified.

---

## 2.5 Phase 5: Deploy (Release)

| Activity | Deliverables |
|----------|--------------|
| Staging deploy | Test environment, QA sign-off |
| Production deploy | Web, API, database |
| App store submission | iOS App Store, Google Play |
| Monitoring setup | Logging, alerts, error tracking |
| Documentation | Runbooks, deployment guide |

**Exit criteria:** Production live, stores submitted or approved.

---

## 2.6 Phase 6: Maintain (Post-Launch)

| Activity | Deliverables |
|----------|--------------|
| Bug fixes | Patches, hotfixes |
| Security updates | Dependencies, patches |
| Performance tuning | Optimization, scaling |
| Feature iterations | New features, improvements |
| User support | Bug reports, feedback loop |

**Ongoing:** Backlog grooming, regular releases per versioning policy.

---

# Part 3 — Version Control & Branching

## 3.1 Git Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Always deployable. |
| `develop` | Integration branch. Nightly/staging builds. |
| `feature/*` | New features (e.g. `feature/auth`, `feature/wallet`) |
| `bugfix/*` | Bug fixes (e.g. `bugfix/login-redirect`) |
| `hotfix/*` | Urgent production fixes (merge to main + develop) |
| `release/*` | Release preparation (e.g. `release/1.2.0`) |

**Flow:** `feature/*` → `develop` → `release/*` → `main`  
**Hotfix:** `hotfix/*` → `main` + `develop`

---

## 3.2 Commit Convention (Conventional Commits)

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Examples:
  feat(auth): add password reset flow
  fix(web): correct mobile slip sheet close
  chore(deps): update nestjs to 10.4
```

---

## 3.3 Semantic Versioning (SemVer)

**Format:** `MAJOR.MINOR.PATCH` (e.g. `1.2.3`)

| Part | When to increment |
|------|-------------------|
| **MAJOR** | Breaking API/contract changes; major feature overhaul |
| **MINOR** | New features, backward-compatible |
| **PATCH** | Bug fixes, minor changes, backward-compatible |

**Examples:**
- `1.0.0` — Initial release
- `1.1.0` — New feature (e.g. follow tipsters)
- `1.0.1` — Bug fix (e.g. login redirect)
- `2.0.0` — Breaking change (e.g. API v2)

---

## 3.4 Release Versioning

| Release Type | Version Pattern | Example |
|--------------|-----------------|---------|
| **Alpha** | `1.0.0-alpha.1` | Pre-release, internal |
| **Beta** | `1.0.0-beta.1` | Pre-release, testers |
| **RC** | `1.0.0-rc.1` | Release candidate |
| **Stable** | `1.0.0` | Production release |

---

# Part 4 — Release Process & Lifecycle

## 4.1 Release Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] No critical/high bugs
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json, app.json
- [ ] Migrations reviewed and tested
- [ ] Environment vars documented
- [ ] Staging deploy successful
- [ ] Store compliance verified (if mobile)
- [ ] Rollback plan documented

---

## 4.2 Release Steps (Stable)

1. Create `release/X.Y.Z` from `develop`
2. Bump version in `package.json`, `app.json`
3. Update CHANGELOG.md with changes
4. Run full test suite
5. Deploy to staging; QA sign-off
6. Merge `release/X.Y.Z` → `main`
7. Tag: `git tag vX.Y.Z`
8. Deploy production (web, API)
9. Submit to App Store / Google Play (if mobile)
10. Merge `main` → `develop`
11. Announce release

---

## 4.3 CHANGELOG Format (Keep a Changelog)

```markdown
## [1.2.0] - 2026-02-20

### Added
- Follow button on marketplace cards
- Mobile slip bottom sheet for Create Pick

### Changed
- Dashboard: Quick Actions moved below welcome section
- Minimal header + bottom nav for dashboard pages

### Fixed
- Migration 041 dollar-quoted string error

### Security
- JWT now uses AuthService.createTokenForUser for impersonation
```

---

## 4.4 Version Numbering by Component

| Component | Where to Update |
|-----------|-----------------|
| **Backend** | `backend/package.json` → `version` |
| **Web** | `web/package.json` → `version` |
| **Mobile** | `mobile/app.json` → `expo.version` |
| **Document** | Header of this document |

**Recommendation:** Keep API, web, and mobile versions aligned for releases (e.g. all `1.2.0`) or use independent versioning if teams/releases differ.

---

# Part 5 — iOS App Store & Google Play

## 5.1 iOS App Store

- Privacy policy URL (required)
- Terms of service (for paid/subscription)
- Sign in with Apple (if social login)
- Age rating, metadata, screenshots
- In-App Purchases via StoreKit
- Deep links / Universal Links

## 5.2 Google Play

- Privacy policy URL (required)
- Data Safety form
- Target API level 34+
- Content rating, store listing
- Testing tracks (internal → closed → open)
- EAS Build for production

---

# Part 6 — Website, Database, UI, Security

## 6.1 Website & SEO

- Metadata, sitemap, robots
- JSON-LD structured data
- Core Web Vitals (LCP, FID, CLS)
- Mobile-friendly, HTTPS, accessibility

## 6.2 Database

- Migrations, indexes, prepared statements
- Backups, audit fields, soft deletes
- Naming: snake_case

## 6.3 UI/UX

- Mobile-first, 44px+ touch targets
- Loading, error, empty states
- WCAG 2.1 AA, dark mode, reduced motion

## 6.4 Security

- HTTPS, JWT short expiry, rate limiting
- CORS restricted, Helmet, input validation
- npm audit, secrets in env

---

# Part 7 — AI Agent Example Prompt

```
Create a new project named [PROJECT_NAME] using:

- Monorepo: packages/shared-types, backend (NestJS), web (Next.js 14), mobile (Expo)
- Database: PostgreSQL 16, Redis 7
- Auth: JWT, API versioning /api/v1/
- Docker Compose for local dev
- Follow: API versioning, shared types, iOS/Android store practices, SEO, DB, UI, security
- Include: CHANGELOG.md, version in package.json, conventional commits
```

---

**Reference:** Based on BetRollover v2. Adapt for project-specific needs.
