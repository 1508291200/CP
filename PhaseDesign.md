# CP 档案站 · 分阶段系统功能设计文档

**版本：** v1.0  
**作者：** xuxinyi06  
**日期：** 2026-05-14  
**依赖文档：** Architecture.md / UIDesign.md / CPDesign.md

---

## 阶段划分总览

| 阶段 | 名称 | 交付物 | 核心目标 |
|------|------|--------|----------|
| Phase 0 | 工程基础 | 可运行的空项目骨架 | 搭建前后端工程，打通开发→部署全链路 |
| Phase 1 | 核心数据层 | 数据库 + API 骨架 | 建表、迁移、CRUD 基础接口，无 UI |
| Phase 2 | 认证与权限 | 登录/注册 + 权限中间件 | 用户体系完整可用，是后续一切的前提 |
| Phase 3 | CP 管理 | 首页 + CP 详情框架 | 最小可用产品（MVP）主流程跑通 |
| Phase 4 | 事件记录 | 时间轴 + 事件 CRUD | 核心内容功能，产品价值核心 |
| Phase 5 | 人物简介 & 大事记 | Profile Tab + Milestone Tab | 补全详情页三 Tab |
| Phase 6 | 媒体与编辑器 | 图片上传 + 富文本编辑 | 内容丰富度升级 |
| Phase 7 | 主题与定制 | 主题系统 + CP 级主题 | 个性化体验 |
| Phase 8 | 成员管理 | 多账号 + 权限管理界面 | 协作能力 |
| Phase 9 | 数据管理 | 导入/导出 + 备份 | 数据自主权 |
| Phase 10 | 扩展功能 | 自定义 Tab + 版本历史 | 高级功能 |

**原则：每个阶段独立可交付，不依赖后续阶段，阶段内模块按功能切分，互不耦合。**

---

## Phase 0 · 工程基础

### 目标
搭建前后端工程脚手架，打通「本地开发 → CI/CD → 云服务器部署」全链路，后续所有阶段在此基础上叠加。

### 0.1 后端工程初始化

**任务列表：**

- [ ] 创建 `backend/` 目录，初始化 Node.js + TypeScript 项目
- [ ] 安装核心依赖：Hono、Drizzle ORM、Zod、Pino、dotenv
- [ ] 配置 `tsconfig.json`（严格模式，路径别名 `@/*`）
- [ ] 配置 `drizzle.config.ts`（指向本地 PostgreSQL）
- [ ] 实现 `src/index.ts`：启动 Hono 应用，注册健康检查路由
- [ ] 实现 `GET /api/v1/health` → 返回 `{ status: "ok", version: "0.1.0" }`
- [ ] 配置 `src/config/index.ts`：读取环境变量，统一导出，未配置时给出明确报错
- [ ] 配置 Pino 日志：请求日志中间件，JSON 格式输出
- [ ] 实现统一错误处理中间件（`src/middlewares/error.middleware.ts`）
- [ ] 实现统一响应格式工具（`src/shared/response.ts`）
- [ ] 编写 `Dockerfile`（多阶段构建，生产镜像最小化）
- [ ] 编写 `package.json` scripts：`dev` / `build` / `start` / `db:generate` / `db:migrate`

**验收标准：**
```
curl http://localhost:3000/api/v1/health
→ {"success":true,"data":{"status":"ok","version":"0.1.0"}}
```

---

### 0.2 前端工程初始化

**任务列表：**

- [ ] 创建 `frontend/` 目录，使用 Vite + Vue 3 + TypeScript 模板
- [ ] 安装核心依赖：Vue Router 4、Pinia、Axios、Tailwind CSS
- [ ] 配置 Tailwind CSS，导入 `src/styles/globals.css`
- [ ] 配置 `src/styles/variables.css`：定义全部 CSS 变量（参考 UIDesign.md 色值速查）
- [ ] 配置 Vite 路径别名 `@/*` → `src/*`
- [ ] 配置 Vite 开发代理：`/api` → `http://localhost:3000`
- [ ] 搭建 `src/api/client.ts`：Axios 实例，预留请求/响应拦截器插槽
- [ ] 搭建 `src/router/index.ts`：空路由表 + 导航守卫骨架
- [ ] 搭建 `src/stores/` 目录：创建空的 auth/ui store
- [ ] 创建 `App.vue`：挂载 `<RouterView />`，应用 CSS 变量
- [ ] 创建占位首页 `HomeView.vue`（纯文字，无逻辑）

**验收标准：**
```
npm run dev → 浏览器打开首页，显示占位文字
npm run build → 构建产物无错误
```

---

### 0.3 部署基础设施

**任务列表：**

- [ ] 编写 `docker-compose.yml`（含 nginx/api/postgres/redis 四个服务）
- [ ] 编写 `nginx/nginx.conf`（HTTP→HTTPS 重定向 + API 代理 + 静态文件）
- [ ] 创建 `.env.example`（列出所有必填环境变量，含注释说明）
- [ ] 创建 `/app/scripts/backup.sh`（数据库备份脚本）
- [ ] 编写 `.github/workflows/deploy.yml`（GitHub Actions CI/CD）
- [ ] 云服务器：安装 Docker，配置防火墙，申请 SSL 证书
- [ ] 首次手动部署，验证 HTTPS 访问正常
- [ ] 配置 cron：每天凌晨 3 点执行备份脚本

**验收标准：**
```
https://yourdomain.com → 前端占位页正常显示
https://yourdomain.com/api/v1/health → 健康检查通过
git push main → GitHub Actions 自动部署成功
```

---

### 0.4 阶段间约定（Phase 0 产出物）

Phase 0 结束后，以下约定固定下来，后续阶段严格遵守：

