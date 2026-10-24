# syntax=docker/dockerfile:1
# Build context: repository root (pnpm workspace + lockfile live there).
#   docker build -f apps/dashboard/Dockerfile \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... .

FROM node:24-alpine AS base
RUN npm install -g pnpm@12.15.0 && apk add --no-cache libc6-compat
WORKDIR /repo

# -- dependencies (cached until a manifest or the lockfile changes) -----------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY services/simulator/package.json services/simulator/
COPY services/worker/package.json services/worker/
RUN pnpm install --frozen-lockfile --filter @smartgrid/dashboard

# -- build -----------------------------------------------------------------------
FROM deps AS build
COPY apps/dashboard apps/dashboard
# NEXT_PUBLIC_* are inlined into the browser bundle at build time. Anon key only.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @smartgrid/dashboard build

# -- runtime: standalone server only, non-root -------------------------------------
FROM node:24-alpine AS runtime
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=app:app /repo/apps/dashboard/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "apps/dashboard/server.js"]
