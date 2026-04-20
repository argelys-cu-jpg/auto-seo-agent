# CookUnity growth workflow platform

Internal operator product for CookUnity organic growth. The system is designed to feel close to AirOps, but opinionated around CookUnity’s business model, brand rules, and review process.

The main control surface is [`/grid`](/Users/argelysoriach/Documents/New%20project/apps/web/src/app/grid/page.tsx). Each row represents a growth opportunity. Each row runs through a fixed workflow:

1. Discovery
2. Prioritization
3. Brief
4. Draft
5. QA
6. Publish

The product goal is straightforward:

- give the team a keyword or page opportunity
- run a high-quality workflow
- review and revise step by step
- publish only after approval

## Two growth paths

The product encodes two distinct paths. They are not interchangeable.

### Path 1: Blog → email capture → nurture → trial

- Blog is not treated as a direct conversion page
- Blog output should move users into email capture and nurture
- Success metric: capture rate
- Typical outputs:
  - blog briefs
  - blog drafts
  - gated assets
  - bridge pages

### Path 2: Landing pages → direct trial

- Landing pages are direct conversion surfaces
- Success metric: checkout CVR
- Typical outputs:
  - SEO landing pages
  - comparison pages
  - cost pages
  - menu-adjacent pages

This distinction affects:

- workflow routing
- CTA generation
- review labels
- publishing expectations
- operator language in the UI

## Product model

### `/grid`

`/grid` is the operator control plane. It is no longer a thin row creator.

Each row shows:

- opportunity / keyword
- intent
- path
- discovery
- prioritization
- brief
- draft
- QA
- publish
- actions

Each row supports:

- workflow execution
- step-level review
- revision requests
- manual draft edits
- step reruns
- publish action
- audit history

Clicking a row opens a right-side detail panel with:

- step outputs
- latest step version
- revision notes
- audit log
- publish history
- operator controls

## Workflow model

The workflow is fixed on purpose. This repo does not implement a generic workflow builder.

### Top-level entities

- `Opportunity`
  - durable row record in the grid
- `WorkflowRun`
  - a top-level execution for an opportunity
- `WorkflowStepRun`
  - one execution record per step, including reruns and versions

### Output artifacts

Artifacts remain persisted separately so the operator workflow can sit on top of content records instead of replacing them.

- `ContentBrief`
- `Outline`
- `Draft`
- `Publication`
- `PublishResult`
- `RevisionNote`
- `AuditLog`

### Step lifecycle

Per-step statuses:

- `not_started`
- `running`
- `completed`
- `failed`
- `needs_review`
- `approved`

Per-row statuses:

- `idle`
- `running`
- `blocked`
- `needs_review`
- `approved`
- `published`
- `failed`

## Architecture

Monorepo layout:

- [`apps/web`](/Users/argelysoriach/Documents/New%20project/apps/web)
  - operator UI
  - grid control plane
  - review flows
  - API routes
- [`apps/worker`](/Users/argelysoriach/Documents/New%20project/apps/worker)
  - scheduled jobs
  - queue-backed opportunity step execution hooks
- [`packages/core`](/Users/argelysoriach/Documents/New%20project/packages/core)
  - workflow services
  - agents
  - publishing logic
  - opportunity control-plane service
- [`packages/db`](/Users/argelysoriach/Documents/New%20project/packages/db)
  - Prisma schema
  - migrations
  - Prisma client
- [`packages/integrations`](/Users/argelysoriach/Documents/New%20project/packages/integrations)
  - Strapi
  - GSC
  - GA / analytics
  - Google Docs review
  - mock and live providers
- [`packages/prompts`](/Users/argelysoriach/Documents/New%20project/packages/prompts)
  - prompt templates
  - CookUnity brand voice
- [`packages/shared`](/Users/argelysoriach/Documents/New%20project/packages/shared)
  - shared types
  - config
  - logging

## What changed in this productized version

### Grid control plane

The grid now behaves like an operator workflow tool instead of a status preview.

Implemented:

- creation + execution in one place
- step-level action endpoints
- right-side detail panel
- manual edit storage
- revision notes
- publish action from the row
- audit trail surfaced in-grid

### Durable workflow state

New schema concepts added:

- `Opportunity`
- `WorkflowRun`
- `WorkflowStepRun`
- `RevisionNote`
- `PublishResult`

Migration:

- [`202604200001_operator_control_plane`](/Users/argelysoriach/Documents/New%20project/packages/db/prisma/migrations/202604200001_operator_control_plane/migration.sql)

### Worker alignment

The worker can now support opportunity-level execution and single-step execution using the same service contract that powers the web actions.

## Local development

From repo root:

```bash
cd "/Users/argelysoriach/Documents/New project"
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Run the web app:

```bash
ADMIN_EMAIL=reviewer@cookunity.local \
ADMIN_PASSWORD=change-me \
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3001 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cookunity_seo_agent \
REDIS_URL=redis://localhost:6379 \
STRAPI_BASE_URL=https://cms.example.com \
pnpm --filter @cookunity-seo-agent/web dev --hostname 127.0.0.1 --port 3001
```

Run the worker:

```bash
pnpm --filter @cookunity-seo-agent/worker start:mock
```

## Main grid flows to test

### 1. Create a row

Go to `/grid` and create an opportunity with:

- keyword
- path
- type
- optional page idea
- optional competitor URL

Expected result:

- a durable `Opportunity` is created
- workflow steps begin running
- the row appears in the grid

### 2. Run the workflow

From the row action column:

- click `Run workflow`

Expected result:

- discovery, prioritization, brief, draft, and QA run in order
- row stops at review rather than auto-publishing

### 3. Approve a step

Open the row detail drawer.

Expected result:

- any step can be approved
- approving QA moves the row to `approved`

### 4. Request revision

Open the row detail drawer and add a revision note for a step.

Expected result:

- `RevisionNote` is persisted
- step status reflects review state
- row becomes `blocked`

### 5. Rerun a step

From the step card:

- click `Rerun step`

Expected result:

- a new `WorkflowStepRun` version is created
- latest version becomes the active one shown in the UI

### 6. Save a manual edit

For `brief` or `draft`:

- edit the JSON payload in the drawer
- save manual edit

Expected result:

- manual output is stored separately on the step run
- for draft edits, draft HTML is updated so publish uses the edited version

### 7. Publish

After QA approval:

- click `Publish`

Expected result:

- publish uses the Strapi abstraction
- publish metadata is stored
- row becomes `published`

## Deployment

Recommended:

- web: Vercel
- database: Postgres
- Redis: Upstash or Redis Cloud
- worker: Railway / Render / Fly
- CMS: Strapi

Environment examples:

- [.env.example](/Users/argelysoriach/Documents/New%20project/.env.example)
- [.env.production.example](/Users/argelysoriach/Documents/New%20project/.env.production.example)

Production migration:

```bash
DATABASE_URL="your-production-url" pnpm db:deploy
```

## Mock and live modes

The system keeps a graceful fallback path.

When DB or providers are unavailable:

- `/grid` can still render mock rows
- the UI remains usable for product preview

When DB and providers are available:

- rows become durable opportunities
- step actions mutate real workflow state
- publishing and review artifacts are persisted

## Current limitations

Still stubbed or partial:

- live Google Trends enrichment
- live SERP/PAA enrichment
- deep version diff UI in the drawer
- publish media/image workflow
- richer manual editing UX than raw JSON / HTML payload editing
- worker queue orchestration is present, but not yet the primary execution path for all web actions

## Recommended next milestone

Focus on operator quality, not more scaffolding:

1. Move row actions fully onto the queue for background execution
2. Add per-step diffing between step versions
3. Add a richer draft editor instead of raw JSON editing
4. Expand path-specific templates for blog vs landing pages
5. Harden live provider onboarding for GSC, Docs, GA4, and Strapi