| 约定项 | 内容 |
|--------|------|
| API 基础路径 | `/api/v1/` |
| 响应格式 | `{ success, data, error?, meta? }` |
| 错误码格式 | `SCREAMING_SNAKE_CASE`（如 `USER_NOT_FOUND`） |
| 日志格式 | Pino JSON，含 `requestId`、`userId`、`method`、`path`、`duration` |
| 环境变量 | 统一在 `src/config/index.ts` 读取，不在模块内直接 `process.env` |
| 前端 API 调用 | 全部通过 `src/api/` 目录下的函数，不在组件内直接调用 Axios |
| CSS 变量 | 主题相关颜色/字体全部使用 `var(--color-*)` 引用，不硬编码 |

---

## Phase 1 · 核心数据层

### 目标
建立所有核心数据表和迁移文件，实现基础 CRUD API（无鉴权，本阶段专注数据层正确性）。

### 1.1 数据库 Schema 定义

**任务列表（按依赖顺序执行）：**

- [ ] `schema/users.ts`：users 表 + invitations 表
- [ ] `schema/tags.ts`：tags 表
- [ ] `schema/cp.ts`：cps 表 + cp_tags 表 + cp_tabs 表
- [ ] `schema/characters.ts`：characters 表
- [ ] `schema/events.ts`：events 表 + event_versions 表 + event_relations 表 + event_tags 表
- [ ] `schema/milestones.ts`：milestones 表
- [ ] `schema/media.ts`：media 表 + event_media 表
- [ ] `schema/logs.ts`：operation_logs 表 + site_settings 表
- [ ] `schema/index.ts`：统一导出所有 schema
- [ ] 执行 `npm run db:generate` 生成迁移文件
- [ ] 执行 `npm run db:migrate` 验证迁移成功
- [ ] 编写 `db/seed.ts`：插入初始 Owner 账号 + 默认站点设置

**验收标准：**
```
npm run db:migrate → 无报错，所有表创建成功
npm run db:seed → 初始数据插入成功
psql 查询各表结构正确
```

---

### 1.2 基础 CRUD API（无鉴权）

> 注意：本阶段 API 无鉴权，仅用于开发测试。Phase 2 完成后统一加鉴权中间件。

**CP 模块 `modules/cp/`：**

- [ ] `cp.schema.ts`：定义 Zod 验证 Schema（CreateCpInput / UpdateCpInput / CpQueryInput）
- [ ] `cp.service.ts`：实现 `listCps(query)` / `getCpById(id)` / `createCp(data)` / `updateCp(id, data)` / `deleteCp(id)`
- [ ] `cp.routes.ts`：注册路由，调用 Service，返回统一格式
  ```
  GET    /api/v1/cps         listCps（支持 q/tag/status/page/limit 查询参数）
  POST   /api/v1/cps         createCp
  GET    /api/v1/cps/:id     getCpById
  PATCH  /api/v1/cps/:id     updateCp
  DELETE /api/v1/cps/:id     deleteCp
  ```

**事件模块 `modules/event/`：**

- [ ] `event.schema.ts`：Zod Schema（CreateEventInput / UpdateEventInput / EventQueryInput）
  - 注意：`event_date` 支持 null（日期未知），`date_precision` 枚举
  - `content` 字段 Zod 类型为 `z.record(z.unknown())`（Block Editor JSON 不强约束）
- [ ] `event.service.ts`：实现 `listEvents(cpId, query)` / `getEventById(id)` / `createEvent(data)` / `updateEvent(id, data)` / `deleteEvent(id)`
- [ ] `event.routes.ts`：注册路由
  ```
  GET    /api/v1/cps/:cpId/events
  POST   /api/v1/cps/:cpId/events
  GET    /api/v1/cps/:cpId/events/:id
  PATCH  /api/v1/cps/:cpId/events/:id
  DELETE /api/v1/cps/:cpId/events/:id
  ```

**标签模块 `modules/tag/`：**

- [ ] `tag.service.ts`：`listTags()` / `createTag(data)` / `updateTag(id, data)` / `deleteTag(id)`
- [ ] `tag.routes.ts`：注册路由 `GET/POST/PATCH/DELETE /api/v1/tags`

**人物模块 `modules/character/`：**

- [ ] `character.service.ts` + `character.routes.ts`
  ```
  GET    /api/v1/cps/:cpId/characters
  POST   /api/v1/cps/:cpId/characters
  PATCH  /api/v1/cps/:cpId/characters/:id
  DELETE /api/v1/cps/:cpId/characters/:id
  ```

**大事记模块 `modules/milestone/`：**

- [ ] `milestone.service.ts` + `milestone.routes.ts`
  ```
  GET    /api/v1/cps/:cpId/milestones
  POST   /api/v1/cps/:cpId/milestones
  PATCH  /api/v1/cps/:cpId/milestones/:id
  DELETE /api/v1/cps/:cpId/milestones/:id
  ```

**验收标准（使用 curl / Postman 验证）：**
```
POST /api/v1/cps → 201，返回新建 CP 数据
GET  /api/v1/cps → 200，返回列表（含分页 meta）
POST /api/v1/cps/:cpId/events → 201，事件写入数据库
GET  /api/v1/cps/:cpId/events?importance=critical → 正确筛选
```

---

## Phase 2 · 认证与权限

### 目标
实现完整的用户认证体系（注册/登录/刷新 Token）和权限中间件，为所有后续 API 加上鉴权。

### 2.1 后端认证模块

**任务列表：**

- [ ] 安装依赖：`jose`（JWT）、`bcrypt`（密码哈希）
- [ ] `utils/jwt.ts`：`signAccessToken(payload)` / `signRefreshToken(userId)` / `verifyToken(token)`
  - Access Token 有效期：15 分钟
  - Refresh Token 有效期：7 天，存入 Redis（key: `refresh:{userId}`）
