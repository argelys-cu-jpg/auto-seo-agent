FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/integrations/package.json packages/integrations/package.json
COPY packages/prompts/package.json packages/prompts/package.json
COPY packages/db/package.json packages/db/package.json

RUN pnpm install --frozen-lockfile=false

COPY . .

RUN pnpm db:generate

CMD ["pnpm", "--filter", "@cookunity-seo-agent/worker", "start:mock"]
