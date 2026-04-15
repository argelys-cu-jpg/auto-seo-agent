# CookUnity SEO Agent

Deployable multi-agent SEO workflow for CookUnity with:
- Next.js dashboard on Vercel
- Prisma + Postgres persistence
- Strapi publishing adapter
- separate worker process for background jobs

## What is production-ready now

- `apps/web` can be deployed to Vercel
- grid UI can run in:
  - `database-backed` mode when Prisma + Postgres are available
  - `mock fallback` mode when they are not
- Strapi publishing is already abstracted behind a provider
- worker is isolated from the web app and can be deployed separately
- health check route exists at `/api/health`

## Recommended production architecture

- Vercel:
  - `apps/web`
- Hosted Postgres:
  - Neon, Supabase, Railway Postgres, or RDS
- Hosted Redis:
  - Upstash or Redis Cloud
- Worker host:
  - Railway, Render, or Fly.io
- Strapi:
  - existing CookUnity CMS

Vercel should host the dashboard and API routes.
The worker should run outside Vercel.

## Repo structure

- `apps/web`
  - dashboard, workflow grid, review UI, API routes
- `apps/worker`
  - background jobs and scheduling
- `packages/core`
  - orchestrator, agents, scoring, publishing, monitoring
- `packages/db`
  - Prisma schema, migrations, seed, Prisma client
- `packages/integrations`
  - Strapi, Ahrefs, GSC, Trends, SERP, analytics adapters
- `packages/prompts`
  - prompt templates and brand voice files
- `packages/shared`
  - config, types, mock data, logger

## Environment files

Local development:
- `.env.example`

Production:
- `.env.production.example`

Prisma local migration env:
- `packages/db/.env`

## Local setup

From the repo root:

```bash
cd "/Users/argelysoriach/Documents/New project"
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Run the app:

```bash
ADMIN_EMAIL=reviewer@cookunity.local ADMIN_PASSWORD=change-me NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3001 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cookunity_seo_agent REDIS_URL=redis://localhost:6379 STRAPI_BASE_URL=https://cms.example.com pnpm --filter @cookunity-seo-agent/web dev --hostname 127.0.0.1 --port 3001
```

Open:
- `http://127.0.0.1:3001`
- `http://127.0.0.1:3001/grid`
- `http://127.0.0.1:3001/agents`
- `http://127.0.0.1:3001/api/health`

## Vercel deployment

### 1. Create managed infrastructure

Provision:
- Postgres
- Redis

### 2. Set Vercel project

Import the repo into Vercel.

Use these settings:
- Framework preset: `Next.js`
- Root directory: repo root or `apps/web`
- Install command:
```bash
pnpm install --frozen-lockfile=false
```
- Build command:
```bash
pnpm --filter @cookunity-seo-agent/web build
```

`vercel.json` is already included at the repo root.

### 3. Add production environment variables

Use `.env.production.example` as the source of truth.

Minimum required:
- `NODE_ENV=production`
- `APP_MODE=live`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `STRAPI_BASE_URL`
- `STRAPI_API_TOKEN`
- `STRAPI_COLLECTION`
- `STRAPI_DOCUMENT_ID_FIELD`
- `STRAPI_ENTRY_ID_FIELD`
- `STRAPI_FIELD_MAPPING_JSON`

Recommended:
- `OPENAI_API_KEY`
- `AHREFS_API_KEY`
- `SERP_API_KEY`
- `GSC_CLIENT_EMAIL`
- `GSC_PRIVATE_KEY`
- `ANALYTICS_API_KEY`

### 4. Run production migrations

Do not use `prisma migrate dev` in production.

Run:

```bash
pnpm db:deploy
```

You can run this from CI or a one-time release job.

### 5. Verify health

After deploy:
- open `/api/health`
- open `/grid`

If the database is connected, the grid should show:
- `database-backed`
- `db connected`

## Worker deployment

The worker should not run on Vercel.

Use:
- Railway
- Render
- Fly.io

Included:
- `apps/worker/Dockerfile`

Worker start command:

```bash
pnpm --filter @cookunity-seo-agent/worker start:mock
```

For real execution set:
- `APP_MODE=live`
- same DB / Redis / Strapi env vars as the web app

## Workflow grid behavior

`/grid` is the main internal workflow surface.

When DB is available:
- creating a row persists a `Keyword`
- upserts a `TopicCandidate`
- runs the orchestrated pipeline through:
  - discovery
  - prioritization
  - brief generation
  - drafting
  - editorial QA
- persists:
  - `ContentBrief`
  - `Outline`
  - `Draft`
  - `AuditLog`
  - `JobRun`

When DB is not available:
- grid falls back to seeded mock rows
- app remains usable for interface preview

## Current limitations

- publish approval and publish actions are persisted, but the full grid still needs inline approve/publish controls
- monitoring snapshots are not yet running as real scheduled production jobs by default
- live provider implementations for some sources remain intentionally stubbed
- worker scheduling still needs production queue hardening

## Recommended next product step

Implement inline grid actions:
- approve
- request revision
- publish
- rerun step

That will make `/grid` the real AirOps-style control surface instead of just the creation/status surface.
