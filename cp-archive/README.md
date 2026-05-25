# CP 档案站

> 记录每一份心动的轨迹 — CP 时间线档案管理工具

## 项目结构

```
cp-archive/
├── backend/          # Node.js + Hono 后端
├── frontend/         # Vue 3 + Vite 前端
├── nginx/            # Nginx 配置
├── scripts/          # 运维脚本
├── .github/          # GitHub Actions CI/CD
├── docker-compose.yml
└── .env.example
```

## 快速开始（本地开发）

### 前提条件
- Node.js 20+
- PostgreSQL 16（或 Docker）
- Redis 7（或 Docker）

### 克隆后首次设置

```bash
# 1. 安装 Git pre-commit hook（防止敏感信息提交）
# Linux / macOS / Git Bash:
sh scripts/security/install-hooks.sh

# Windows cmd:
scripts\security\install-hooks.bat
```

### 后端

```bash
cd backend
cp .env.example .env    # 编辑 .env，填写数据库连接等配置
npm install
npm run db:migrate      # 初始化数据库
npm run dev             # 启动开发服务器 http://localhost:3000
```

### 前端

```bash
cd frontend
npm install
npm run dev             # 启动开发服务器 http://localhost:5173
```

前端开发服务器已配置代理，`/api/*` 自动转发到 `http://localhost:3000`。

## 生产部署（Docker Compose）

```bash
# 1. 准备环境变量
cp .env.example .env
vim .env    # 填写生产配置

# 2. 构建前端
cd frontend && npm ci && npm run build && cd ..

# 3. 启动所有服务
docker compose up -d

# 4. 执行数据库迁移
docker compose exec api npm run db:migrate

# 5. 创建初始账号
docker compose exec api npm run db:seed
```

## API 文档

健康检查：`GET /api/v1/health`

更多 API 端点见 [PhaseDesign.md](../PhaseDesign.md)。

## 开发进度

- [x] Phase 0：工程基础（当前）
- [ ] Phase 1：核心数据层
- [ ] Phase 2：认证与权限
- [ ] Phase 3：CP 管理（MVP）
- [ ] ...

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + TypeScript + Tailwind CSS + Pinia |
| 后端 | Node.js 20 + Hono + Drizzle ORM + Zod |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 部署 | Docker Compose + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions |
