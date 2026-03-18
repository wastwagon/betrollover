# Coolify: web build fails (exit 255) after “Compiled with warnings”

## What’s going on

The log often stops right after webpack compile. The next steps are **ESLint + TypeScript**, then **generating ~70 static pages** — that phase spikes memory. Exit **255** usually means the Node process was **killed (OOM)** or the **build hit a timeout**, not a code error.

## What we changed in the repo

- **`web/Dockerfile.prod`**: `NODE_OPTIONS=--max-old-space-size=2048` (was 3072 — too large for many 4GB hosts), `NEXT_BUILD_LOW_MEMORY=1`, telemetry off in builder.
- **`web/next.config.js`**: when `NEXT_BUILD_LOW_MEMORY=1`, Next uses **`cpus: 1`** + **`memoryBasedWorkersCount`** so static pages generate with less parallelism (slower build, far fewer OOMs).

## If deploy still fails

1. **Coolify → Resource → Build**: increase **build timeout** (e.g. 15–20 minutes). Low-memory builds take longer.
2. **Server RAM**: prefer **≥ 4 GB** for the build runner; **8 GB** is comfortable.
3. **Build API and web separately** (or stagger): two `next`/`nest` builds in parallel doubles peak RAM.
4. **Full logs**: open the raw build log and scroll past compile — look for `Killed`, `ENOMEM`, or `JavaScript heap out of memory`.

The OpenTelemetry/Sentry **warning** in the log is normal and not the cause of failure.
