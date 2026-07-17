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
  deploy.yml    Migrate Supabase, build/push Docker images, deploy API to
                Fly.io on main (web deploys separately via Vercel's own
                GitHub integration — see "Deploying to production" below)
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
- API: http://localhost:3001/api (Swagger docs at `/api/docs` outside production)

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

This is a single-workspace ERP (no multi-tenancy): every authenticated user
shares the same products, inventory, orders, etc. Row Level Security is
enabled on every table — reads are open to any authenticated user, writes
follow the same rule, and deletes require `admin`/`super_admin` (see
`profiles.role`). `stock_movements` is the only supported write path for
stock changes; inserting a row there auto-computes `inventory.quantity` via
a trigger. New signups get a `profiles` row automatically via a trigger on
`auth.users`.

## Docker

`docker-compose.yml` builds and runs both apps against the same cloud Supabase
project (via `.env`) for a production-like local environment:

```bash
docker compose up --build
```

## Deploying to production

Both apps can deploy to **Vercel** as two separate projects pointing at this
same repo (one with Root Directory `apps/web`, one with Root Directory
`apps/api`) — no other accounts needed. **Fly.io remains available** as an
alternative for the API (`apps/api/fly.toml`, wired into
`.github/workflows/deploy.yml`) if you outgrow serverless later — see
"API on Fly.io instead" below.

### 1. Web → Vercel

1. In the [Vercel dashboard](https://vercel.com/new), import this repository.
2. Set **Root Directory** to `apps/web`. Vercel picks up `apps/web/vercel.json`,
   which overrides the install/build commands to run from the monorepo root
   (`pnpm install` + `turbo run build --filter=web`) so the
   `@inventory-mgmt/shared-types` workspace dependency builds first.
3. Add environment variables (Project Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://dmoqvnkdnrclojhcpnre.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<production anon key>
   NEXT_PUBLIC_API_URL=https://<your-api-project>.vercel.app
   NEXT_PUBLIC_APP_URL=https://<your-web-domain>
   ```
   (`NEXT_PUBLIC_API_URL` needs the API project's URL from step 2 below —
   come back and set it once that project exists.)
4. Deploy. Subsequent pushes to `main` auto-deploy; PRs get preview
   deployments automatically.

### 2. API → Vercel (serverless)

The NestJS app runs as a single Vercel Node.js function
(`apps/api/api/index.ts`), which wraps the Express instance Nest builds and
reuses it across warm invocations. `apps/api/vercel.json` rewrites every
incoming path to that function, so `/health` and `/api/*` both work exactly
as they do locally — only the transport changed, not the app's routes.

1. In the Vercel dashboard, **Add New → Project**, import the same repo
   again as a second project. Set **Root Directory** to `apps/api`.
2. Add environment variables (values from Supabase Project Settings → API,
   plus your own `JWT_SECRET` — see `.env.example` for the full list):
   ```
   NODE_ENV=production
   SUPABASE_URL=https://dmoqvnkdnrclojhcpnre.supabase.co
   SUPABASE_ANON_KEY=<production anon key>
   SUPABASE_SERVICE_ROLE_KEY=<production service role key>
   JWT_SECRET=<a long random string>
   FRONTEND_URL=https://<your-web-domain-from-step-1>
   API_PREFIX=api
   ```
3. Deploy. Verify: `curl https://<your-api-project>.vercel.app/health`
   should return `{"status":"ok",...}`.
4. Go back to the web project's env vars and set `NEXT_PUBLIC_API_URL` to
   this API project's URL, then redeploy web.

**Trade-off to know about:** this is a serverless function, not a
persistent server — cold starts add latency to the first request after
idle, and Vercel enforces a per-invocation time limit (10s on the Hobby
plan). Nothing in this app currently runs long enough to hit that, but if
it ever does, that's what Fly.io (below) is for.

### API on Fly.io instead

1. Install flyctl and log in: `curl -L https://fly.io/install.sh | sh` then
   `fly auth login`.
2. Create the app (Fly app names are globally unique, so pick your own):
   ```bash
   fly apps create <your-unique-app-name>
   ```
   Update the `app` field in `apps/api/fly.toml` to match.
3. Set production secrets on Fly (same values as the Vercel env vars above):
   ```bash
   fly secrets set --app <your-unique-app-name> \
     SUPABASE_URL=https://dmoqvnkdnrclojhcpnre.supabase.co \
     SUPABASE_ANON_KEY=... \
     SUPABASE_SERVICE_ROLE_KEY=... \
     JWT_SECRET=... \
     FRONTEND_URL=https://your-web-domain.vercel.app
   ```
4. In the GitHub repo, add secret `FLY_API_TOKEN` (from
   `fly tokens create deploy`) and set repo **variable**
   `FLY_DEPLOY_ENABLED=true` (Settings → Secrets and variables → Actions).
   The deploy job is gated behind that variable so it stays a no-op until
   this setup is done — otherwise every push to `main` would fail on
   missing credentials.
5. Push to `main`, or run the "Deploy" workflow manually
   (Actions → Deploy → Run workflow).
6. Point `NEXT_PUBLIC_API_URL` (web project env vars) at
   `https://<your-fly-app>.fly.dev` instead of the Vercel API project.

## Code quality

- TypeScript strict mode is enforced repo-wide via `tsconfig.base.json`.
- ESLint + Prettier are shared through `@inventory-mgmt/eslint-config`.
- Husky + lint-staged run linting/formatting on staged files before commit.
