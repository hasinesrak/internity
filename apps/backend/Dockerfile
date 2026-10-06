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
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter backend...
COPY apps/backend apps/backend
# pnpm 10 deploy refuses a workspace unless dependencies are injected.
# --legacy still emits this package plus production dependencies.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter backend build \
 && pnpm --filter backend --store-dir /pnpm/store deploy --prod --legacy /out \
 && test -f /out/dist/index.js \
 && test ! -e /out/.env

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    UPLOAD_DIR=/data/uploads \
    HOME=/tmp
LABEL org.opencontainers.image.source="https://github.com/hasinesrak/internity" \
      org.opencontainers.image.title="internity-backend"
RUN apk add --no-cache openssh-client \
 && mkdir -p /data/uploads \
 && chown node:node /data/uploads
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
