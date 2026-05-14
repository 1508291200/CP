# CP 档案站 · 系统架构设计文档

**版本：** v1.0  
**作者：** xuxinyi06  
**日期：** 2026-05-14  
**参考文档：** CPDesign.md / UIDesign.md

---

## 一、架构目标与约束

### 1.1 设计目标

| 目标 | 说明 |
|------|------|
| 可执行性 | 技术栈成熟，文档到代码路径清晰，可直接落地 |
| 可扩展性 | 新增功能模块不影响已有模块，接口契约稳定 |
| 低耦合性 | 前后端分离，各服务边界清晰，依赖方向单一 |
| 高可维护性 | 统一代码规范、分层清晰、配置外置、日志完备 |
| 自部署友好 | 适配个人云服务器，Docker 容器化，一键启停 |

### 1.2 核心约束

- 部署环境：个人云服务器（单节点，Linux，可长期运行）
- 用户规模：小型（创作者自用 + 少量协作成员，百人级别）
- 数据安全：用户上传图片/内容需持久化，不可丢失
- 运维成本：尽量减少手动运维，CI/CD 自动化部署

---

## 二、整体架构概览

### 2.1 架构风格

采用 **前后端分离 + RESTful API + 单体应用（Modular Monolith）** 架构。

> **为什么不用微服务？**  
> 当前用户规模小，微服务的运维复杂度远超收益。模块化单体应用在内部以清晰的模块边界组织代码，当未来需要拆分时可平滑迁移到微服务。

