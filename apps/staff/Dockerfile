FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/staff/package.json apps/staff/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --filter staff...
COPY apps/staff apps/staff
COPY packages/ui packages/ui
ARG VITE_API_URL=http://localhost:4001
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter staff build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/ui ./packages/ui
COPY --from=build /app/apps/staff/package.json ./apps/staff/package.json
COPY --from=build /app/apps/staff/dist ./apps/staff/dist
COPY --from=build /app/apps/staff/node_modules ./apps/staff/node_modules
COPY --from=build /app/apps/staff/prod-server.mjs ./apps/staff/prod-server.mjs
WORKDIR /app/apps/staff
EXPOSE 3001
CMD ["node", "prod-server.mjs"]
