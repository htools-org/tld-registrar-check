FROM oven/bun:alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image, copy all the files and run next
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0

RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=builder /app/dist ./

EXPOSE 3000

CMD ["bun", "index.js"]
