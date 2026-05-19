# CP 档案站 · 迭代开发文档 v2.0

> 文档日期：2026-05-19  
> 依赖文档：Architecture.md / CPDesign.md / PhaseDesign.md

---

## 一、迭代优先级总览

```
Sprint 1（修补完善）→ Sprint 2（成员体系）→ Sprint 3（数据安全）→ Sprint 4（高级功能）
     1-2周                  1-2周                  1周                  2-3周
```

---

## Sprint 1 · 修补现有模块缺口

> **目标：** 让 Phase 0–7 的功能真正完整可用，无明显残缺。

### 1.1 邀请码 & 注册流程修复 ⚡（最高优先）

**问题：** 当前系统注册完全依赖邀请码，但没有任何 API 可以生成邀请码，导致除了 `db:seed` 创建的 admin 外无法新增用户。

**设计方案：**

| 步骤 | 说明 |
|------|------|
| admin 进入成员设置页 | 点击「生成邀请链接」|
| 选择角色 + 有效期 | 角色：editor/contributor/viewer；有效期：24h/7天/永久 |
| 系统生成唯一 code | 写入 `invitations` 表（`invitations` 表已建，只差 API）|
| 复制链接 | `http://localhost:5173/register?code=xxx`，接收方访问后自动填入 code |

**后端实现（`modules/user/`，复用已有 `invitations` Schema）：**

```
POST /api/v1/users/invite         生成邀请码（admin+）
GET  /api/v1/users                用户列表（admin+）
PATCH /api/v1/users/:id/role      修改角色（admin+）
DELETE /api/v1/users/:id          停用账号（admin+）
GET /api/v1/users/me
PATCH /api/v1/users/me            修改个人信息
```

**前端实现：**
- `RegisterView.vue` — URL 自动读取 `?code=` 填入邀请码字段
- `views/settings/MemberSettings.vue` — 成员列表 + 邀请弹窗
- `components/settings/InviteModal.vue` — 角色/有效期选择 + 复制链接

**技术栈：** Hono + Drizzle（`invitations` 表） + Vue `useRoute().query` 读取 URL 参数 + `navigator.clipboard.writeText`

---

### 1.2 里程碑 ↔ 时间轴联动修复

**问题：** 大事记和时间轴数据孤立，"从时间轴标记里程碑"写入的 `milestones` 记录没有 `eventId` 外键，MilestoneCard 点击无法跳转对应事件。

**设计方案：**

```
TimelineTab → EventDetail → 「⭐ 标为里程碑」按钮
    ↓ POST /cps/:cpId/events/:id/milestone
    ↓ 自动创建 milestone（title/date 从 event 复制，eventId 保存）
MilestoneTab → MilestoneCard 点击「查看原事件 →」
    ↓ router.push(`/cp/:cpId/timeline?highlight=:eventId`)
TimelineTab 挂载时检测 query.highlight → 滚动到对应 EventRow 并高亮 2s
```

**后端（补充 `event.routes.ts`）：**

```
POST   /cps/:cpId/events/:id/milestone   标记为里程碑（写 milestones 表，含 event_id）
DELETE /cps/:cpId/events/:id/milestone   取消标记
```

**前端：**
- EventDetail.vue 添加 `isMilestone` 计算属性
- MilestoneCard 新增「查看原事件」按钮（仅当 `eventId` 存在时显示）
- TimelineTab 处理 `route.query.highlight`，`scrollIntoView()` + 高亮 class

**技术栈：** Vue Router query params + `scrollIntoView({ behavior: 'smooth' })` + CSS transition 高亮动画

---

### 1.3 CP 封面/Banner 图片上传

**问题：** 媒体上传接口已就绪，但 `CreateCpModal` 和 CP 编辑仍使用 URL 文本输入。

**设计方案：**
- CreateCpModal / CpEditModal 封面区：点击 → 使用 MediaUpload 组件上传 → 回填 coverUrl
- 上传成功后图片立即在表单内预览
- 表单提交时将 coverUrl / bannerUrl 作为字段传入 PATCH CP 接口

**技术栈：** 复用已有 `MediaUpload.vue` + `api/media.ts` + URL.createObjectURL 本地预览

---

### 1.4 首页分页（加载更多）

**问题：** 目前一次性加载所有 CP，数据量大时性能差。

**设计方案：**
- 使用 `IntersectionObserver` 监听列表底部哨兵元素
- 触底时追加加载下一页（`page + 1`），数据追加到现有列表
- 加载状态：底部 spinner；无更多数据：显示「已全部加载」

**技术栈：** 原生 IntersectionObserver；后端已支持 `?page=&limit=` 分页

---

### 1.5 深色模式快捷切换 & 统计面板

**设计方案：**
- 首页右上角增加 🌙 图标按钮，调用 `themeStore.toggleDark()`（在 default ↔ dark 之间切换）
- `MilestoneTab.vue` 底部统计面板：从 `milestoneStore` 计算总数、最早/最近日期差值

**技术栈：** ThemeStore 新增 `toggleDark()` action；日期计算使用原生 `Date`

---

## Sprint 2 · 成员管理体系（Phase 8）

> **目标：** 支持多人协作，owner 可邀请成员、管理权限。

### 2.1 后端成员模块

**新建 `modules/user/`：**

