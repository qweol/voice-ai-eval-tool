# 使用官方 Node.js 运行时作为基础镜像
FROM node:20-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./
RUN npm ci

# 构建阶段
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client
RUN node node_modules/.bin/prisma generate

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1

# 构建应用
RUN npm run build

# 生产镜像
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建必要的目录用于存储音频文件
RUN mkdir -p /app/storage/audio && chown -R nextjs:nodejs /app/storage
RUN mkdir -p /app/public/audio && chown -R nextjs:nodejs /app/public/audio

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]