- [ ] `utils/hash.ts`：`hashPassword(plain)` / `verifyPassword(plain, hash)`
- [ ] `modules/auth/auth.schema.ts`：LoginInput / RegisterInput
- [ ] `modules/auth/auth.service.ts`：
  - `login(username, password)` → 验证密码，签发双 Token
  - `refresh(refreshToken)` → 校验 Redis 中的 Refresh Token，签发新 Access Token
  - `logout(userId)` → 从 Redis 删除 Refresh Token
  - `register(inviteCode, data)` → 验证邀请码，创建用户
- [ ] `modules/auth/auth.routes.ts`：
  ```
  POST /api/v1/auth/login
  POST /api/v1/auth/refresh
  POST /api/v1/auth/logout
  POST /api/v1/auth/register
  ```
  - Refresh Token 通过 `Set-Cookie: HttpOnly; Secure; SameSite=Strict` 下发
  - Access Token 在 JSON body 中返回

**验收标准：**
```
POST /auth/login → 返回 access_token + Set-Cookie(refresh_token)
POST /auth/refresh（携带 Cookie）→ 返回新 access_token
POST /auth/logout → Redis 中 refresh token 删除
```

---

### 2.2 权限中间件

**任务列表：**

- [ ] `middlewares/auth.middleware.ts`：
  - 从 `Authorization: Bearer <token>` 提取 token
  - 验证 token 签名和有效期
  - 将解析出的 `{ userId, role }` 写入 Hono Context（`c.set('user', ...)`）
  - 无 token 或无效 → 401
- [ ] `middlewares/permission.middleware.ts`：
  - 接收 `action` 参数（如 `'event:edit:others'`）
  - 从 Context 读取 user.role
  - 查权限矩阵（定义在 `shared/constants.ts`），无权 → 403
- [ ] `shared/constants.ts`：定义权限矩阵 `ROLE_PERMISSIONS`
  ```typescript
  export const ROLE_PERMISSIONS: Record<string, Role[]> = {
    'cp:create':            ['owner','admin','editor'],
    'event:create':         ['owner','admin','editor','contributor'],
    'event:edit:own':       ['owner','admin','editor','contributor'],
    'event:edit:others':    ['owner','admin','editor'],
    'event:delete:own':     ['owner','admin','editor','contributor'],
    'event:delete:others':  ['owner','admin'],
    'member:manage':        ['owner','admin'],
    'settings:site':        ['owner'],
    // ...
  }
  ```
- [ ] **为 Phase 1 所有路由补加权限中间件：**
  - CP 路由：创建/修改/删除需 `editor`+；列表/详情根据 CP visibility 判断
  - 事件路由：创建需 `contributor`+；编辑他人需 `editor`+；删除他人需 `admin`+
  - 标签路由：增删改需 `editor`+

**验收标准：**
```
无 token 访问 POST /api/v1/cps → 401
viewer 角色 token 访问 POST /api/v1/cps → 403
editor 角色 token 访问 POST /api/v1/cps → 201 成功
```

---

### 2.3 前端认证模块

**任务列表：**

- [ ] `src/api/auth.ts`：封装 `login(data)` / `refresh()` / `logout()` / `register(data)`
- [ ] `src/stores/auth.ts`：
  - 状态：`user`（含 role）、`accessToken`、`isLoggedIn`
  - Actions：`login()` → 调 API，存 token 到内存；`logout()`；`refreshToken()`
  - 持久化：`user` 存 localStorage（仅非敏感信息），`accessToken` 仅存内存
- [ ] `src/api/client.ts` 完善拦截器：
  - 请求拦截：自动注入 `Authorization: Bearer <accessToken>`
  - 响应拦截：401 时自动调 `refresh()`，成功后重放原请求；若 refresh 也失败则跳登录页
- [ ] `src/router/index.ts` 守卫：
  - 需要登录的路由：检查 `authStore.isLoggedIn`，否则跳 `/login`
  - 需要权限的路由：检查 `authStore.user.role`
- [ ] `src/views/auth/LoginView.vue`：
  - 登录表单（用户名 + 密码）
  - 表单验证：非空校验
  - 错误提示：行内显示（凭据错误/账号不存在）
  - 成功后跳转首页
- [ ] `src/composables/usePermission.ts`：封装 `can(action)` 函数，组件中用于控制 UI 显示

**验收标准：**
```
未登录访问首页 → 跳转登录页
登录成功 → 跳转首页，导航栏显示用户名
Token 过期 → 自动 refresh，用户无感知
viewer 账号 → 添加按钮不可见
```

---

## Phase 3 · CP 管理（MVP 主流程）

### 目标
实现首页 CP 列表/搜索、创建 CP 弹窗、CP 详情页框架（Tab 切换），跑通完整主流程。

### 3.1 前端首页

**任务列表：**

- [ ] `src/api/cp.ts`：封装 `listCps(params)` / `getCpById(id)` / `createCp(data)` / `updateCp(id, data)` / `deleteCp(id)`
- [ ] `src/stores/cp.ts`：`cpList`、`currentCp`、`loading`、`searchQuery`
- [ ] `src/components/base/` 原子组件（此阶段需要的）：
  - `Button.vue`：支持 `variant` prop（primary/secondary/ghost）、`size`（sm/md/lg）、`loading` 状态
  - `Input.vue`：支持 `placeholder`、`v-model`、`error` 状态
  - `Tag.vue`：支持 `color`、`label`、可关闭
  - `Badge.vue`：小徽章，支持自定义颜色
  - `Modal.vue`：弹窗容器，支持 `v-model:visible`、`title`、slot
  - `Toast.vue` + `useToast composable`：全局 Toast，支持 success/error/info
