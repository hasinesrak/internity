# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/staff/package.json apps/staff/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter staff...
COPY apps/staff apps/staff
COPY packages/ui packages/ui
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_BASE_PATH=/staff
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN test -n "$VITE_API_URL"
# pnpm 10 deploy refuses a workspace unless dependencies are injected.
# --legacy still emits this package plus production dependencies.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter staff build \
 && pnpm --filter staff --store-dir /pnpm/store deploy --prod --legacy /out \
 && test -f /out/dist/server/server.js \
 && test -f /out/prod-server.mjs \
 && test ! -e /out/.env

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    HOME=/tmp
LABEL org.opencontainers.image.source="https://github.com/hasinesrak/internity" \
      org.opencontainers.image.title="internity-staff"
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/prod-server.mjs ./prod-server.mjs
COPY --from=build --chown=node:node /out/node_modules ./node_modules
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "prod-server.mjs"]
