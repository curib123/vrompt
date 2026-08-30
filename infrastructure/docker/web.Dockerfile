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

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace", "@vrompt/web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
