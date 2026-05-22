# CP 档案站 · 功能现状与迭代路线图

> 文档版本：v3.0  
> 更新时间：2026-05-22  
> 仓库：https://github.com/1508291200/CP.git

---

## 一、已实现功能模块清单

### 1. 基础架构层

| 组件 | 状态 | 说明 |
|------|------|------|
| 前端工程（Vue 3 + Vite + TypeScript） | ✅ 完成 | Tailwind CSS、Pinia、Vue Router 4 |
| 后端工程（Hono + Node.js + TypeScript） | ✅ 完成 | ESM 模块、统一错误处理、统一响应格式 |
| 数据库（PostgreSQL via Neon） | ✅ 完成 | Drizzle ORM、自动迁移脚本 |
| 缓存（Redis via Upstash TLS） | ✅ 完成 | Refresh Token 存储、BullMQ 任务队列 |
| Docker 部署配置 | ✅ 完成 | `docker-compose.yml`、开发/生产双配置 |
| Nginx 反向代理 | ✅ 完成 | 前端静态托管 + API 代理 |
| GitHub Actions CI | ✅ 完成 | 自动构建与部署流水线 |

---

### 2. 认证模块（`modules/auth`）

| 功能 | 状态 | 接口 |
|------|------|------|
| 邀请码注册 | ✅ 完成 | `POST /auth/register` |
| 账号密码登录 | ✅ 完成 | `POST /auth/login` |
| AccessToken 刷新 | ✅ 完成 | `POST /auth/refresh`（Cookie 携带 Refresh Token）|
| 退出登录 | ✅ 完成 | `POST /auth/logout` |
| 获取当前用户信息 | ✅ 完成 | `GET /auth/me`（含 CP 成员关系）|
| 双 Token 机制 | ✅ 完成 | Access Token 15min + Refresh Token 7天 |
| 前端自动刷新 Token | ✅ 完成 | Axios 拦截器 + 请求队列防重复刷新 |

---

### 3. 权限体系（CP 级多层权限）

| 功能 | 状态 | 说明 |
|------|------|------|
| 全站角色体系 | ✅ 完成 | `owner > admin > cp_admin > editor > viewer` |
| CP 成员表（`cp_members`） | ✅ 完成 | 每个用户在不同 CP 可持有不同角色 |
| 全局权限中间件 | ✅ 完成 | `permissionMiddleware` - 基于全站 role |
| CP 级权限中间件 | ✅ 完成 | `cpPermissionMiddleware` - 结合 cp_members 表 |
| CP Admin 邀请配额 | ✅ 完成 | `cp_admin_quota` 表，可设上限 |
| 前端 `usePermission` composable | ✅ 完成 | `can()` / `canInCp()` 方法 |
| CP 成员管理 API | ✅ 完成 | 添加/修改角色/移除成员 |

---

### 4. CP 管理模块（`modules/cp`）

| 功能 | 状态 | 接口 |
|------|------|------|
| CP 列表（含搜索/标签筛选/分页） | ✅ 完成 | `GET /cps` |
| CP 详情 | ✅ 完成 | `GET /cps/:id` |
| 创建 CP | ✅ 完成 | `POST /cps`（admin+ 或 cp:create 权限）|
| 编辑 CP | ✅ 完成 | `PATCH /cps/:id` |
| 删除 CP | ✅ 完成 | `DELETE /cps/:id`（admin+ 权限）|
| CP 可见性控制 | ✅ 完成 | `public / members / private` |
| 自定义 Tab（`cp_tabs`） | ✅ 完成 | Tab CRUD + 富文本/链接/图库三种渲染 |
| 标签关联 | ✅ 完成 | 多对多，全量替换 |

---

### 5. 事件模块（`modules/event`）