- [ ] `src/components/cp/CpCard.vue`：
  - Props：cp 对象
  - 封面图（4:3，圆角 12px）、CP 名称、副标题（A × B）、标签组、更新时间
  - 悬停：`translateY(-4px)` + 阴影加深，动效 200ms
  - 点击：跳转 `/cp/:id/timeline`
- [ ] `src/components/cp/CpTagCloud.vue`：
  - 标签筛选条，「全部」选中态为主色紫胶囊
  - 支持多标签或单标签选中模式（prop 控制）
  - 超出折叠为「展开 ∨」
- [ ] `src/views/HomeView.vue`：
  - Hero 区：Slogan + 副标题 + 搜索框（实时搜索，防抖 300ms）
  - 标签云筛选区
  - CP 卡片网格（三列，响应式）
  - 底部「加载更多」按钮（追加加载，非翻页）
  - 右上角：用户头像 + 我的收藏 + 深色模式切换
  - 空状态：插图 + "还没有 CP，[创建第一对]" 文字
- [ ] `src/components/cp/CreateCpModal.vue`：
  - 表单字段：名称（必填）、副标题（A × B）、描述、标签多选
  - 封面图上传（Phase 6 前使用 URL 输入代替）
  - 表单验证 + 提交 Loading 状态

**验收标准：**
```
首页展示 CP 列表，三列网格，卡片样式符合 UIDesign.md
搜索框输入关键词 → 300ms 后自动过滤列表
点击分类标签 → 列表筛选
点击「创建 CP」→ 弹窗，填表提交 → 列表更新
```

---

### 3.2 CP 详情页框架

**任务列表：**

- [ ] `src/components/layout/DetailNav.vue`：
  - 左侧：← 返回按钮 + CP 名称 + 心形图标
  - 中部：Tab 导航（人物简介/时间轴/大事记），选中态紫色下划线
  - 右侧：主按钮（根据当前 Tab 变化） + `...` 更多菜单
  - 固定顶部，滚动时轻阴影出现
- [ ] `src/components/cp/CpBanner.vue`：
  - Banner 横幅区域
  - 双人头像 × 展示 + CP 主标题 + 副标题 + 标签
  - 支持自定义背景图/渐变色（读取 `cp.theme_config`）
- [ ] `src/views/cp/CpDetailView.vue`：
  - 挂载 `DetailNav` + `CpBanner`
  - 根据路由 path 渲染对应 Tab（懒加载）
  - 提供 `currentCp` 给子 Tab 组件（通过 provide/inject）
- [ ] 路由配置：
  ```
  /cp/:id → redirect /cp/:id/timeline
  /cp/:id/profile    → ProfileTab（懒加载）
  /cp/:id/timeline   → TimelineTab（懒加载）
  /cp/:id/milestones → MilestoneTab（懒加载）
  ```
- [ ] 三个 Tab 的占位组件（显示 "功能开发中" 即可，占位用）

**验收标准：**
```
点击首页 CP 卡片 → 跳转详情页
DetailNav 显示 CP 名称，Tab 切换路由变化
CpBanner 展示封面和基本信息
F5 刷新详情页 → 保持当前 Tab
```

---

## Phase 4 · 事件记录（时间轴）

### 目标
实现完整的时间轴页面：事件列表展示、快速录入、完整编辑器（富文本暂用 textarea 占位）、事件筛选。

### 4.1 后端事件增强

**任务列表：**

- [ ] `event.service.ts` 增强 `listEvents`：
  - 支持按 `importance`、`date_start`/`date_end`、`tag_id`、`keyword` 筛选
  - 支持按 `event_date` 排序（asc/desc）
  - 分页：默认 `limit=50`，游标分页（基于 `event_date + id`，比 offset 性能好）
- [ ] `event.routes.ts` 新增：
  - `POST /cps/:cpId/events/:id/milestone`：将事件标记为里程碑（同步写 milestones 表）
  - `DELETE /cps/:cpId/events/:id/milestone`：取消里程碑标记

**验收标准：**
```
GET /cps/:cpId/events?importance=critical&keyword=初遇 → 正确筛选
GET /cps/:cpId/events?order=asc → 按时间正序返回
```

---

### 4.2 前端时间轴

**任务列表：**

- [ ] `src/api/event.ts`：封装所有事件相关 API 调用
- [ ] `src/stores/event.ts`：`events`、`filters`、`loading`、`selectedEvent`
- [ ] `src/composables/useEvent.ts`：封装加载/创建/更新/删除事件逻辑
- [ ] `src/components/timeline/ImportanceTag.vue`：
  - 根据 `importance` 值渲染对应颜色徽章
  - 五级颜色严格按 UIDesign.md 色彩规范
- [ ] `src/components/timeline/EventRow.vue`：
  - 布局：重要性标签 + 标题 + 元信息（章节/日期） + 缩略图（可选） + 展开箭头
  - 悬停背景色 `#F9F9FC`
  - 点击展开 → `EventDetail` 内联展开（非跳转）
  - 支持 `compact` prop（密度视图）
- [ ] `src/components/timeline/TimelineSegment.vue`：
  - 时间段标题（颜色与轴线色一致）
  - 包含该段内所有 EventRow
  - 底部「展开更多 (n) ∨」折叠逻辑（默认显示 4 条，超出折叠）
- [ ] `src/components/timeline/Timeline.vue`：
  - 垂直轴线（2px，颜色按时间段变化）
  - 渲染所有 TimelineSegment
  - 空状态：插图 + "还没有事件记录，[添加第一个事件]"
- [ ] `src/components/timeline/EventDetail.vue`：
  - 展开后显示：日期、重要性标签、正文内容（Phase 6 前为纯文本）、来源出处、标签
  - 编辑/删除按钮（受权限控制，用 `can()` 判断）
  - 「标记为里程碑」切换按钮