```
GET    /api/v1/users                 用户列表（admin+）
GET    /api/v1/users/me
PATCH  /api/v1/users/me              昵称/头像/偏好
PATCH  /api/v1/users/:id/role        修改角色（admin+）
DELETE /api/v1/users/:id             停用（admin+）
POST   /api/v1/users/invite          生成邀请码（admin+）
GET    /api/v1/users/invitations      查看邀请码列表（admin+）
DELETE /api/v1/users/invitations/:code 撤销邀请码（admin+）
GET    /api/v1/logs                  操作日志（admin+）
```

**权限校验规则：**
- owner 可操作所有角色
- admin 只能操作 editor/contributor/viewer
- 任何人不能修改自己的角色

**技术栈：** Drizzle + `users`/`invitations`/`operation_logs` 表，Zod 验证

---

### 2.2 前端成员管理

**SettingsView.vue 侧边栏完善：**

```
设置
├── 🎨 外观主题（已实现）
├── 👤 个人信息（新增）
├── 👥 成员管理（admin+ 才显示）
├── 📋 操作日志（admin+ 才显示）
└── 💾 数据管理（空页占位）
```

**新建组件：**

| 组件 | 功能 |
|------|------|
| `MemberSettings.vue` | 成员列表表格 + 邀请/编辑/停用操作 |
| `InviteModal.vue` | 角色选择 + 有效期 + 生成链接 + 复制 |
| `EditRoleModal.vue` | 角色修改确认弹窗 |
| `InvitationList.vue` | 已生成邀请码列表 + 撤销 |
| `ProfileSettings.vue` | 昵称/头像/密码修改 |
| `LogsView.vue` | 日志列表 + 筛选 |

**技术栈：** 复用 `Modal.vue` + `Button.vue` + `Input.vue`；`navigator.clipboard` 复制链接；`usePermission()` 控制菜单可见性

---

## Sprint 3 · 数据管理（Phase 9）

> **目标：** 用户数据自主权，可导出备份、可迁移。

### 3.1 后端导出

```
GET /api/v1/export/full    全站导出 JSON（owner/admin）
GET /api/v1/export/:cpId   单 CP 导出 JSON（editor+）
```

**导出格式约定：**
```json
{
  "exportVersion": "1.0",
  "exportedAt": "ISO8601",
  "data": { "cps": [], "events": [], "characters": [], "milestones": [], "tags": [] }
}
```

**技术栈：** Hono `c.body()` 流式输出；`Content-Disposition: attachment` 触发下载

---

### 3.2 后端导入

```
POST /api/v1/import        上传 JSON 文件导入（owner/admin）
```

**模式：** merge（按 CP 名称匹配合并）/ overwrite（清空再插入）  
**技术栈：** Multer 接收 JSON；Drizzle 事务 `db.transaction()`；Zod 格式校验

---

### 3.3 前端数据管理页

```
数据管理
├── 导出区（全站导出/单 CP 导出）
├── 导入区（拖放 JSON + 模式选择）
└── 危险区（清空全部数据，需输入确认）
```

---

## Sprint 4 · 高级扩展功能（Phase 10）

### 4.1 事件版本历史
- 每次 updateEvent 前快照写 `event_versions` 表（超 50 条 FIFO 清理）
- 前端右侧抽屉展示历史版本，支持预览/恢复/对比

### 4.2 批量操作
- 时间轴批量模式：checkbox 选中 → 批量打标签/设重要性/删除
- 后端批量 PATCH `/cps/:cpId/events/batch`

### 4.3 事件关联
- EventFormModal 新增关联事件搜索字段
- 时间轴 SVG 虚线连线（可开关）

### 4.4 自定义 Tab
- `cp_tabs` 表 CRUD；三种渲染器（richtext/links/gallery）
- 拖拽排序（HTML Drag and Drop API）

### 4.5 事件模板
- 模板存 `site_settings.event_templates`（JSONB）
- EventFormModal 顶部「从模板创建」下拉

---

## 技术栈汇总

| 层级 | 技术 | 用途 |
|------|------|------|
| 后端框架 | Hono + `@hono/node-server` | 路由/中间件 |
| 数据库 ORM | Drizzle ORM + `postgres` | 查询/事务 |
| 验证 | Zod | 请求参数校验 |
| 认证 | `jose` JWT + `bcryptjs` | 双 Token 认证 |
| 异步队列 | BullMQ + `@redis/client` | 图片处理 |
| 图片处理 | Sharp | WebP 缩略图生成 |
| 文件上传 | Multer | 图片/JSON 文件接收 |
| 前端框架 | Vue 3 + Vite + TypeScript | SPA 主框架 |
| 状态管理 | Pinia | Store 层 |
| 路由 | Vue Router 4 | SPA 路由 |
| 样式 | Tailwind CSS + CSS 变量 | 样式 + 主题系统 |
| 富文本 | Tiptap v2 (`@tiptap/vue-3`) | 块级编辑器 |
| HTTP 客户端 | Axios | API 请求 + 自动刷新 Token |
| 云数据库 | Neon (PostgreSQL) | 生产数据库 |
| 云缓存 | Upstash (Redis, TLS) | Token 存储 + 任务队列 |

---

## 阶段依赖关系

```
Sprint 1（修补）
  ├── 1.1 邀请码 API ──→ Sprint 2 前端成员页才完整
  ├── 1.2 里程碑联动（独立）
  ├── 1.3 封面上传（独立）
  ├── 1.4 首页分页（独立）
  └── 1.5 暗黑模式/统计（独立）
        ↓
Sprint 2（成员管理）── 依赖 Sprint 1.1
        ↓
Sprint 3（数据管理）── 可与 Sprint 2 并行
        ↓
Sprint 4（高级功能）── 依赖前三个 Sprint 基础稳定
```
