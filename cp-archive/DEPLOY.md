# CP Archive — Cloudflare 全栈部署指南

## 架构概览

```
用户浏览器
 ├── 静态资源   → Cloudflare Pages（cdn.yourdomain.com）
 ├── API 请求   → Cloudflare Workers（api.yourdomain.com）
 │                ├── 数据库  → Cloudflare D1（SQLite）
 │                ├── Session → Cloudflare KV
 │                └── 图片上传 → Cloudflare R2
 └── 图片访问   → R2 公开 URL（media.yourdomain.com）
```

---

## 前置条件

- Cloudflare 账号（免费版够用）
- GitHub 账号（仓库已推送）
- Node.js 20+（本地开发用）

---

## 一次性初始化步骤

### Step 1：安装并登录 Wrangler

```bash
npm install -g wrangler
wrangler login
# 会打开浏览器，用 Cloudflare 账号授权
```

### Step 2：创建 D1 数据库

```bash
cd backend-cf
wrangler d1 create cp-archive-db
```

输出示例：
```
✅ Successfully created DB 'cp-archive-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**将 `database_id` 填入 `backend-cf/wrangler.toml`：**
```toml
[[d1_databases]]
binding = "DB"
database_name = "cp-archive-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← 填这里
```

### Step 3：创建 KV 命名空间

```bash
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
```

分别输出 `id` 和 `preview_id`，填入 `wrangler.toml`：
```toml
[[kv_namespaces]]
binding = "KV"
id = "正式环境 id"
preview_id = "预览环境 id"
```

### Step 4：创建 R2 存储桶

```bash
wrangler r2 bucket create cp-archive-media
wrangler r2 bucket create cp-archive-media-preview
```

> R2 桶名已在 `wrangler.toml` 中配置好，无需修改。

### Step 5：设置 R2 公开访问

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **R2** → **cp-archive-media** → **Settings** → **Public access**
3. 点击 **Allow Access** 并复制公开 URL（格式：`https://pub-xxxx.r2.dev`）
4. 或者绑定自定义域名（推荐）：在 **Custom domains** 中添加 `media.yourdomain.com`

将 R2 公开 URL 填入 `wrangler.toml`：
```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

### Step 6：设置 Secrets（敏感变量）

```bash
cd backend-cf

# JWT 密钥（随机字符串，至少 32 位）
wrangler secret put JWT_SECRET
# 输入后回车（不会显示）

wrangler secret put JWT_REFRESH_SECRET
# 输入后回车
```

### Step 7：初始化数据库（执行迁移）

```bash
# 本地测试
wrangler d1 migrations apply cp-archive-db --local

# 远程执行（正式数据库）
wrangler d1 migrations apply cp-archive-db --remote
```

### Step 8：本地开发测试

```bash
cd backend-cf
npm install
wrangler dev
# 访问 http://localhost:8787/api/v1/health
```

---

## 首次部署

### 方式 A：手动部署

```bash
# 部署 Workers
cd backend-cf
npx wrangler deploy

# 构建并部署前端
cd ../frontend
npm run build -- --mode production
npx wrangler pages deploy dist --project-name=cp-archive-frontend
```

第一次 `pages deploy` 会提示创建 Pages 项目，选择 **创建新项目**。

### 方式 B：GitHub Actions 自动部署（推荐）

在 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** 添加以下 Secrets：

| Secret 名称 | 值来源 |
|-------------|--------|
| `CF_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token（选 **Edit Cloudflare Workers** 模板） |
| `CF_ACCOUNT_ID` | Cloudflare Dashboard 右上角账号 ID |
| `VITE_API_BASE_URL` | Workers 部署后得到的 URL，如 `https://cp-archive-api.xxxxx.workers.dev/api/v1` |

配置完成后，推送到 `main` 分支即自动触发部署。

---

## 创建第一个管理员账号

数据库初始化后没有任何用户。需要先手动插入一个 owner 账号：

```bash
# 生成 bcrypt hash（需要 Node.js）
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('your-password-here', 12).then(h => console.log(h));
"
```

然后执行 D1 SQL 插入：
```bash
wrangler d1 execute cp-archive-db --remote --command "
INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  '$(node -e \"console.log(crypto.randomUUID())\")',
  'admin',
  'admin@yourdomain.com',
  '\$2b\$12\$your-hash-here',
  'owner',
  1,
  $(date +%s),
  $(date +%s)
)
"
```

或者在 Cloudflare Dashboard → D1 → cp-archive-db → Console 中执行 SQL。

---

## 前端 Cloudflare Pages 配置

在 Cloudflare Pages 控制台 → 你的项目 → **Settings** → **Environment variables**：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_BASE_URL` | `https://cp-archive-api.xxxxx.workers.dev/api/v1` |

如果绑定了自定义域名：`https://api.yourdomain.com/api/v1`

---

## 自定义域名绑定（可选）

### Workers 绑定域名
1. Cloudflare Dashboard → Workers → cp-archive-api → **Triggers** → **Custom Domains**
2. 添加 `api.yourdomain.com`（需要域名托管在 Cloudflare）

### Pages 绑定域名
1. Cloudflare Dashboard → Pages → cp-archive-frontend → **Custom domains**
2. 添加 `yourdomain.com`

### R2 绑定域名
1. Cloudflare Dashboard → R2 → cp-archive-media → **Settings** → **Custom domains**
2. 添加 `media.yourdomain.com`

---

## 费用估算（个人低流量项目）

| 服务 | 免费额度 | 超出单价 |
|------|----------|----------|
| Workers | 10万次请求/天 | $0.30/百万次 |
| D1 | 500万次读/天，10万次写/天，5GB存储 | $0.001/百万次读 |
| KV | 10万次读/天，1000次写/天 | $0.50/百万次读 |
| R2 | 10GB存储，1000万次读/月 | $0.015/GB·月 |
| Pages | 无限请求，500次构建/月 | 超出构建 $5/月 |

**个人项目预计月费：$0**（免费额度内）

---

## 常见问题

### Q: Workers 报错 "Too many subrequests"
D1 每次请求内最多 50 个子请求（数据库查询）。检查是否有 N+1 查询问题。

### Q: KV 写操作超限（1000次/天）
登录/注册场景下，每次操作写 1 次 KV（存 refresh token）。1000次/天 = 约每分钟 0.7 次，低流量项目绰绰有余。如果超限，考虑升级到 Workers Paid（$5/月，KV 写无限）。

### Q: D1 迁移失败
```bash
# 查看迁移状态
wrangler d1 migrations list cp-archive-db --remote
# 手动执行单个 SQL 文件
wrangler d1 execute cp-archive-db --remote --file=migrations/0001_init.sql
```

### Q: 上传图片报 413
Workers 请求体大小限制：免费版 100MB，已绑定 Zone 的 Workers 1GB。检查 `media.routes.ts` 中的 `MAX_FILE_SIZE` 设置。

---

## 项目目录结构

```
cp-archive/
├── frontend/           ← Vue 3 + Vite（Cloudflare Pages）
│   └── .env.production.example
├── backend-cf/         ← Hono + Workers（新后端）
│   ├── wrangler.toml
│   ├── package.json
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── src/
│       ├── index.ts
│       ├── types/env.ts
│       ├── db/
│       ├── middlewares/
│       ├── modules/
│       └── utils/
├── backend/            ← 原 Node.js 后端（保留备用）
└── .github/workflows/
    └── deploy.yml      ← 自动部署
```