- [ ] `src/components/timeline/QuickInput.vue`（行内快速录入条）：
  - 日期选择器 + 标题输入 + 标签选择 + 保存/展开按钮
  - `Enter` 快速保存，`Esc` 关闭
  - 保存后显示「继续添加」
- [ ] `src/components/timeline/EventFormModal.vue`（完整编辑器，本阶段 textarea 占位）：
  - 表单字段：标题、日期（支持仅年/年月/完整日期切换）、重要性等级、内容（textarea）、来源出处、标签多选、可见范围
  - 草稿自动保存（每 10s 存 localStorage，key: `draft:{cpId}`）
  - 提交 Loading 状态
- [ ] 筛选面板（工具栏内联）：
  - 重要性多选、日期范围、关键词搜索
  - 筛选条件 badge 显示（已激活的筛选项可单个关闭）
- [ ] 视图切换（工具栏图标按钮）：
  - 默认竖轴 / 密度视图（仅本阶段实现这两种）
- [ ] `src/views/cp/TimelineTab.vue`：
  - 左侧重要事件侧边栏（`important=true` 的前 N 条）
  - 右侧主区域：工具栏 + Timeline 组件
  - 响应式：`< 768px` 侧边栏折叠为顶部折叠区

**验收标准：**
```
时间轴页显示事件列表，按时间分段，轴线变色
点击事件 → 内联展开详情
快速录入条：填写标题+日期，Enter 保存，事件立即出现
完整编辑器：弹窗表单，提交后时间轴更新
筛选：按重要性筛选正确
右键事件 → 上下文菜单（编辑/删除）
```

---

## Phase 5 · 人物简介 & 大事记

### 目标
完成 CP 详情页的另外两个 Tab，三 Tab 全部可用。

### 5.1 人物简介 Tab

**任务列表：**

- [ ] `src/api/character.ts`：封装人物相关 API
- [ ] `src/components/profile/CharacterCard.vue`：
  - 圆形头像（80px）+ 姓名 + 角色标签
  - 字段列表：生日/身份/性格/简介（固定字段）
  - 「更多详情」折叠区：展示 `custom_fields`（key-value 列表）
  - 编辑按钮（权限控制）
- [ ] `src/components/profile/CharacterFormModal.vue`：
  - 编辑/新建人物表单
  - 固定字段 + 自定义字段组
  - 自定义字段：可新增/删除/排序行（标签名 + 值）
- [ ] `src/components/profile/RelationOverview.vue`：
  - 关系概述文本（富文本本阶段用 textarea）
  - CP 标签展示（来自 `cp.tags`）
  - 关系开始日期 + 关系状态
- [ ] `src/views/cp/ProfileTab.vue`：
  - 两人卡片并排（响应式：移动端堆叠）
  - 右侧关系概述区
  - 底部：相关图片区（Phase 6 前空占位）

**验收标准：**
```
人物简介 Tab 显示两位人物卡片
点击编辑 → 弹窗，修改后实时更新
自定义字段可增删
关系概述可编辑保存
```

---

### 5.2 大事记 Tab

**任务列表：**

- [ ] `src/api/milestone.ts`：封装大事记 API
- [ ] `src/components/milestone/MilestoneCard.vue`：
  - 竖向卡片（约 180×240px）：年代标注 + 事件标题 + 描述 + 封面图
  - 点击跳转时间轴对应事件（通过 `event_id` 关联）
  - 编辑/删除按钮（权限控制）
- [ ] `src/components/milestone/YearFilter.vue`：
  - 年份段筛选 Tab（全部 / 各年份段）
  - 动态生成：根据里程碑实际年份段生成选项
- [ ] `src/components/milestone/MilestoneFormModal.vue`：
  - 新建/编辑里程碑表单
  - 支持从已有事件选择关联（下拉搜索事件）
  - 图标选择（预设 emoji 图标集）
- [ ] `src/views/cp/MilestoneTab.vue`：
  - 顶部年份筛选 + 「+ 添加里程碑」按钮
  - 横向滚动卡片列表（CSS scroll-snap）
  - 底部统计面板（总事件数/里程碑数/跨越时间）

**验收标准：**
```
大事记 Tab 显示横向卡片列表
年份筛选正确过滤
从时间轴标记里程碑 → 大事记 Tab 实时出现
添加独立里程碑 → 列表更新
```

---

## Phase 6 · 媒体与富文本编辑器

### 目标
替换 Phase 4/5 中的 textarea 占位，实现完整的块级富文本编辑器和图片上传功能。

### 6.1 后端媒体模块

**任务列表：**

- [ ] 安装依赖：`multer`、`sharp`、`bullmq`
- [ ] `jobs/queue.ts`：初始化 BullMQ，连接 Redis，创建 `image-processing` 队列
- [ ] `jobs/image.processor.ts`：
  - 监听队列任务
  - Sharp 处理：生成 800px 宽 WebP 缩略图
  - 完成后更新 `media` 表的 `thumb_path`、`width`、`height`
- [ ] `middlewares/upload.middleware.ts`：
  - Multer 配置：磁盘存储，路径 `/data/uploads/originals/{year}/{month}/{uuid}.ext`
  - 白名单：image/jpeg, image/png, image/webp, image/gif
  - 大小限制：10MB
- [ ] `modules/media/media.service.ts`：
  - `uploadFile(file, userId)` → 写 media 表，推任务到队列，返回临时记录
  - `deleteFile(id, userId)` → 删文件 + 数据库记录
  - `getMediaById(id)`
- [ ] `modules/media/media.routes.ts`：
  ```
  POST   /api/v1/media/upload   （需登录，contributor+）
  DELETE /api/v1/media/:id      （需登录，仅上传者或管理员）
  ```

