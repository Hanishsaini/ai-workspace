# Standalone Socket.io server — deploy separately from the Vercel app.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# Workspace manifests
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

FROM base AS deps
RUN pnpm install --filter @workspace/socket-server... --frozen-lockfile || \
    pnpm install --filter @workspace/socket-server...

FROM deps AS build
COPY packages/shared ./packages/shared
COPY server ./server
RUN pnpm --filter @workspace/socket-server build

FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/socket-server", "start"]