| 功能 | 状态 | 接口/说明 |
|------|------|---------|
| 事件列表（分页/筛选/排序） | ✅ 完成 | `GET /cps/:cpId/events` |
| 创建事件 | ✅ 完成 | `POST /cps/:cpId/events` |
| 更新事件 | ✅ 完成 | `PATCH /cps/:cpId/events/:id` |
| 删除事件 | ✅ 完成 | `DELETE /cps/:cpId/events/:id` |
| 事件版本历史 | ✅ 完成 | 每次更新前快照，最多保留 50 版本（FIFO）|
| 版本还原 | ✅ 完成 | `POST /cps/:cpId/events/:id/versions/:vId/restore` |
| 里程碑标记/取消 | ✅ 完成 | `PATCH /cps/:cpId/events/:id/milestone` |
| 批量操作 | ✅ 完成 | `PATCH /cps/:cpId/events/batch`（批量改重要性/标签）|
| 批量删除 | ✅ 完成 | `DELETE /cps/:cpId/events/batch` |
| 事件可见性 | ✅ 完成 | `public / members / private` |
| 自定义字段 | ✅ 完成 | `customFields` JSONB 字段 |
| 情绪图标 | ✅ 完成 | `emotionIcon` 字段 |
| 来源引用 | ✅ 完成 | `sourceRef` 字段 |
| 富文本内容 | ✅ 完成 | Tiptap v2 块级编辑器 |

---

### 6. 里程碑模块（`modules/milestone`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 里程碑列表 | ✅ 完成 | `GET /cps/:cpId/milestones` |
| 创建里程碑 | ✅ 完成 | `POST /cps/:cpId/milestones` |
| 更新里程碑 | ✅ 完成 | `PATCH /cps/:cpId/milestones/:id` |
| 删除里程碑 | ✅ 完成 | `DELETE /cps/:cpId/milestones/:id` |
| 年份筛选 | ✅ 完成 | 前端 YearFilter 组件 |
| 时间轴 → 里程碑联动写入 | ✅ 完成 | `toggleMilestone` 自动创建记录 |

---

### 7. 人物档案模块（`modules/character`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 人物列表 | ✅ 完成 | `GET /cps/:cpId/characters` |
| 创建/编辑/删除人物 | ✅ 完成 | CRUD 全实现 |
| 关系图谱 | ✅ 完成 | `RelationOverview.vue` 可视化 |
| 自定义属性 | ✅ 完成 | `attributes` JSONB 字段 |

---

### 8. 标签模块（`modules/tag`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 标签 CRUD | ✅ 完成 | `GET/POST/PATCH/DELETE /tags` |
| 全局标签，跨 CP 复用 | ✅ 完成 | |
| CP 和事件关联标签 | ✅ 完成 | 多对多关联 |

---

### 9. 媒体模块（`modules/media`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 图片上传 | ✅ 完成 | `POST /media/upload`，Multer 接收 |
| WebP 缩略图生成 | ✅ 完成 | Sharp + BullMQ 异步处理 |
| 媒体文件列表 | ✅ 完成 | `GET /media` |
| 静态文件服务 | ✅ 完成 | `/uploads/` 目录挂载 |

---

### 10. 用户管理模块（`modules/user`）

| 功能 | 状态 | 接口 |
|------|------|------|
| 用户列表 | ✅ 完成 | `GET /users`（admin+）|
| 获取自身信息 | ✅ 完成 | `GET /users/me` |
| 修改个人信息 | ✅ 完成 | `PATCH /users/me`（昵称/头像/密码）|
| 修改用户角色 | ✅ 完成 | `PATCH /users/:id/role`（admin+）|
| 停用/激活用户 | ✅ 完成 | `PATCH /users/:id/status`（admin+）|
| 生成邀请码 | ✅ 完成 | `POST /users/invite`（admin+ / cp_admin 在配额内）|
| 查看邀请码列表 | ✅ 完成 | `GET /users/invitations`（admin+）|
| 撤销邀请码 | ✅ 完成 | `DELETE /users/invitations/:code`（admin+）|
| 操作日志 | ✅ 完成 | `GET /users/logs`（admin+）|
| cp_admin 配额调整 | ✅ 完成 | `PATCH /users/:id/quota`（admin+）|

---

### 11. 数据管理模块（`modules/data`）

| 功能 | 状态 | 接口 |
|------|------|------|
| 全站数据导出（JSON） | ✅ 完成 | `GET /data/export/full`（admin+）|
| 单 CP 数据导出（JSON） | ✅ 完成 | `GET /data/export/:cpId` |
| 数据导入（JSON） | ✅ 完成 | `POST /data/import`（admin+，支持 merge/overwrite）|
| 清空全站数据 | ✅ 完成 | `DELETE /data/reset`（owner 专属）|

