# 自制轻量网页部署方案调研报告

> 调研对象：以《赛博徒步之生死鳌太线》（cyberhiking.com）、《人生重开模拟器》（liferestart.syaro.io）等为代表的个人/小团队自制轻量网页项目
> 整理时间：2026-06

---

## 一、典型案例分析

### 案例 1：赛博徒步之生死鳌太线（cyberhiking.com）

| 项目 | 信息 |
|------|------|
| 网址 | https://cyberhiking.com |
| 性质 | 户外安全教育向生存模拟游戏，基于真实鳌太线地理与气候数据 |
| 特点 | 纯网页端，支持中文繁简，无需下载，多平台上线 |
| 技术判断 | 独立域名 + 自定义备案（.com 海外注册），推测为纯前端或轻量 SPA 部署 |
| 部署推断 | 使用独立购买域名，极可能托管于 Cloudflare Pages 或 VPS（域名 cyberhiking.com 无大陆备案痕迹） |

**关键特征：**
- 无任何服务端数据持久化需求（游戏状态存在本地）
- 全纯前端，部署成本极低
- 使用自定义域名提升可信度

---

### 案例 2：人生重开模拟器（liferestart.syaro.io）

| 项目 | 信息 |
|------|------|
| 网址 | https://liferestart.syaro.io |
| GitHub | https://github.com/VickScarlet/lifeRestart（⭐ 10.4k，Fork 2.3k） |
| 技术栈 | JavaScript（99.8%）+ Vite 构建 |
| 运行方式 | 纯前端 SPA，数据存于本地 |
| 构建工具 | Vite + pnpm |
| 部署文件 | 仓库包含 `Dockerfile`（支持 Docker 部署）和 Vite 静态构建 |

**部署方式（README 记录）：**
```bash
git clone https://github.com/VickScarlet/lifeRestart.git
cd lifeRestart
pnpm install
pnpm xlsx2json   # 转换数据文件
pnpm dev         # 本地开发
pnpm build       # 构建产物 → dist/
```
构建后的 `dist/` 可直接丢给任意静态托管平台。

**实际线上部署：**
- 部署在 `liferestart.syaro.io`（子域名，推测 Cloudflare + VPS，并非 GitHub Pages 原始域名）
- 提供 Docker 镜像，可自行 VPS 部署

---

### 案例 3：校园恋爱重开模拟器（SchoolRestart）

| 项目 | 信息 |
|------|------|
| GitHub | https://github.com/xueayi/SchoolRestart |
| 性质 | 人生重开模拟器衍生作，文字 RPG |
| 部署方式 | 典型地通过 GitHub Pages 或 Vercel 免费托管 |

---

## 二、主流部署平台对比（适合轻量自制网页）

### 2.1 纯静态网页（无后端）

适合：纯文字游戏、模拟器、工具类网页，无数据库需求

| 平台 | 免费额度 | 国内访问 | 自定义域名 | 部署难度 | 推荐指数 |
|------|----------|----------|-----------|---------|---------|
| **GitHub Pages** | 无限静态 | ❌ 极慢/时常不通 | ✅（需验证） | ⭐ 最简单 | ★★★（国内不推荐） |
| **Cloudflare Pages** | 无限请求 | ✅ 较好（CDN 覆盖） | ✅ 免费 | ⭐⭐ 简单 | ★★★★★ |
| **Vercel** | 100GB 流量/月 | ⚠️ 部分地区慢 | ✅ 免费 | ⭐⭐ 简单 | ★★★★ |
| **Netlify** | 100GB 流量/月 | ⚠️ 慢 | ✅ 免费 | ⭐⭐ 简单 | ★★★ |
| **Zeabur** | 有限免费 | ✅ 较好（亚洲节点） | ✅ | ⭐⭐ 简单 | ★★★★（中国友好） |

> **结论：面向中国用户的纯静态网页，首选 Cloudflare Pages**

#### Cloudflare Pages 部署流程（以 Vue/Vite 项目为例）

```
1. 登录 dash.cloudflare.com → Pages → 创建项目
2. 连接 GitHub 仓库
3. 配置：
   - Framework preset: Vue / Vite
   - Build command: pnpm build
   - Build output directory: dist
4. 点击 Deploy → 自动构建
5. 绑定自定义域名（可选）
```

---

### 2.2 有轻量后端需求（如 CP Archive）

适合：需要数据库、用户系统、文件上传的项目

| 方案 | 成本 | 国内访问 | 数据持久化 | 运维复杂度 |
|------|------|----------|-----------|----------|
| **腾讯云轻量服务器（香港）** | ¥68/年（新用户），续费 ¥360-480/年 | ✅ 良好 | ✅ VPS 本地磁盘 | 中等 |
| **Zeabur（日本节点）** | $5-15/月 | ✅ 较好 | ⚠️ 需挂载 Volume | 低 |
| **Vultr（东京/新加坡）** | $12/月（2GB RAM） | ✅ 良好 | ✅ | 中等 |
| **Render 免费层** | 免费 | ❌ 慢，且 15 分钟无访问休眠 | ❌ | 低 |
| **Railway** | 按量计费，$5 赠金/月 | ⚠️ 一般 | ✅ | 低 |

