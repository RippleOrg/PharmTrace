FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

FROM base AS builder
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
COPY prisma ./prisma/
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000
CMD ["node", "dist/index.js"]