---

### 12. 消息提醒模块（`modules/notification`）✨ 新增

| 功能 | 状态 | 说明 |
|------|------|------|
| 通知 DB Schema | ✅ 完成 | `notifications` + `notification_preferences` 表 |
| 进程内事件总线 | ✅ 完成 | Node.js `EventEmitter`，fire-and-forget |
| 事件:创建通知 | ✅ 完成 | `event:created` |
| 事件:更新通知 | ✅ 完成 | `event:updated` |
| 事件:删除通知 | ✅ 完成 | `event:deleted` |
| 里程碑标记通知 | ✅ 完成 | `event:milestone` |
| 成员加入通知 | ✅ 完成 | `member:joined`（直接添加 + 邀请码注册）|
| 成员权限变更通知 | ✅ 完成 | `member:role_changed` |
| 成员移除通知 | ✅ 完成 | `member:removed` |
| CP 信息更新通知 | ✅ 完成 | `cp:updated` |
| 通知列表查询 | ✅ 完成 | `GET /notifications`（分页，支持仅未读）|
| 未读数查询 | ✅ 完成 | `GET /notifications/unread-count`（前端轮询）|
| 标记已读 | ✅ 完成 | `PATCH /notifications/read`（单条/全部）|
| 全站偏好设置 | ✅ 完成 | `GET/PATCH /notifications/preferences` |
| CP 级独立偏好 | ✅ 完成 | 优先级高于全站偏好，每 CP 可单独配置 |
| 偏好批量更新 | ✅ 完成 | `PUT /notifications/preferences/batch` |
| 接收者过滤逻辑 | ✅ 完成 | CP 成员 + 全站 owner/admin，排除触发者自身 |

---

### 13. 站点设置模块（`modules/settings`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 全站配置读写 | ✅ 完成 | `site_settings` JSONB 存储 |
| 注册是否需要邀请码 | ✅ 完成 | 可在设置中关闭邀请制 |

---

### 14. 前端页面

| 页面 / 组件 | 状态 | 说明 |
|------------|------|------|
| 首页（CP 列表 + 搜索 + 无限滚动） | ✅ 完成 | IntersectionObserver 懒加载 |
| 登录页 | ✅ 完成 | |
| 注册页（支持 URL 预填邀请码） | ✅ 完成 | |
| CP 详情页（4 Tab 嵌套路由） | ✅ 完成 | profile / timeline / milestones / custom |
| 时间轴页 | ✅ 完成 | EventRow、EventDetail、QuickInput、EventFormModal、VersionDrawer |
| 里程碑页 | ✅ 完成 | MilestoneCard、YearFilter |
| 人物档案页 | ✅ 完成 | CharacterCard、CharacterFormModal、RelationOverview |
| 自定义 Tab 页 | ✅ 完成 | 富文本/链接/图库三种渲染模式 |
| 设置页（侧边栏布局） | ✅ 完成 | |
| 主题与外观设置 | ✅ 完成 | 主题选择 + CSS 变量 + 深色模式 |
| 个人资料设置 | ✅ 完成 | 昵称/头像/密码修改 |
| 成员管理设置 | ✅ 完成 | 用户列表/邀请/权限/配额 |
| 数据管理设置 | ✅ 完成 | 导入/导出/重置 |
| **通知偏好设置** | ✅ 完成 | 全站 + 每个 CP 独立开关 |
| **通知中心页面** | ✅ 完成 | 列表、未读筛选、点击跳转资源 |
| **导航栏通知铃铛** | ✅ 完成 | 未读红点 + 下拉预览 5 条 |

---

## 二、待迭代 / 增补功能模块

### 🔴 高优先级

#### N-1: 里程碑 ↔ 时间轴双向联动（跳转 & 高亮）

**现状：** 时间轴标记里程碑后，在里程碑页无法点击跳转到原始事件。  
**方案：**
- `MilestoneCard` 增加「查看原事件 →」按钮（当 `eventId` 存在时显示）
- 跳转路径：`/cp/:cpId/timeline?highlight=:eventId`
- `TimelineTab` 监听 `route.query.highlight`，自动滚动并高亮对应 `EventRow`（CSS transition 2s）