**验收标准：**
```
POST /media/upload 上传一张图 → 返回 {id, url, thumbUrl}
查看 /data/uploads/thumbs/ → 缩略图文件已生成
DELETE /media/:id → 文件和记录均被删除
```

---

### 6.2 前端富文本编辑器

**任务列表：**

- [ ] 安装依赖：`@tiptap/vue-3`、`@tiptap/starter-kit`、`@tiptap/extension-image`、`@tiptap/extension-link`、`@tiptap/extension-placeholder`
- [ ] `src/api/media.ts`：封装上传接口
- [ ] `src/components/editor/BlockEditor.vue`：
  - 工具栏：Bold / Italic / H1-H3 / 列表 / 引用 / 图片插入 / 链接 / 分割线
  - 工具栏图标使用 SVG inline（与 UIDesign.md 图标规范一致）
  - `v-model` 绑定 Tiptap JSON 输出
  - 图片插入：弹出上传组件，上传成功后插入节点
- [ ] `src/components/editor/MediaUpload.vue`：
  - 拖放区域 + 点击上传
  - 上传进度显示
  - 粘贴图片支持（paste 事件拦截）
  - 返回上传成功的 media 对象给父组件
- [ ] 替换 `EventFormModal.vue` 的 textarea → `BlockEditor`
- [ ] 替换 `RelationOverview.vue` 的 textarea → `BlockEditor`
- [ ] `EventDetail.vue` 内容渲染：将 Tiptap JSON 渲染为 HTML（使用 `@tiptap/vue-3` 的 `generateHTML`）

**验收标准：**
```
事件编辑器工具栏可用（加粗/斜体/标题/列表）
拖放图片到编辑器 → 自动上传，插入图片块
富文本内容保存到数据库（JSON 格式）
时间轴事件详情正确渲染 HTML
```

---

## Phase 7 · 主题与定制系统

### 目标
实现完整的主题引擎（颜色/字体/布局），支持全局主题和 CP 级主题。

### 7.1 后端主题支持

**任务列表：**

- [ ] `site_settings` 表新增 key：`global_theme`（存全局主题 JSON）
- [ ] `cps` 表 `theme_config` 字段已存在，实现 PATCH 接口支持更新
- [ ] `modules/settings/settings.routes.ts`：
  ```
  GET   /api/v1/settings
  PATCH /api/v1/settings        （需 admin+）
  ```

---

### 7.2 前端主题引擎

**任务列表：**

- [ ] `src/stores/theme.ts`：
  - `currentTheme`：当前激活的主题配置对象
  - `cpTheme`：当前 CP 的专属主题（进入详情页时加载）
  - `applyTheme(config)`：将 token 写入 `document.documentElement` CSS 变量
  - `resetToGlobal()`：离开 CP 详情页时恢复全局主题
- [ ] `src/styles/themes/`：内置主题文件（每个文件导出 `ThemeConfig` 对象）
  - `default.ts`（清新白，按 UIDesign.md 默认值）
  - `dark.ts`（深夜黑，按 UIDesign.md 暗色映射）
  - `sakura.ts`（樱花粉）
  - `inkgreen.ts`（墨绿雅）
  - `vintage.ts`（复古纸）
- [ ] `src/composables/useTheme.ts`：
  - `switchTheme(themeId)`
  - `saveCustomTheme(name, config)`
  - `exportTheme()`：导出 JSON
  - `importTheme(json)`：导入并应用
- [ ] `src/views/settings/ThemeSettings.vue`：
  - 内置主题卡片选择（点击预览）
  - 自定义调色板：颜色拾色器（主色/背景/卡片/文字/轴线）
  - 字体选择：下拉选预设字体 + 上传自定义字体
  - 布局调节：卡片圆角滑块、间距密度、动画速度
  - 实时预览
  - 保存为主题 / 导出 JSON
- [ ] CP 详情页进入时：调用 `themeStore.applyTheme(cp.theme_config)`（若 enabled）
- [ ] CP 详情页离开时（路由守卫 `beforeLeave`）：调用 `themeStore.resetToGlobal()`
- [ ] `CpBanner.vue` 新增「设置主题」按钮（编辑者+权限），打开 CP 主题配置 Modal

**验收标准：**
```
设置页切换内置主题 → 全站颜色实时变化，无刷新
自定义颜色 → 实时预览
导出主题 JSON → 文件下载
导入主题 JSON → 应用生效
进入特定 CP 详情页 → 切换到 CP 专属主题
离开 CP 详情页 → 恢复全局主题
深色模式切换图标 → 全局切换
```

---

## Phase 8 · 成员管理

### 目标
实现多账号管理界面，包括邀请成员、修改权限、CP 级权限范围控制。

### 8.1 后端成员管理

**任务列表：**

- [ ] `modules/user/user.service.ts`：
  - `listUsers(query)` → 分页列表（仅 admin+）
  - `updateUserRole(userId, role, operatorId)` → 修改权限，校验操作者不能提升到自己级别以上
  - `removeUser(userId, operatorId)` → 移除成员（不删除用户数据，标记为 inactive）
  - `generateInviteCode(role, expiresAt, createdBy)` → 生成邀请码写 invitations 表
  - `useInviteCode(code)` → 验证邀请码有效性（供 register 调用）
- [ ] `modules/user/user.routes.ts`：
  ```
  GET    /api/v1/users              （admin+）
  PATCH  /api/v1/users/:id/role     （admin+）
  DELETE /api/v1/users/:id          （admin+）
  POST   /api/v1/users/invite       （admin+，生成邀请码）
  GET    /api/v1/users/me
  PATCH  /api/v1/users/me           （修改自己的昵称/头像/偏好）
  ```
- [ ] 操作日志：`user:role_change` / `user:remove` / `user:invite` 写入 `operation_logs`
- [ ] `modules/logs/log.routes.ts`：
  ```
  GET /api/v1/logs        （admin+，支持日期/用户筛选）
  ```

