# syntax=docker/dockerfile:1
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inventory-mgmt/shared-types build
RUN pnpm --filter @inventory-mgmt/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages/shared-types/dist ./packages/shared-types/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