#### N-2: CP 封面 / Banner 图片上传

**现状：** 创建/编辑 CP 时封面使用 URL 文本框，用户体验差。  
**方案：**
- `CreateCpModal` 和 CP 编辑区改用 `MediaUpload.vue` 组件
- 上传成功后回填 `coverUrl`，表单内实时预览
- 后端 `PATCH /cps/:id` 已支持，无需后端改动

#### N-3: 通知 SSE 升级（可选）

**现状：** 前端每 30s 轮询 `/notifications/unread-count`，有 30s 延迟。  
**方案：**
- 后端添加 `GET /notifications/stream`（SSE，`text/event-stream`）
- 前端 `EventSource` 替换轮询，实时推送未读数变更
- `notificationBus` 内部升级为 Redis Pub/Sub 可支持多进程

---

### 🟡 中优先级

#### N-4: 事件关联（跨事件引用）

**现状：** 事件之间无关联关系，无法表达因果/前后续集关系。  
**方案：**
- DB：`event_relations` 表（`from_event_id`, `to_event_id`, `relation_type`）
- `EventFormModal` 增加"关联事件"搜索字段
- `TimelineTab` 可选显示关联连线（SVG 虚线）

#### N-5: 全局搜索

**现状：** 仅首页 CP 列表支持名称搜索，无法跨 CP 搜索事件内容。  
**方案：**
- 后端 `GET /search?q=&scope=events|cps|characters` 全文检索
- PostgreSQL `ts_vector` 全文索引，或简单 `ilike` 查询
- 前端搜索结果页，分类展示命中条目

#### N-6: 导出格式扩展

**现状：** 仅支持 JSON 格式导出。  
**方案：**
- 增加 Markdown 导出（按时间轴格式排列）
- 增加 CSV 导出（事件数据表格）
- 增加 PDF 导出（html2canvas / puppeteer）

#### N-7: 通知推送到站外

**现状：** 通知仅在站内显示。  
**方案：**
- 集成 Web Push Notification（PWA，需 VAPID 密钥）
- 或集成邮件通知（Nodemailer），在用户关闭浏览器时也能收到

#### N-8: 操作日志前端查看

**现状：** 后端 `GET /users/logs` 已实现，但前端设置页无对应界面。  
**方案：**
- `settings/LogsView.vue`：日志列表 + 按操作类型/操作人/日期筛选
- 在设置侧边栏增加「操作日志」入口（admin+ 可见）

---

### 🟢 低优先级 / 长期规划

#### N-9: 事件模板系统

**方案：**
- `site_settings.event_templates` JSONB 存储模板列表
- `EventFormModal` 顶部「从模板创建」下拉
- 支持管理员自定义模板字段和默认值

#### N-10: 多语言国际化（i18n）

**方案：**
- `vue-i18n` 集成，中/英语言切换
- 语言包：`locales/zh-CN.json` / `locales/en.json`

#### N-11: 移动端 PWA 优化

**方案：**
- Service Worker 离线缓存 CP 数据
- Add to Home Screen manifest
- 移动端触摸手势（左滑返回、下拉刷新）

#### N-12: AI 辅助功能

**方案：**
- 事件摘要自动生成（输入来源链接 → AI 提取事件信息填入表单）
- 标签智能推荐（基于事件标题/内容）
- 关联事件智能推荐

---

## 三、数据库表总览

| 表名 | 用途 |
|------|------|
| `users` | 用户账号信息、全站角色 |
| `invitations` | 邀请码（含 CP 绑定、配额控制）|
| `cps` | CP 基本信息 |
| `cp_members` | CP 级成员关系（cp_admin/editor）|
| `cp_admin_quota` | cp_admin 的邀请配额 |
| `cp_tabs` | 自定义 Tab 配置 |
| `cp_tags` | CP 标签关联 |
| `events` | 事件主表 |
| `event_versions` | 事件版本历史快照 |
| `event_tags` | 事件标签关联 |
| `milestones` | 大事记（可关联 eventId）|
| `characters` | 人物档案 |
| `tags` | 全局标签 |
| `media_files` | 上传的媒体文件记录 |
| `site_settings` | 全站配置（JSONB）|
| `operation_logs` | 操作日志审计 |
| `notifications` | 系统通知消息 ✨ |
| `notification_preferences` | 用户通知订阅偏好 ✨ |

