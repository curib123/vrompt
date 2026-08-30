FROM node:20-bookworm-slim AS dependencies

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm ci

FROM dependencies AS build

COPY . .

RUN npm run prisma:generate --workspace @vrompt/api \
  && npm run build --workspace @vrompt/api

FROM build AS production-dependencies

RUN npm prune --omit=dev \
  && rm -rf node_modules/prisma apps/api/node_modules

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./apps/api/prisma

RUN mkdir -p /app/storage && chown node:node /app/storage

USER node

EXPOSE 4000

STOPSIGNAL SIGTERM

CMD ["node", "apps/api/dist/main.js"]