---

### 8.2 前端成员管理

**任务列表：**

- [ ] `src/api/user.ts`：封装用户管理 API
- [ ] `src/views/settings/MemberSettings.vue`（仅 admin+ 可见）：
  - 成员列表表格：头像/用户名/角色/加入时间/操作列
  - 角色筛选下拉
  - 搜索框（按用户名）
  - 「邀请成员」按钮 → 打开邀请 Modal
  - 「编辑」→ 权限修改 Modal；「移除」→ 二次确认
- [ ] `InviteMemberModal.vue`：
  - 生成邀请链接（含有效期选择：24h/72h/7天/永久）
  - 邀请后角色选择（仅低于操作者的角色可选）
  - 一键复制链接
- [ ] `EditMemberModal.vue`：
  - 修改角色下拉（仅低于操作者的选项）
  - 特殊限制复选框（仅限指定 CP / 禁止删除 / 需审核）
- [ ] `src/views/settings/SettingsView.vue`：
  - 导航侧边栏：主题 / 成员管理（admin+）/ 数据管理 / 个人设置
  - 根据角色动态显示菜单项
- [ ] 个人设置页（头像/昵称/密码修改/通知偏好/编辑器默认模式）
- [ ] 操作日志页（admin+ 可见）：
  - 列表：时间/用户/操作描述
  - 筛选：日期范围 + 用户 + 操作类型

**验收标准：**
```
admin 账号可见成员管理菜单，viewer 不可见
生成邀请链接 → 使用链接注册成功，角色正确
修改成员角色 → 即时生效（对方下次请求时权限变化）
操作日志页记录修改行为
```

---

## Phase 9 · 数据管理

### 目标
实现数据导入/导出，保障用户的数据自主权。

### 9.1 后端数据导入导出

**任务列表：**

- [ ] `modules/export/export.service.ts`：
  - `exportFullData(userId)` → 查询所有 CP/事件/人物/里程碑/标签，组装 JSON
  - `exportCpData(cpId)` → 单 CP 数据导出
  - 导出格式约定（schema version 字段，便于后续向后兼容）：
    ```json
    {
      "exportVersion": "1.0",
      "exportedAt": "ISO8601",
      "site": "CP档案站",
      "data": {
        "cps": [...],
        "events": [...],
        "characters": [...],
        "milestones": [...],
        "tags": [...]
      }
    }
    ```
- [ ] `modules/import/import.service.ts`：
  - `validateImportData(json)` → Zod 验证导入文件格式
  - `importData(json, mode, userId)` → `mode: 'merge' | 'overwrite'`
    - merge：已存在的 CP（按名称匹配）则合并事件；新 CP 直接插入
    - overwrite：清空再插入
  - 导入为事务操作（失败全部回滚）
- [ ] `modules/export/export.routes.ts`：
  ```
  GET  /api/v1/export/full        → 返回 JSON 文件下载（admin+）
  GET  /api/v1/export/cp/:id      → 单 CP JSON 文件下载
  POST /api/v1/import             → 接收 JSON 文件（admin+）
  ```

---

### 9.2 前端数据管理

**任务列表：**

- [ ] `src/views/settings/DataSettings.vue`（admin+ 可见）：
  - 「导出全站数据」按钮 → 下载 JSON
  - 「导出当前 CP」（在 CP 详情页 `...` 菜单中）
  - 「导入数据」区域：
    - 拖放/点击上传 JSON 文件
    - 选择模式：合并 / 覆盖（显示说明文字，覆盖模式显示红色警告）
    - 预览：显示将导入的 CP 数量/事件数量
    - 确认导入按钮 + Loading 状态
  - 备份记录提示（显示最后一次自动备份时间，从 site_settings 读取）

**验收标准：**
```
导出全站数据 → 下载 JSON 文件，格式正确
单 CP 导出 → 仅包含该 CP 相关数据
导入 JSON → 数据正确写入，无报错
导入合并模式 → 已有数据不重复
```

---

## Phase 10 · 扩展功能

### 目标
实现高级扩展功能：版本历史、批量操作、事件关联、自定义 Tab、模板系统。

### 10.1 版本历史

**后端：**
- [ ] 修改 `event.service.ts` 的 `updateEvent`：每次更新前先将当前内容快照写入 `event_versions` 表
- [ ] `modules/event/event.routes.ts` 新增：
  ```
  GET  /cps/:cpId/events/:id/versions          （editor+）
  POST /cps/:cpId/events/:id/versions/:verId/restore  （editor+）
  ```
- [ ] 版本数量限制：超过 50 条时删除最早的版本（FIFO）

**前端：**
- [ ] `EventDetail.vue` 新增「版本历史」按钮（editor+ 可见）
- [ ] `VersionHistoryDrawer.vue`：右侧抽屉，列表显示所有版本（时间/操作人），点击对比，支持恢复

---

### 10.2 批量操作

**前端：**
- [ ] `Timeline.vue` 工具栏新增「批量模式」切换按钮
- [ ] 批量模式：事件行左侧出现复选框
- [ ] 批量操作工具栏（选中后出现）：
  - 批量添加标签（弹出标签多选）
  - 批量设置重要性
  - 批量删除（二次确认）
  - 导出选中（调导出接口，传 eventIds 数组）
- [ ] 批量 API：`PATCH /cps/:cpId/events/batch`（body: `{ ids, operation, data }`）

---

### 10.3 事件关联

**后端：**
- [ ] `event.service.ts` 新增：`addRelation(sourceId, targetId, type)` / `removeRelation(id)`
- [ ] `event.routes.ts` 新增：
  ```
  POST   /cps/:cpId/events/:id/relations
  DELETE /cps/:cpId/events/:id/relations/:relId
  GET    /cps/:cpId/events/:id/relations
  ```

