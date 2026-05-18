# 多阶段构建 - 最小化生产镜像
FROM node:20-alpine AS builder

# sharp 依赖原生 vips
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

# 运行时依赖 vips
RUN apk add --no-cache vips

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