### 2.2 系统分层

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                  Nginx（反向代理）                        │
│   - SSL 终止（Let's Encrypt）                            │
│   - 静态资源服务（前端构建产物）                          │
│   - API 请求转发 → 后端服务                              │
│   - 静态文件上传转发 → 文件服务                          │
└──────────┬────────────────────────────┬─────────────────┘
           │ /api/*                     │ /uploads/*
┌──────────▼──────────┐     ┌──────────▼──────────┐
│   后端 API 服务      │     │   静态文件服务        │
│   Node.js + Hono    │     │   Nginx 直接服务      │
│   端口：3000         │     │   /data/uploads/     │
└──────────┬──────────┘     └─────────────────────┘
           │
┌──────────▼──────────┐
│   数据库层           │
│   PostgreSQL         │
│   + Redis（缓存）    │
└─────────────────────┘
```

### 2.3 部署视图

```
云服务器（单节点 Linux）
├── Docker Compose 编排
│   ├── nginx          ← 反向代理 + 前端静态文件
│   ├── api            ← Node.js 后端
│   ├── postgres       ← 主数据库
│   └── redis          ← 缓存 + Session
├── /data/
│   ├── postgres/      ← 数据库持久化卷
│   ├── uploads/       ← 用户上传文件
│   └── backups/       ← 自动备份
└── /app/
    ├── frontend/      ← 前端构建产物（dist）
    └── backend/       ← 后端源码
```

---

## 三、技术选型

### 3.1 前端

| 技术 | 选型 | 理由 |
|------|------|------|
| 框架 | **Vue 3** | 生态成熟，组合式 API 利于模块化，学习曲线适中 |
| 构建工具 | **Vite** | 极速 HMR，构建产物优化好 |
| 路由 | **Vue Router 4** | 官方路由，支持懒加载 |
| 状态管理 | **Pinia** | 官方推荐，模块化，TypeScript 友好 |
| UI 组件库 | **自研组件 + Headless UI** | 完全匹配设计稿，不受第三方组件库限制 |
| CSS 方案 | **Tailwind CSS + CSS Variables** | 工具类快速开发，CSS 变量承载主题系统 |
| HTTP 客户端 | **Axios** | 拦截器机制完善，适合统一鉴权处理 |
| 富文本编辑器 | **Tiptap** | 基于 ProseMirror，块级扩展性强 |
| 图表/时间轴 | **自研 SVG 组件** | 时间轴高度定制，第三方库难以满足 |
| 语言 | **TypeScript** | 类型安全，IDE 支持好 |

### 3.2 后端

| 技术 | 选型 | 理由 |
|------|------|------|
| 运行时 | **Node.js 20 LTS** | 稳定，生态庞大 |
| Web 框架 | **Hono** | 极轻量，TypeScript 原生，边缘计算友好，路由性能优秀 |
| ORM | **Drizzle ORM** | TypeScript 原生，SQL-like API，类型推导准确，迁移工具完备 |
| 认证 | **JWT（jose 库）+ Refresh Token** | 无状态，适合前后端分离 |
| 文件上传 | **Multer + 本地存储** | 简单可靠，文件存服务器本地路径 |
| 图片处理 | **Sharp** | 生成缩略图、压缩、格式转换 |
| 任务队列 | **BullMQ + Redis** | 图片处理等异步任务解耦 |
| 日志 | **Pino** | 高性能结构化日志 |
| 参数验证 | **Zod** | 与 TypeScript 类型系统深度集成 |
| 语言 | **TypeScript** | 全栈类型统一 |

### 3.3 数据库与缓存

| 技术 | 选型 | 理由 |
|------|------|------|
| 主数据库 | **PostgreSQL 16** | 关系型，JSON 支持好，适合扩展字段存储 |
| 缓存 | **Redis 7** | Session 存储、热点数据缓存、BullMQ 依赖 |
| 全文搜索 | **PostgreSQL FTS**（pg_trgm） | 无需额外服务，对中文搜索足够用 |
| 备份 | **pg_dump + cron + 本地压缩存档** | 每日自动备份 |

### 3.4 DevOps

| 技术 | 选型 | 理由 |
|------|------|------|
| 容器化 | **Docker + Docker Compose** | 单节点部署最简方案 |
| 反向代理 | **Nginx** | 静态文件服务 + SSL + 代理 |
| SSL | **Let's Encrypt + Certbot** | 免费自动续期 |
| CI/CD | **GitHub Actions** | 推送自动构建 + SSH 部署到云服务器 |
| 进程管理 | **Docker 容器自重启**（restart: always） | 替代 PM2，统一由 Docker 管理 |

---

## 四、前端架构

### 4.1 目录结构

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.ts                 ← 应用入口
│   ├── App.vue                 ← 根组件
│   │
│   ├── router/                 ← 路由配置
│   │   ├── index.ts            ← 路由表 + 守卫
│   │   └── routes/             ← 按页面分组路由
│   │       ├── home.ts
│   │       ├── cp.ts
│   │       └── settings.ts
│   │
│   ├── stores/                 ← Pinia 状态管理
│   │   ├── auth.ts             ← 认证状态
│   │   ├── cp.ts               ← CP 数据
│   │   ├── event.ts            ← 事件数据
│   │   ├── theme.ts            ← 主题配置
│   │   └── ui.ts               ← UI 状态（侧边栏开合等）
│   │
│   ├── api/                    ← API 层（封装所有请求）
│   │   ├── client.ts           ← Axios 实例 + 拦截器
│   │   ├── auth.ts
│   │   ├── cp.ts
│   │   ├── event.ts
│   │   ├── milestone.ts
│   │   ├── user.ts
│   │   └── types.ts            ← API 请求/响应类型
│   │
│   ├── components/             ← 通用组件
│   │   ├── base/               ← 原子组件
│   │   │   ├── Button.vue
│   │   │   ├── Input.vue
│   │   │   ├── Badge.vue
│   │   │   ├── Tag.vue
│   │   │   ├── Avatar.vue
│   │   │   ├── Modal.vue
│   │   │   ├── Toast.vue
│   │   │   └── Dropdown.vue
│   │   ├── layout/             ← 布局组件
│   │   │   ├── AppNav.vue
│   │   │   ├── DetailNav.vue
│   │   │   └── TabBar.vue
│   │   ├── cp/                 ← CP 相关组件
│   │   │   ├── CpCard.vue
│   │   │   ├── CpBanner.vue
│   │   │   └── CpTagCloud.vue
│   │   ├── timeline/           ← 时间轴组件
│   │   │   ├── Timeline.vue
│   │   │   ├── TimelineSegment.vue
│   │   │   ├── EventRow.vue
│   │   │   ├── EventDetail.vue
│   │   │   └── ImportanceTag.vue
│   │   ├── milestone/          ← 大事记组件
│   │   │   ├── MilestoneCard.vue
│   │   │   └── YearFilter.vue
│   │   ├── profile/            ← 人物简介组件
│   │   │   ├── CharacterCard.vue
│   │   │   └── RelationOverview.vue
│   │   └── editor/             ← 编辑器组件
│   │       ├── BlockEditor.vue ← Tiptap 富文本
│   │       ├── QuickInput.vue  ← 快速录入条
│   │       └── MediaUpload.vue
│   │
│   ├── views/                  ← 页面视图（路由组件）
│   │   ├── HomeView.vue
│   │   ├── cp/
│   │   │   ├── CpDetailView.vue
│   │   │   ├── ProfileTab.vue
│   │   │   ├── TimelineTab.vue
│   │   │   ├── MilestoneTab.vue
│   │   │   └── CustomTab.vue
│   │   ├── settings/
│   │   │   ├── SettingsView.vue
│   │   │   ├── ThemeSettings.vue
│   │   │   ├── MemberSettings.vue
│   │   │   └── DataSettings.vue
│   │   └── auth/
│   │       ├── LoginView.vue
│   │       └── RegisterView.vue
│   │
│   ├── composables/            ← 可复用组合式函数
│   │   ├── useAuth.ts
│   │   ├── useCp.ts
│   │   ├── useEvent.ts
│   │   ├── useTheme.ts
│   │   ├── usePermission.ts    ← 权限判断
│   │   ├── useInfiniteScroll.ts
│   │   └── useDebounce.ts
│   │
│   ├── styles/                 ← 全局样式
│   │   ├── globals.css         ← CSS Reset + 全局基础
│   │   ├── variables.css       ← CSS 变量（主题 Token）
│   │   └── themes/             ← 内置主题文件
│   │       ├── default.css
│   │       ├── dark.css
│   │       └── sakura.css
│   │
│   ├── utils/                  ← 工具函数
│   │   ├── date.ts             ← 日期格式化
│   │   ├── permission.ts       ← 权限工具
│   │   ├── storage.ts          ← LocalStorage 封装
│   │   └── validate.ts
│   │
│   └── types/                  ← 全局 TypeScript 类型
│       ├── cp.ts
│       ├── event.ts
│       ├── user.ts
│       └── theme.ts
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 4.2 路由设计

```typescript
// 路由结构
/                           → HomeView（CP 列表/搜索）
/login                      → LoginView
/register                   → RegisterView（仅站长可开启注册）

/cp/:id                     → CpDetailView（CP 详情容器）
/cp/:id/profile             → ProfileTab
/cp/:id/timeline            → TimelineTab
/cp/:id/milestones          → MilestoneTab
/cp/:id/custom/:tabId       → CustomTab

/settings                   → SettingsView
/settings/theme             → ThemeSettings
/settings/members           → MemberSettings（需管理员权限）
/settings/data              → DataSettings

// 路由守卫
- 需要登录的页面：beforeEach 检查 token
- 需要权限的页面：beforeEach 检查角色
- 懒加载：所有 View 使用动态 import()
```

### 4.3 主题系统实现

```typescript
// stores/theme.ts
// 主题通过切换 CSS 变量实现，无需重新渲染组件树
interface ThemeConfig {
  colorPrimary: string
  colorBackground: string
  colorCard: string
  fontFamily: string
  // ... 其他 token
}

// 切换主题：将 token 写入 :root CSS 变量
function applyTheme(config: ThemeConfig) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', config.colorPrimary)
  // ...
}

// CP 级主题：进入详情页时覆盖全局主题，离开时恢复
```

### 4.4 权限控制（前端）

```typescript
// composables/usePermission.ts
// 权限仅做 UI 级别控制（隐藏按钮/页面），真正的权限校验在后端

type Role = 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer' | 'guest'

const PERMISSIONS: Record<string, Role[]> = {
  'event:create':       ['owner', 'admin', 'editor', 'contributor'],
  'event:edit:others':  ['owner', 'admin', 'editor'],
  'event:delete:others':['owner', 'admin'],
  'cp:create':          ['owner', 'admin', 'editor'],
  'member:manage':      ['owner', 'admin'],
  'settings:site':      ['owner'],
}

function can(action: string): boolean {
  const role = authStore.user?.role
  return PERMISSIONS[action]?.includes(role) ?? false
}
```

---

## 五、后端架构

### 5.1 目录结构

```
backend/
├── src/
│   ├── index.ts                ← 应用入口，注册中间件和路由
│   │
│   ├── config/                 ← 配置管理
│   │   ├── index.ts            ← 读取环境变量，统一导出
│   │   └── database.ts         ← 数据库连接配置
│   │
│   ├── db/                     ← 数据库层
│   │   ├── schema/             ← Drizzle 表定义
│   │   │   ├── users.ts
│   │   │   ├── cp.ts
│   │   │   ├── events.ts
│   │   │   ├── milestones.ts
│   │   │   ├── characters.ts
│   │   │   ├── tags.ts
│   │   │   ├── media.ts
│   │   │   └── index.ts        ← 统一导出所有 schema
│   │   ├── migrations/         ← 数据库迁移文件（自动生成）
│   │   └── seed.ts             ← 初始数据
│   │
│   ├── modules/                ← 功能模块（核心分层）
│   │   ├── auth/
│   │   │   ├── auth.routes.ts  ← 路由定义
│   │   │   ├── auth.service.ts ← 业务逻辑
│   │   │   ├── auth.schema.ts  ← Zod 验证 schema
│   │   │   └── auth.types.ts   ← 类型定义
│   │   ├── cp/
│   │   │   ├── cp.routes.ts
│   │   │   ├── cp.service.ts
│   │   │   ├── cp.schema.ts
│   │   │   └── cp.types.ts
│   │   ├── event/
│   │   │   ├── event.routes.ts
│   │   │   ├── event.service.ts
│   │   │   ├── event.schema.ts
│   │   │   └── event.types.ts
│   │   ├── milestone/
│   │   ├── character/
│   │   ├── tag/
│   │   ├── media/              ← 文件上传处理
│   │   │   ├── media.routes.ts
│   │   │   ├── media.service.ts
│   │   │   └── media.processor.ts ← Sharp 图片处理
│   │   ├── user/               ← 用户/成员管理
│   │   └── settings/           ← 站点设置
│   │
│   ├── middlewares/            ← 中间件
│   │   ├── auth.middleware.ts  ← JWT 验证
│   │   ├── permission.middleware.ts ← 权限检查
│   │   ├── rateLimit.middleware.ts  ← 限流
│   │   ├── upload.middleware.ts     ← Multer 文件上传
│   │   ├── logger.middleware.ts     ← 请求日志
│   │   └── error.middleware.ts      ← 统一错误处理
│   │
│   ├── shared/                 ← 跨模块共享
│   │   ├── types.ts            ← 共享类型
│   │   ├── errors.ts           ← 自定义错误类
│   │   ├── response.ts         ← 统一响应格式
│   │   └── constants.ts
│   │
│   ├── jobs/                   ← 后台任务（BullMQ）
│   │   ├── queue.ts            ← 队列初始化
│   │   ├── image.processor.ts  ← 图片压缩/缩略图生成
│   │   └── backup.job.ts       ← 数据备份任务
│   │
│   └── utils/
│       ├── jwt.ts
│       ├── hash.ts             ← 密码加密
│       └── date.ts
│
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### 5.2 模块内部分层

每个功能模块严格遵循 **Route → Service → DB** 三层架构：

```
Request
   │
   ▼
[Route 层]          ← 路由定义、参数解析、Zod 验证、权限中间件
   │
   ▼
[Service 层]        ← 业务逻辑、跨模块协调、事务处理
   │
   ▼
[DB 层（Drizzle）]  ← SQL 查询，不包含业务逻辑
   │
   ▼
PostgreSQL
```

**规则：**
- Route 层不写业务逻辑
- Service 层不直接接触 HTTP 概念（req/res）
- 模块间通过 Service 调用，不直接操作其他模块的 DB

### 5.3 API 设计规范

**基础路径：** `/api/v1`

**统一响应格式：**

```typescript
// 成功
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20 }  // 分页时
}

// 失败
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "事件不存在"
  }
}
```

**主要 API 端点：**

```
认证
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/register        （需站点开放注册或邀请码）

用户
  GET    /api/v1/users/me
  PATCH  /api/v1/users/me
  GET    /api/v1/users                （管理员）
  PATCH  /api/v1/users/:id/role       （管理员）
  DELETE /api/v1/users/:id            （管理员）
  POST   /api/v1/users/invite         （管理员）

CP
  GET    /api/v1/cps                  （列表+搜索+分页）
  POST   /api/v1/cps
  GET    /api/v1/cps/:id
  PATCH  /api/v1/cps/:id
  DELETE /api/v1/cps/:id

人物
  GET    /api/v1/cps/:cpId/characters
  POST   /api/v1/cps/:cpId/characters
  PATCH  /api/v1/cps/:cpId/characters/:id
  DELETE /api/v1/cps/:cpId/characters/:id

事件
  GET    /api/v1/cps/:cpId/events     （支持筛选/分页）
  POST   /api/v1/cps/:cpId/events
  GET    /api/v1/cps/:cpId/events/:id
  PATCH  /api/v1/cps/:cpId/events/:id
  DELETE /api/v1/cps/:cpId/events/:id
  GET    /api/v1/cps/:cpId/events/:id/versions  （版本历史）
  POST   /api/v1/cps/:cpId/events/:id/restore   （恢复版本）

大事记
  GET    /api/v1/cps/:cpId/milestones
  POST   /api/v1/cps/:cpId/milestones
  PATCH  /api/v1/cps/:cpId/milestones/:id
  DELETE /api/v1/cps/:cpId/milestones/:id

标签
  GET    /api/v1/tags
  POST   /api/v1/tags
  PATCH  /api/v1/tags/:id
  DELETE /api/v1/tags/:id

媒体文件
  POST   /api/v1/media/upload
  DELETE /api/v1/media/:id

站点设置
  GET    /api/v1/settings
  PATCH  /api/v1/settings

自定义 Tab
  GET    /api/v1/cps/:cpId/tabs
  POST   /api/v1/cps/:cpId/tabs
  PATCH  /api/v1/cps/:cpId/tabs/:id
  DELETE /api/v1/cps/:cpId/tabs/:id

数据导入导出
  GET    /api/v1/export/full          （全站导出，管理员）
  GET    /api/v1/export/cp/:id        （单 CP 导出）
  POST   /api/v1/import               （数据导入，管理员）
```

---

## 六、数据库设计

### 6.1 核心数据表

```sql
-- 用户表
users
  id            UUID PRIMARY KEY
  username      VARCHAR(50) UNIQUE NOT NULL
  email         VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  role          ENUM('owner','admin','editor','contributor','viewer') NOT NULL
  avatar_url    VARCHAR(500)
  display_name  VARCHAR(100)
  preferences   JSONB DEFAULT '{}'     ← 个人偏好（编辑器模式/时间格式等）
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ

-- 邀请码表
invitations
  id            UUID PRIMARY KEY
  code          VARCHAR(64) UNIQUE NOT NULL
  role          ENUM(...)
  created_by    UUID REFERENCES users(id)
  used_by       UUID REFERENCES users(id)
  expires_at    TIMESTAMPTZ
  created_at    TIMESTAMPTZ

-- CP 表
cps
  id            UUID PRIMARY KEY
  name          VARCHAR(200) NOT NULL
  subtitle      VARCHAR(200)            ← "A × B"
  description   TEXT
  cover_url     VARCHAR(500)
  banner_url    VARCHAR(500)
  status        ENUM('active','archived','completed')
  visibility    ENUM('public','members','private') DEFAULT 'private'
  theme_config  JSONB DEFAULT '{}'      ← CP 级主题配置
  custom_fields JSONB DEFAULT '[]'      ← 扩展字段模板定义
  sort_order    INTEGER DEFAULT 0
  created_by    UUID REFERENCES users(id)
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ

-- CP 标签关联
cp_tags
  cp_id         UUID REFERENCES cps(id) ON DELETE CASCADE
  tag_id        UUID REFERENCES tags(id) ON DELETE CASCADE
  PRIMARY KEY (cp_id, tag_id)

-- CP 自定义 Tab
cp_tabs
  id            UUID PRIMARY KEY
  cp_id         UUID REFERENCES cps(id) ON DELETE CASCADE
  name          VARCHAR(100) NOT NULL
  tab_type      ENUM('profile','timeline','milestone','custom') NOT NULL
  content       JSONB DEFAULT '{}'      ← 自定义 Tab 的内容（富文本/布局）
  sort_order    INTEGER DEFAULT 0
  is_visible    BOOLEAN DEFAULT true
  created_at    TIMESTAMPTZ

-- 人物表
characters
  id            UUID PRIMARY KEY
  cp_id         UUID REFERENCES cps(id) ON DELETE CASCADE
  name          VARCHAR(100) NOT NULL
  aliases       JSONB DEFAULT '[]'      ← 别名数组
  avatar_url    VARCHAR(500)
  role_label    VARCHAR(50)             ← 主角/配角等
  birthday      DATE
  bio           TEXT
  custom_fields JSONB DEFAULT '{}'      ← 用户自定义字段键值对
  sort_order    INTEGER DEFAULT 0
  created_at    TIMESTAMPTZ

-- 事件表
events
  id            UUID PRIMARY KEY
  cp_id         UUID REFERENCES cps(id) ON DELETE CASCADE
  title         VARCHAR(500) NOT NULL
  summary       TEXT                    ← 简短描述
  content       JSONB DEFAULT '{}'      ← 富文本块内容（Block Editor JSON）
  event_date    DATE
  date_precision ENUM('year','month','day') DEFAULT 'day'  ← 模糊日期
  importance    ENUM('critical','high','medium','normal','low') DEFAULT 'normal'
  visibility    ENUM('public','members','specified','private') DEFAULT 'members'
  is_milestone  BOOLEAN DEFAULT false   ← 是否同步为里程碑
  source_ref    VARCHAR(500)            ← 来源出处
  emotion_icon  VARCHAR(50)             ← 情感倾向 emoji
  custom_fields JSONB DEFAULT '{}'      ← 扩展字段
  created_by    UUID REFERENCES users(id)
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ

-- 事件版本历史
event_versions
  id            UUID PRIMARY KEY
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE
  title         VARCHAR(500)
  content       JSONB
  summary       TEXT
  snapshot      JSONB NOT NULL          ← 完整快照（包含所有字段）
  edited_by     UUID REFERENCES users(id)
  created_at    TIMESTAMPTZ

-- 事件关联
event_relations
  id            UUID PRIMARY KEY
  source_id     UUID REFERENCES events(id) ON DELETE CASCADE
  target_id     UUID REFERENCES events(id) ON DELETE CASCADE
  relation_type VARCHAR(50) DEFAULT 'related'  ← 前因/后续/并行/相关
  created_at    TIMESTAMPTZ

-- 事件标签关联
event_tags
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE
  tag_id        UUID REFERENCES tags(id) ON DELETE CASCADE
  PRIMARY KEY (event_id, tag_id)

-- 事件媒体关联
event_media
  id            UUID PRIMARY KEY
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE
  media_id      UUID REFERENCES media(id)
  sort_order    INTEGER DEFAULT 0

-- 大事记表
milestones
  id            UUID PRIMARY KEY
  cp_id         UUID REFERENCES cps(id) ON DELETE CASCADE
  event_id      UUID REFERENCES events(id)  ← 可关联到事件，也可独立
  title         VARCHAR(500) NOT NULL
  description   TEXT
  milestone_date DATE
  icon          VARCHAR(50)             ← 图标标记
  sort_order    INTEGER DEFAULT 0
  created_at    TIMESTAMPTZ

-- 标签表
tags
  id            UUID PRIMARY KEY
  name          VARCHAR(100) NOT NULL
  color         VARCHAR(20) DEFAULT '#7B5EA7'
  category      VARCHAR(50)             ← 分类类型（genre/custom等）
  created_by    UUID REFERENCES users(id)
  created_at    TIMESTAMPTZ

-- 媒体文件表
media
  id            UUID PRIMARY KEY
  original_name VARCHAR(255)
  file_path     VARCHAR(500) NOT NULL
  thumb_path    VARCHAR(500)            ← 缩略图路径
  file_type     ENUM('image','video','file')
  mime_type     VARCHAR(100)
  file_size     BIGINT
  width         INTEGER
  height        INTEGER
  uploaded_by   UUID REFERENCES users(id)
  created_at    TIMESTAMPTZ

-- 操作日志表
operation_logs
  id            UUID PRIMARY KEY
  user_id       UUID REFERENCES users(id)
  action        VARCHAR(100) NOT NULL   ← 操作类型
  resource_type VARCHAR(50)             ← 资源类型（event/cp/user等）
  resource_id   UUID
  detail        JSONB DEFAULT '{}'      ← 操作详情
  ip            INET
  created_at    TIMESTAMPTZ

-- 站点设置表
site_settings
  key           VARCHAR(100) PRIMARY KEY
  value         JSONB NOT NULL
  updated_by    UUID REFERENCES users(id)
  updated_at    TIMESTAMPTZ
```

### 6.2 关键索引

```sql
-- 时间轴查询优化
CREATE INDEX idx_events_cp_date ON events(cp_id, event_date DESC);
CREATE INDEX idx_events_cp_importance ON events(cp_id, importance);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- CP 列表查询优化
CREATE INDEX idx_cps_updated_at ON cps(updated_at DESC);
CREATE INDEX idx_cps_created_by ON cps(created_by);

-- 全文搜索索引（中文使用 pg_trgm）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_cps_name_trgm ON cps USING gin(name gin_trgm_ops);
CREATE INDEX idx_events_title_trgm ON events USING gin(title gin_trgm_ops);

-- 操作日志
CREATE INDEX idx_logs_created_at ON operation_logs(created_at DESC);
CREATE INDEX idx_logs_user_id ON operation_logs(user_id);
```

### 6.3 JSONB 字段约定

**events.content（Block Editor 内容）：**
```json
{
  "blocks": [
    { "type": "paragraph", "content": "文本内容..." },
    { "type": "image", "attrs": { "src": "/uploads/...", "alt": "" } },
    { "type": "quote", "content": "引用内容", "source": "来源" }
  ]
}
```

**characters.custom_fields（自定义字段）：**
```json
{
  "fields": [
    { "key": "height", "label": "身高", "type": "text", "value": "180cm" },
    { "key": "weapon", "label": "武器", "type": "text", "value": "天问" }
  ]
}
```

**cps.theme_config（CP 主题）：**
```json
{
  "colorPrimary": "#7B5EA7",
  "colorBackground": "#F7F6FA",
  "fontFamily": "default",
  "enabled": true
}
```

---

## 七、认证与授权架构

### 7.1 认证流程

```
登录请求
    │
    ▼
验证用户名/密码（bcrypt）
    │
    ▼
生成 Access Token（JWT，有效期 15min）
生成 Refresh Token（随机串，有效期 7天，存 Redis）
    │
    ▼
返回两个 Token 给客户端
    │
客户端：
  Access Token → 内存（不存 LocalStorage，防 XSS）
  Refresh Token → HttpOnly Cookie（防 XSS）

    │
    ▼ 每次 API 请求
Authorization: Bearer <access_token>
    │
    ▼ Token 过期时
自动调用 /auth/refresh → 用 Cookie 中的 Refresh Token 换新 Access Token
```

### 7.2 权限中间件

```typescript
// 用法示例：在 Route 层直接声明权限
app.patch('/api/v1/events/:id', 
  authMiddleware,                           // 验证登录
  permissionMiddleware('event:edit'),       // 验证基础权限
  cpScopeMiddleware,                        // 验证 CP 级权限范围
  eventController.update
)

// permissionMiddleware 逻辑：
// 1. 从 JWT 解析角色
// 2. 查权限矩阵判断是否有权
// 3. 若操作他人资源，额外检查是否有 others 权限
// 4. 无权则返回 403
```

---

## 八、文件存储架构

### 8.1 上传流程

```
客户端选择文件
    │
    ▼
POST /api/v1/media/upload（multipart/form-data）
    │
    ▼
Multer 中间件：
  - 文件类型白名单检查（image/jpeg, image/png, image/webp, image/gif）
  - 文件大小限制（图片 ≤ 10MB）
  - 保存原始文件到 /data/uploads/originals/{year}/{month}/{uuid}.ext
    │
    ▼
推送到 BullMQ 图片处理队列
    │
    ▼ 异步处理
Sharp 处理器：
  - 生成 800px 宽缩略图 → /data/uploads/thumbs/{uuid}_thumb.webp
  - 转换为 WebP 格式降低体积
  - 提取图片宽高信息
    │
    ▼
更新 media 表记录（thumb_path, width, height）
    │
    ▼
返回给客户端：{ id, url, thumbUrl }
```

### 8.2 文件路径规范

```
/data/uploads/
├── originals/
│   ├── 2026/05/
│   │   ├── {uuid}.jpg          ← 原始文件
│   │   └── {uuid}.png
├── thumbs/
│   └── 2026/05/
│       └── {uuid}_thumb.webp   ← 缩略图
└── avatars/
    └── {user_id}.webp          ← 用户头像（固定路径，覆盖更新）
```

### 8.3 Nginx 直接服务文件

```nginx
# 上传文件直接由 Nginx 服务，不经过后端
location /uploads/ {
    alias /data/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    # 防止直接列目录
    autoindex off;
}
```

---

## 九、部署架构

### 9.1 Docker Compose 完整配置

```yaml
# docker-compose.yml
version: '3.9'

services:
  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
      - /data/uploads:/data/uploads:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
    restart: always

  # 后端 API
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://cpuser:${DB_PASSWORD}@postgres:5432/cparchive
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - UPLOAD_DIR=/data/uploads
    volumes:
      - /data/uploads:/data/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: always
    expose:
      - "3000"

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=cparchive
      - POSTGRES_USER=cpuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - /data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cpuser -d cparchive"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    expose:
      - "5432"

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - /data/redis:/data
    command: redis-server --save 60 1 --loglevel warning
    restart: always
    expose:
      - "6379"

networks:
  default:
    name: cparchive_net
```

### 9.2 Nginx 配置

```nginx
# nginx/nginx.conf
events { worker_connections 1024; }

http {
    include mime.types;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        # 前端静态文件
        root /usr/share/nginx/html;
        index index.html;

        # SPA 路由（所有非 API 请求返回 index.html）
        location / {
            try_files $uri $uri/ /index.html;
            expires 1h;
        }

        # JS/CSS 资源强缓存（Vite 生成 hash 文件名）
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API 反向代理
        location /api/ {
            proxy_pass http://api:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            # 文件上传大小限制
            client_max_body_size 15M;
        }

        # 上传文件直接服务
        location /uploads/ {
            alias /data/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";
            autoindex off;
        }
    }
}
```

### 9.3 环境变量管理

```bash
# .env（不提交 Git，仅在服务器上维护）
DB_PASSWORD=your_strong_database_password
JWT_SECRET=your_64_char_random_secret
JWT_REFRESH_SECRET=your_64_char_random_refresh_secret
NODE_ENV=production
DOMAIN=yourdomain.com
```

### 9.4 CI/CD 流程（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 构建前端
      - name: Build Frontend
        run: |
          cd frontend
          npm ci
          npm run build

      # 构建后端
      - name: Build Backend
        run: |
          cd backend
          npm ci
          npm run build

      # 通过 SSH 部署到云服务器
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app/cparchive
            git pull origin main
            
            # 同步前端构建产物
            rsync -av --delete frontend/dist/ /app/frontend/dist/
            
            # 重新构建并启动后端容器
            docker compose pull
            docker compose up -d --build api
            
            # 执行数据库迁移
            docker compose exec api npm run db:migrate
            
            echo "Deploy complete!"
```

---

## 十、数据备份方案

### 10.1 自动备份脚本

```bash
# /app/scripts/backup.sh（每日 cron 执行）
#!/bin/bash
BACKUP_DIR=/data/backups
DATE=$(date +%Y%m%d_%H%M%S)
RETAIN_DAYS=30

# 数据库备份
docker compose exec postgres pg_dump -U cpuser cparchive | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 上传文件打包（仅备份元数据变化的增量，使用 rsync）
rsync -av /data/uploads/ $BACKUP_DIR/uploads_latest/

# 删除 30 天前的备份
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +$RETAIN_DAYS -delete

echo "Backup done: $DATE"
```

```bash
# crontab -e（每天凌晨 3 点执行）
0 3 * * * /app/scripts/backup.sh >> /var/log/cparchive_backup.log 2>&1
```

### 10.2 备份目录结构

```
/data/backups/
├── db_20260514_030000.sql.gz   ← 数据库全量备份
├── db_20260515_030000.sql.gz
└── uploads_latest/             ← 上传文件镜像（rsync 增量同步）
    └── ...
```

---

## 十一、可扩展性设计

### 11.1 模块扩展点

| 扩展场景 | 扩展方式 | 影响范围 |
|----------|----------|----------|
| 新增 Tab 类型 | 在 `cp_tabs.tab_type` 增加枚举值，前端新增对应 View | 仅前端新增组件 |
| 新增事件字段 | `events.custom_fields` JSONB 直接扩展，无需数据库迁移 | 零影响 |
| 新增重要性等级 | 修改枚举 + 前端颜色配置 | 仅配置文件 |
| 新增 OAuth 登录 | `auth` 模块新增 Provider，不影响现有密码登录 | 仅 auth 模块 |
| 新增通知系统 | 新增 `notifications` 模块，通过事件总线接收其他模块事件 | 零影响已有模块 |
| 新增搜索服务 | 将搜索逻辑切换为 MeiliSearch，保持 API 接口不变 | 仅 service 层替换 |
| 引入 CDN | 修改 `media.file_path` 存 CDN URL，其余不变 | 仅 media 模块 |
| 水平扩展后端 | Session 已存 Redis，API 无状态，可直接加节点 + Nginx 负载均衡 | 无需代码修改 |

### 11.2 插件/自定义 Tab 扩展协议

自定义 Tab 的内容存储在 `cp_tabs.content` JSONB 中，约定协议：

```json
{
  "type": "custom",
  "renderer": "richtext",          // richtext | gallery | links | raw_html（受权限控制）
  "data": { ... }                  // 对应 renderer 的数据结构
}
```

前端通过 `renderer` 字段动态加载对应渲染组件，新增 renderer 类型无需修改核心代码。

---

## 十二、监控与运维

### 12.1 日志策略

```
后端请求日志：Pino → /var/log/cparchive/api.log（JSON 格式，按天切割）
Nginx 访问日志：/var/log/nginx/access.log
Docker 容器日志：docker compose logs（可接入 Loki + Grafana，后续扩展）
操作审计日志：写入数据库 operation_logs 表（可查询追溯）
```

### 12.2 健康检查

```
GET /api/v1/health
→ 200 { status: "ok", db: "ok", redis: "ok", version: "1.0.0" }

Docker Compose healthcheck 依赖此接口
```

### 12.3 常用运维命令

```bash
# 查看所有容器状态
docker compose ps

# 查看 API 日志（实时）
docker compose logs -f api

# 手动触发数据库迁移
docker compose exec api npm run db:migrate

# 手动备份
bash /app/scripts/backup.sh

# 重启单个服务
docker compose restart api

# 完全重新部署
docker compose down && docker compose up -d --build

# 进入数据库
docker compose exec postgres psql -U cpuser cparchive
```

---

## 十三、项目初始化步骤

以下是从零到运行的完整步骤：

```
1. 云服务器准备
   └─ 安装 Docker + Docker Compose
   └─ 配置防火墙（开放 80/443/22）
   └─ 申请域名并解析到服务器 IP

2. SSL 证书
   └─ certbot certonly --standalone -d yourdomain.com

3. 克隆项目
   └─ git clone ... /app/cparchive

4. 配置环境变量
   └─ cp .env.example .env && vim .env

5. 初始化数据目录
   └─ mkdir -p /data/{postgres,redis,uploads,backups}

6. 首次启动
   └─ docker compose up -d
   └─ docker compose exec api npm run db:migrate
   └─ docker compose exec api npm run db:seed    ← 创建初始 Owner 账号

7. 设置 cron 备份
   └─ crontab -e → 添加备份脚本

8. 配置 GitHub Secrets（CI/CD）
   └─ SERVER_HOST / SERVER_USER / SSH_PRIVATE_KEY
```

---

## 附录：技术栈版本清单

| 技术 | 版本 |
|------|------|
| Node.js | 20 LTS |
| Vue | 3.4+ |
| Vite | 5.x |
| Hono | 4.x |
| Drizzle ORM | 0.30+ |
| PostgreSQL | 16 |
| Redis | 7 |
| Nginx | 1.25+ |
| Docker | 25+ |
| TypeScript | 5.x |
| Tiptap | 2.x |
| Sharp | 0.33+ |
| BullMQ | 5.x |
| Pino | 9.x |
| Zod | 3.x |