**前端：**
- [ ] `EventFormModal.vue` 增加「关联事件」字段：搜索框 + 关联类型下拉
- [ ] `EventDetail.vue` 展示关联事件列表（可点击跳转）
- [ ] 时间轴上关联事件间显示虚线（SVG，可开关）

---

### 10.4 自定义 Tab

**后端：**
- [ ] `cp_tabs` 表 CRUD 已在 Phase 1 建立
- [ ] `modules/cp/cp.routes.ts` 新增：
  ```
  GET    /cps/:id/tabs
  POST   /cps/:id/tabs
  PATCH  /cps/:id/tabs/:tabId
  DELETE /cps/:id/tabs/:tabId
  PUT    /cps/:id/tabs/reorder    （传递 orderedIds 数组）
  ```

**前端：**
- [ ] `DetailNav.vue` Tab 列表从 API 动态加载（含自定义 Tab）
- [ ] `src/views/cp/CustomTab.vue`：
  - 根据 `tab.content.renderer` 动态渲染：
    - `richtext`：渲染富文本内容（用 BlockEditor 查看/编辑）
    - `links`：链接列表
    - `gallery`：图片墙
- [ ] Tab 管理界面（`...` 菜单 → 「管理 Tab」）：
  - 拖拽排序、重命名、隐藏/显示、删除、新增

---

### 10.5 事件模板

**后端：**
- [ ] `site_settings` 新增 key：`event_templates`（存模板数组 JSON）
- [ ] 或新增 `event_templates` 表（用于多用户共享模板时）

**前端：**
- [ ] `src/views/settings/TemplateSettings.vue`：
  - 模板列表：内置模板 + 用户自定义模板
  - 新建模板：填写名称，预设字段/默认标签
  - 从已有事件保存为模板（`EventDetail.vue` 的 `...` 菜单）
- [ ] `EventFormModal.vue` 顶部新增「从模板创建」下拉，选择模板后预填字段

---

## 阶段依赖关系图

```
Phase 0（工程基础）
    │
    ▼
Phase 1（核心数据层）── 独立可测试，无 UI
    │
    ▼
Phase 2（认证与权限）── 前提：Phase 0 + Phase 1
    │
    ▼
Phase 3（CP 管理 MVP）── 前提：Phase 2
    │
    ├──→ Phase 4（时间轴）── 前提：Phase 3
    │         │
    │         ├──→ Phase 6（媒体+富文本）── 替换占位组件
    │         │
    │         └──→ Phase 10.2（批量操作）
    │                    └──→ Phase 10.3（事件关联）
    │
    ├──→ Phase 5（简介+大事记）── 前提：Phase 3，与 Phase 4 并行
    │
    ├──→ Phase 7（主题定制）── 前提：Phase 3，与 Phase 4/5 并行
    │
    ├──→ Phase 8（成员管理）── 前提：Phase 2，与 Phase 4/5 并行
    │
    ├──→ Phase 9（数据管理）── 前提：Phase 3
    │
    └──→ Phase 10.1（版本历史）── 前提：Phase 4
         Phase 10.4（自定义 Tab）── 前提：Phase 5
         Phase 10.5（模板系统）── 前提：Phase 4
```

---

## 各阶段产出物汇总

| 阶段 | 后端产出 | 前端产出 |
|------|----------|----------|
| Phase 0 | 工程骨架 + health 接口 + Docker | 空项目 + CSS 变量 + CI/CD |
| Phase 1 | 数据库 Schema + 基础 CRUD API | - |
| Phase 2 | 认证接口 + 权限中间件 | 登录页 + Axios 拦截器 + 路由守卫 |
| Phase 3 | - | 首页 + CP 详情页框架 + 基础组件库 |
| Phase 4 | 事件筛选 API | 时间轴完整页面 + 快速录入 + 简版编辑器 |
| Phase 5 | - | 人物简介 Tab + 大事记 Tab |
| Phase 6 | 媒体上传接口 + 图片处理队列 | 富文本编辑器 + 图片上传组件 |
| Phase 7 | 主题设置接口 | 主题引擎 + 主题设置页 |
| Phase 8 | 用户管理接口 + 操作日志 | 成员管理页 + 个人设置页 |
| Phase 9 | 导入/导出接口 | 数据管理页 |
| Phase 10 | 版本历史 + 批量 API + 关联 API + Tab API | 版本历史抽屉 + 批量操作 + 自定义 Tab + 模板 |

---

## 开发规范（全阶段执行）

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `EventRow.vue` |
| 组合式函数 | camelCase + use 前缀 | `usePermission.ts` |
| Store | camelCase | `event.ts` |
| API 函数 | camelCase | `listEvents(params)` |
| 数据库表 | snake_case | `event_versions` |
| CSS 变量 | kebab-case + 语义前缀 | `--color-primary` |
| 后端错误码 | SCREAMING_SNAKE | `EVENT_NOT_FOUND` |

### 低耦合检查清单（每阶段 Code Review 必检）

- [ ] 组件不直接调用 Axios，必须通过 `src/api/` 函数
- [ ] Service 层不使用 HTTP 相关对象（req/res/c）
- [ ] 模块间 Service 调用（如 event service 调 milestone service）通过注入，不直接 import 数据库查询
- [ ] 前端组件不直接访问 Pinia Store，通过 composable 封装
- [ ] 权限判断在后端权限矩阵中定义，前端 `can()` 只做 UI 隐藏，不做安全保障
- [ ] JSONB 字段修改不需要数据库迁移（验证自定义字段扩展路径）
- [ ] 新增 Tab 类型：前端新增 `*.vue` + 注册 renderer，后端只改枚举定义
