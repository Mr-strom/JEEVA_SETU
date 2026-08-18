# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and package manifests
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/client/package.json ./packages/client/
COPY packages/dashboard/package.json ./packages/dashboard/

# Install all dependencies
RUN npm ci

# Copy API sources & prisma schema
COPY packages/api ./packages/api

# Generate Prisma Client & compile TypeScript
RUN npm run db:generate --workspace=packages/api
RUN npm run build --workspace=packages/api

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma client, build output, and migration assets from builder
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma

EXPOSE 4000

CMD ["node", "packages/api/dist/index.js"]