---

## 三、部署模式分类

### 模式 A：纯静态托管（最简单，0 成本）

**适用项目类型：**
- 纯文字游戏（人生重开、鳌太线模拟器类）
- 工具类网页（计算器、生成器）
- 展示类网站（作品集）
- 游戏存档存在 localStorage，无需服务器

**技术路径：**
```
代码仓库（GitHub）
    ↓  push to main
Cloudflare Pages（自动构建）
    ↓
全球 CDN 分发
    ↓  绑定自定义域名
用户访问（国内速度优秀）
```

**优点：** 完全免费、无需维护、自动 HTTPS、全球 CDN  
**缺点：** 无法存储服务端数据、无用户系统

---

### 模式 B：前端静态 + 后端 PaaS（中等复杂度）

**适用项目类型：**
- 有用户注册/登录的网页
- 需要共享数据（如排行榜、评论）
- CP Archive 类（需要数据库）

**技术路径：**
```
前端 → Cloudflare Pages（免费静态）
后端 → Zeabur / Railway（托管 Node/Docker 服务）
数据库 → 平台托管 PostgreSQL 或 Supabase 免费层
```

**优点：** 运维简单，无需配置服务器  
**缺点：** 成本 $5-15/月，上传文件持久化需额外配置（如 Cloudflare R2）

---

### 模式 C：全栈 VPS 自托管（最灵活）

**适用项目类型：**
- 需要完整控制权（上传文件、自定义域名 SSL、数据库）
- 长期运营的项目

**技术路径（以腾讯云香港为例）：**
```
腾讯云轻量服务器（香港，Docker CE 镜像）
├── nginx（反向代理 + SSL）
├── 前端构建产物（由 nginx 直接 serve）
├── 后端 API 容器
├── PostgreSQL 容器
└── Redis 容器
```

**部署工具：** Docker Compose + GitHub Actions（自动化 CI/CD）

---

## 四、针对 CP Archive 项目的建议

CP Archive 项目（Node.js + Hono + Vue3 + PostgreSQL + Redis）已有完整 Docker 基础设施，建议：

### 短期上线（快速验证）

**方案：Zeabur 或 Railway**
- 直接 push Docker Compose → 平台自动部署
- 不需要配置服务器
- 费用 $5-10/月

### 长期稳定运营

**方案：腾讯云香港轻量服务器（¥68/年新用户）**
- 完全控制，数据本地
- 按已有 `docker-compose.yml` + `deploy.yml` 直接使用
- 参考之前整理的详细步骤文档

### 静态资源加速（可选优化）

无论选哪种方案，可以把静态前端产物单独推到 Cloudflare Pages，由 Cloudflare CDN 加速中国访问，后端 API 保持在 VPS 上。

```nginx
# nginx 配置参考：前端走 CDN，API 走源站
location /api/ {
    proxy_pass http://localhost:3000;  # 源站 API
}
# 前端直接用 Cloudflare Pages 域名，跨域配置 ALLOWED_ORIGINS
```

---

## 五、国内访问速度参考（2025-2026 实测评价汇总）

| 平台 | 国内访问评价 |
|------|------------|
| GitHub Pages（默认域名） | ❌ 极慢，大量地区超时 |
| Vercel（默认域名） | ⚠️ 时好时坏，部分地区被墙 |
| Cloudflare Pages | ✅ 多数地区正常，速度可接受（非顶级） |
| Cloudflare Pages + 自定义域名 | ✅✅ 更稳定 |
| 腾讯云香港轻量 | ✅✅ 国内访问延迟 30-80ms |
| Zeabur（日本 Tokyo） | ✅ 国内访问延迟 80-150ms |

> **注：** Vercel、GitHub Pages 通过 `enhanced-FaaS-in-China`（GitHub: xingpingcn/enhanced-FaaS-in-China）可优化访问，但需要额外配置 Cloudflare Worker 转发。

---

## 六、总结决策树

```
你的项目有后端/数据库吗？
│
├── 否（纯前端）
│   └── → Cloudflare Pages（免费，国内访问最佳）
│
└── 是（有 API + 数据库）
    │
    ├── 预算 = 0 → Railway 免费层（但 US 节点，国内慢）
    │
    ├── 预算 $5-15/月 → Zeabur（亚洲节点，简单）
    │
    └── 预算 ¥360-500/年（长期）→ 腾讯云香港轻量
        + Cloudflare Pages（前端加速）
        最推荐：性价比最高 + 中国访问最佳
```

---

## 参考资源

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Zeabur 官网](https://zeabur.com/)
- [人生重开模拟器源码](https://github.com/VickScarlet/lifeRestart)
- [赛博徒步鳌太线游戏](https://cyberhiking.com/)
- [enhanced-FaaS-in-China（Vercel/CF 国内优化）](https://github.com/xingpingcn/enhanced-FaaS-in-China)
- [腾讯云轻量应用服务器](https://cloud.tencent.com/product/lighthouse)
