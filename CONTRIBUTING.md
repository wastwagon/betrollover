# Contributing to BetRollover

Thanks for your interest in contributing. This document covers branch strategy and commit conventions so we stay aligned with our world-class template.

## Branching strategy

We use a simple Git flow:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Always deployable. |
| `develop` | Integration branch for ongoing work. Staging/nightly builds. |
| `feature/*` | New features (e.g. `feature/wallet-export`, `feature/notifications`) |
| `bugfix/*` | Bug fixes (e.g. `bugfix/login-redirect`) |
| `hotfix/*` | Urgent production fixes. Merge to both `main` and `develop`. |
| `release/*` | Release preparation (e.g. `release/1.2.0`) |

**Flow**

- Work in **feature** or **bugfix** branches.
- Merge **feature/\*** and **bugfix/\*** into **develop**.
- For a release: create **release/X.Y.Z** from **develop**, bump versions, update CHANGELOG, then merge to **main** and tag.
- **Hotfixes:** branch from **main**, fix, merge back into **main** and **develop**, then tag a patch.

**Creating a feature branch**

```bash
git checkout develop
git pull
git checkout -b feature/your-feature-name
# ... work, commit (see below) ...
# When ready: open PR into develop
```

## Commit convention (Conventional Commits)

Use [Conventional Commits](https://www.conventionalcommits.org/) so history and CHANGELOG stay clear.

**Format**

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types**

| Type | Use for |
|------|--------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code change that is not a fix or feature |
| `test` | Adding or updating tests |
| `chore` | Build, deps, tooling, config |

**Scope** (optional but helpful): `auth`, `wallet`, `web`, `mobile`, `api`, `deps`, etc.

**Examples**

```
feat(subscriptions): add tipster package creation endpoint
fix(web): correct mobile slip sheet close on dashboard
docs: add TEMPLATE_IMPLEMENTATION_PHASES.md
chore(deps): update nestjs to 10.4
```

**Rules**

- Use present tense: “add” not “added”.
- No period at the end of the subject line.
- Keep subject under about 72 characters.

## Before opening a PR

- Run lint and tests (e.g. `npm run lint`, `npm run test` in backend/web).
- Update CHANGELOG.md under `[Unreleased]` if the change is user- or API-visible.
- Ensure migrations (if any) are additive and documented.

## Questions

Open an issue or reach out to the maintainers. For more on our stack and release process, see `docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md` and `docs/TEMPLATE_IMPLEMENTATION_PHASES.md`.