---

## 四、API 端点总览

### 认证
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

### CP 管理
```
GET    /api/v1/cps
POST   /api/v1/cps
GET    /api/v1/cps/:id
PATCH  /api/v1/cps/:id
DELETE /api/v1/cps/:id
GET    /api/v1/cps/:id/members
POST   /api/v1/cps/:id/members
PATCH  /api/v1/cps/:id/members/:userId/role
DELETE /api/v1/cps/:id/members/:userId
```

### 事件
```
GET    /api/v1/cps/:cpId/events
POST   /api/v1/cps/:cpId/events
PATCH  /api/v1/cps/:cpId/events/:id
DELETE /api/v1/cps/:cpId/events/:id
PATCH  /api/v1/cps/:cpId/events/:id/milestone
GET    /api/v1/cps/:cpId/events/:id/versions
POST   /api/v1/cps/:cpId/events/:id/versions/:vId/restore
PATCH  /api/v1/cps/:cpId/events/batch
DELETE /api/v1/cps/:cpId/events/batch
```

### 人物 / 里程碑 / 标签
```
GET/POST/PATCH/DELETE  /api/v1/cps/:cpId/characters[/:id]
GET/POST/PATCH/DELETE  /api/v1/cps/:cpId/milestones[/:id]
GET/POST/PATCH/DELETE  /api/v1/tags[/:id]
```

### 用户管理
```
GET    /api/v1/users
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/:id/role
PATCH  /api/v1/users/:id/status
PATCH  /api/v1/users/:id/quota
POST   /api/v1/users/invite
GET    /api/v1/users/invitations
DELETE /api/v1/users/invitations/:code
GET    /api/v1/users/logs
```

### 数据管理
```
GET    /api/v1/data/export/full
GET    /api/v1/data/export/:cpId
POST   /api/v1/data/import
DELETE /api/v1/data/reset
```

### 媒体
```
POST   /api/v1/media/upload
GET    /api/v1/media
DELETE /api/v1/media/:id
```

### 消息通知 ✨
```
GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/read
GET    /api/v1/notifications/preferences
PATCH  /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences/batch
```

### 站点设置
```
GET    /api/v1/settings
PATCH  /api/v1/settings
```

---

## 五、技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|---------|
| 后端框架 | Hono + @hono/node-server | ESM、路由/中间件 |
| 数据库 ORM | Drizzle ORM + postgres | 类型安全查询、迁移 |
| 请求校验 | Zod | Schema 验证 |
| 认证 | jose（JWT）+ bcryptjs | 双 Token 机制 |
| 异步队列 | BullMQ + @redis/client | 图片处理队列 |
| 图片处理 | Sharp | WebP 缩略图 |
| 文件上传 | Multer | 图片/JSON |
| **通知总线** | **Node.js EventEmitter** | **进程内事件解耦** |
| 前端框架 | Vue 3 + Vite + TypeScript | SPA |
| 状态管理 | Pinia | Store |
| 路由 | Vue Router 4 | 嵌套路由 |
| 样式 | Tailwind CSS + CSS 变量 | 主题系统 |
| 富文本 | Tiptap v2 | 块级编辑器 |
| HTTP 客户端 | Axios | 自动刷新 Token |
| 云数据库 | Neon PostgreSQL | 生产环境 |
| 云缓存 | Upstash Redis（TLS） | Token + 队列 |

---

## 六、迭代优先级总结

```
立即可做（无阻塞依赖）
├── N-1: 里程碑 ↔ 时间轴跳转高亮
├── N-2: CP 封面图片上传
└── N-8: 操作日志前端界面

短期（需少量新增）
├── N-3: SSE 实时通知推送
├── N-4: 事件关联
└── N-5: 全局搜索

长期规划
├── N-6: 导出格式扩展（Markdown/CSV）
├── N-7: 站外推送（Web Push/邮件）
├── N-9: 事件模板
├── N-10: 多语言 i18n
├── N-11: PWA 离线优化
└── N-12: AI 辅助功能
```
