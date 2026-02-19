# World-Class Template — Implementation Phases

**Goal:** Align BetRolloverNew with `WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md` and `STACK_TEMPLATE_FOR_AI_AGENT.md` in ordered phases.

**Reference:** `docs/WORLD_CLASS_TEMPLATE_CHECKLIST.md`

---

## Phase 1 — Quick Wins (Docs & Store Config)

**Scope:** CHANGELOG, mobile store URLs, version-control conventions doc.

| Task | Deliverable | Done |
|------|-------------|------|
| 1.1 | Create `CHANGELOG.md` at repo root (Keep a Changelog format) | ✅ |
| 1.2 | Backfill recent changes (subscriptions, push, IAP, coupon placement) | ✅ |
| 1.3 | Add privacy policy and terms URLs to `mobile/app.json` for store listings | ✅ |
| 1.4 | Create `CONTRIBUTING.md` with branching strategy and conventional commits | ✅ |

**Exit:** CHANGELOG exists and is updated; mobile app has store-ready policy URLs; contributors know branch/commit rules.

---

## Phase 2 — API Versioning (`/api/v1/`)

**Scope:** Prefix all API routes with `/api/v1`, update web and mobile clients.

| Task | Deliverable | Done |
|------|-------------|------|
| 2.1 | Backend: set global prefix `api/v1` in Nest (exclude health, webhooks) | ✅ |
| 2.2 | Web: update `getApiUrl()` and proxy to use `/api/v1` path | ✅ |
| 2.3 | Mobile: use base URL + `/api/v1` for all API calls | ✅ |
| 2.4 | Document in README or .env.example: API base includes `/api/v1` | ✅ |

**Exit:** All API traffic goes to `/api/v1/*`; web and mobile work against versioned API.

---

## Phase 3 — Shared Types Package

**Scope:** Add `packages/shared-types` and migrate key DTOs/contracts.

| Task | Deliverable | Done |
|------|-------------|------|
| 3.1 | Create `packages/shared-types` (package.json, tsconfig, src/index.ts) | ✅ |
| 3.2 | Export auth/wallet/subscription DTOs and API response shapes | ✅ |
| 3.3 | Backend: depend on shared-types (workspace or npm link); use in one module | ⏸ optional later |
| 3.4 | Web: depend on shared-types; use types in API client or key pages | ✅ |
| 3.5 | (Optional) Mobile: add dependency and use for request/response types | ⏸ optional later |

**Exit:** Single source of truth for API contracts; backend and web consume shared-types.

---

## Phase 4 — Branching & Commit Enforcement (Optional)

**Scope:** Establish `develop`, document or enforce conventional commits.

| Task | Deliverable | Done |
|------|-------------|------|
| 4.1 | Create `develop` branch from `main` | ⏸ run: `git checkout -b develop` when ready |
| 4.2 | Document in CONTRIBUTING: feature/* → develop → release/* → main | ✅ |
| 4.3 | (Optional) Add commitlint + husky for conventional commits | ⏸ optional |

**Exit:** Develop exists; workflow documented; optionally commits enforced.

---

## Phase 5 — Optional Enhancements

| Item | Notes | Done |
|------|--------|------|
| RFC 7807 exception filter | Standardise API error JSON shape | ✅ `backend/src/common/filters/http-exception.filter.ts` |
| Backup/runbook | Document DB backup and restore | ✅ `docs/BACKUP_AND_RUNBOOK.md` |
| Commitlint config | Optional: enforce conventional commits | ✅ `commitlint.config.js` (add `@commitlint/cli` when needed) |
| Sign in with Apple | Only if adding social login | — |

---

## Execution Order

1. **Phase 1** — Do first (no code paths change).
2. **Phase 2** — Do second (single coordinated change to API + clients).
3. **Phase 3** — Do third (incremental; can migrate DTOs gradually).
4. **Phase 4** — When ready for team workflow.
5. **Phase 5** — As needed.

---

## Version Alignment

After Phase 1, when cutting a release:

- Bump `backend/package.json` → `version`
- Bump `web/package.json` → `version`
- Bump `mobile/app.json` → `expo.version`
- Add new section to `CHANGELOG.md`
- Tag: `git tag vX.Y.Z`
