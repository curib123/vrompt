FROM node:20-bookworm-slim

WORKDIR /workspace

COPY package.json package-lock.json* turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm install

COPY . .

RUN npm run prisma:generate --workspace @vrompt/api

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:deploy --workspace @vrompt/api && npm run dev --workspace @vrompt/api"]
