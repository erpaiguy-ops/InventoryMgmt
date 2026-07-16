# Inventory Management ERP

A Turborepo monorepo for a full-stack Inventory Management ERP.

- **Frontend:** Next.js 14 (App Router), TailwindCSS, shadcn/ui
- **Backend:** NestJS 10 on Node.js 20
- **Database/Auth:** Supabase (cloud project `dmoqvnkdnrclojhcpnre` — no local Supabase instance)
- **Package manager:** pnpm
- **Monorepo tooling:** Turborepo

## Structure

```
apps/
  web/          Next.js frontend (src/app, components, lib, hooks, services, types, utils)
  api/          NestJS backend (src/modules, common, config)
packages/
  shared-types/ Shared TypeScript types used by both apps
  database/     Supabase migrations, RLS policies, and seed data
  eslint-config/Shared ESLint config (base, Next.js, NestJS variants)
.github/workflows/
  ci.yml        Lint, typecheck, test, build on every PR/push
  deploy.yml    Migrate Supabase + build/push Docker images on main
```

## Prerequisites

- Node.js >= 20
- pnpm 9 (`corepack enable` will pick up the pinned version automatically)
- A Supabase project (this repo targets project ref `dmoqvnkdnrclojhcpnre`)
- Supabase CLI access token if you need to run migrations (`supabase login`)

## Getting started

```bash
cp .env.example .env
pnpm install
pnpm dev
```

This starts both apps in parallel via Turborepo:

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1 (Swagger docs at `/api/docs` outside production)

## Environment variables

Copy `.env.example` to `.env` at the repo root and fill in real values from your
Supabase project settings (Project Settings → API). Never commit real service
role keys. See `.env.example` for the full list and where each variable is
consumed (web vs. api vs. database tooling).

## Common scripts

Run from the repo root (Turborepo fans these out to each app/package):

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `pnpm dev`        | Run all apps in dev mode                           |
| `pnpm build`      | Build all apps/packages                            |
| `pnpm lint`       | Lint all apps/packages                             |
| `pnpm typecheck`  | Type-check all apps/packages                       |
| `pnpm test`       | Run unit/e2e tests                                 |
| `pnpm format`     | Format the repo with Prettier                      |
| `pnpm db:migrate` | Push SQL migrations to the linked Supabase project |
| `pnpm db:seed`    | Execute the seed SQL against the linked project    |

## Database (Supabase)

`packages/database` holds SQL migrations (`supabase/migrations`) and seed data
(`supabase/seeds`) for the cloud project. This repo is **cloud-only**: there is
no local Supabase stack to start. To apply schema changes:

```bash
export SUPABASE_PROJECT_ID=dmoqvnkdnrclojhcpnre
pnpm --filter @inventory-mgmt/database link
pnpm db:migrate
pnpm db:seed   # optional, development data
```

Row Level Security is enabled on every tenant-scoped table, isolating data by
`organization_id` via `public.current_organization_id()`.

## Docker

`docker-compose.yml` builds and runs both apps against the same cloud Supabase
project (via `.env`) for a production-like local environment:

```bash
docker compose up --build
```

## Code quality

- TypeScript strict mode is enforced repo-wide via `tsconfig.base.json`.
- ESLint + Prettier are shared through `@inventory-mgmt/eslint-config`.
- Husky + lint-staged run linting/formatting on staged files before commit.
