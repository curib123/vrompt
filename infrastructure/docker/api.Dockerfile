# syntax=docker/dockerfile:1.7

FROM node:20-bookworm AS dependencies

WORKDIR /workspace

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json

RUN --mount=type=cache,target=/root/.npm \
  npm ci \
    --fetch-retries=10 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000 \
    --fetch-timeout=600000

FROM dependencies AS build

COPY . .

RUN npm run prisma:generate --workspace @vrompt/api \
  && npm run build --workspace @vrompt/api

FROM build AS production-dependencies

RUN npm prune --omit=dev \
  && rm -rf node_modules/prisma apps/api/node_modules

FROM build AS migration

ENV NODE_ENV=production

CMD ["npm", "run", "prisma:deploy", "--workspace", "@vrompt/api"]

FROM node:20-bookworm AS production

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./apps/api/prisma

RUN mkdir -p /var/lib/vrompt/private-chat-files && chown node:node /var/lib/vrompt/private-chat-files

USER node

EXPOSE 4000

STOPSIGNAL SIGTERM

CMD ["node", "apps/api/dist/main.js"]
