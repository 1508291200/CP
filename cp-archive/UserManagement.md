# CP Archive — 用户管理系统设计文档

> 版本：2.0（CP级权限体系）  
> 最后更新：2026-05-19

---

## 一、角色体系

### 1.1 五级角色结构

```
站长 (owner) > 管理员 (admin) > CP管理员 (cp_admin) > 编辑者 (editor) > 只读 (viewer)
     100              80               60                    40               20
```

| 角色 | 说明 | 邀请码权限 |
|------|------|------------|
| **owner** 站长 | 唯一，系统全权拥有者，初始化时通过 seed 脚本创建 | 无限制（全站） |
| **admin** 管理员 | 全站成员管理，无内容操作边界，由 owner 授权 | 无限制（全站） |
| **cp_admin** CP管理员 | 对特定 CP 有完整编辑权，可管理该 CP 内编辑者，可生成少量邀请码 | 有上限（默认 5 张，针对特定 CP） |
| **editor** 编辑者 | 对被授权 CP 有编辑权限，无成员管理能力 | 无法生成 |
| **viewer** 只读 | 全站只读，无任何编辑能力 | 无法生成 |

### 1.2 核心设计原则

- **CP 管理员和编辑者的权限是 CP 级别的**，不是全站级别的
- 一个用户可以是 CP-A 的 cp_admin，同时是 CP-B 的 editor
- owner / admin 对所有 CP 都有完整权限，不需要单独授权
- 操作者只能管理权重低于自己的用户，且不能授予超过自身的角色

---

## 二、数据模型

### 2.1 users 表

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt, cost=12
  role          user_role NOT NULL DEFAULT 'viewer',
  display_name  VARCHAR(100),
  avatar_url    VARCHAR(500),
  preferences   JSONB DEFAULT '{}',             -- 个人偏好（主题/编辑器等）
  is_active     BOOLEAN NOT NULL DEFAULT true,  -- 软删除标志
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 角色枚举
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'cp_admin', 'editor', 'viewer');
```

`role` 字段表示用户的**全站基础角色**，CP 级别权限通过 `cp_members` 表单独管理。

### 2.2 invitations 表

```sql
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) UNIQUE NOT NULL,    -- crypto.randomBytes(24).hex()
  role        user_role NOT NULL DEFAULT 'editor',
  cp_id       UUID REFERENCES cps(id),        -- NULL=全站邀请，非NULL=绑定特定CP
  created_by  UUID REFERENCES users(id),
  used_by     UUID REFERENCES users(id),       -- 向后兼容，max_uses=1时使用
  max_uses    INTEGER NOT NULL DEFAULT 1,      -- 最大使用次数
  use_count   INTEGER NOT NULL DEFAULT 0,      -- 已使用次数
  expires_at  TIMESTAMPTZ,
  label       VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

邀请码 = 一次性 Token（max_uses=1）或多次使用 Token（max_uses>1）。
注册成功后 `use_count += 1`，达到 `max_uses` 则视为耗尽。

### 2.3 cp_members 表（新增）

```sql
CREATE TABLE cp_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cp_id       UUID NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cp_role     cp_member_role NOT NULL,         -- 'cp_admin' | 'editor'
  granted_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cp_id, user_id)
);

-- CP成员角色枚举（子集）
CREATE TYPE cp_member_role AS ENUM ('cp_admin', 'editor');
```

读取逻辑：
1. 若全站角色为 `owner` 或 `admin` → **直接允许**（相当于所有 CP 的 cp_admin）
2. 否则查 `cp_members` 表，获取该用户在该 CP 的 `cp_role`
3. 无记录 → 只读（viewer）

### 2.4 cp_admin_quota 表（新增）

```sql
CREATE TABLE cp_admin_quota (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cp_id         UUID NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  invite_quota  INTEGER NOT NULL DEFAULT 5,   -- 总配额（owner/admin 可调整）
  invite_used   INTEGER NOT NULL DEFAULT 0,   -- 已使用数量
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## 三、双层权限矩阵

### 3.1 全站级权限（基于 users.role）

| 操作 | owner | admin | cp_admin | editor | viewer |
|------|:-----:|:-----:|:--------:|:------:|:------:|
| cp:create（创建新CP） | ✓ | ✓ | | | |
| cp:delete（删除CP） | ✓ | ✓ | | | |
| member:manage（全站成员管理） | ✓ | ✓ | | | |
| settings:site（站点配置） | ✓ | | | | |
| settings:theme（主题外观） | ✓ | ✓ | | | |
| data:export（导出数据） | ✓ | ✓ | | | |
| data:import（导入数据） | ✓ | ✓ | | | |
| invite:unlimited（无限邀请码） | ✓ | ✓ | | | |
| invite:limited（有限邀请码） | ✓ | ✓ | ✓ | | |
| log:view（操作日志） | ✓ | ✓ | | | |

### 3.2 CP 级权限（基于 cp_members.cp_role，owner/admin 自动通行）

| 操作 | owner/admin（自动） | cp_admin（该CP）| editor（该CP） |
|------|:------------------:|:---------------:|:-------------:|
| cp:update（编辑CP信息） | ✓ | ✓ | |
| event:create | ✓ | ✓ | ✓ |
| event:edit:own | ✓ | ✓ | ✓ |
| event:edit:others | ✓ | ✓ | |
| event:delete:own | ✓ | ✓ | ✓ |
| event:delete:others | ✓ | ✓ | |
| character:edit | ✓ | ✓ | ✓ |
| milestone:create | ✓ | ✓ | ✓ |
| milestone:edit | ✓ | ✓ | |
| milestone:delete | ✓ | ✓ | |
| tag:manage | ✓ | ✓ | |
| history:view:others | ✓ | ✓ | ✓ |
| history:restore | ✓ | ✓ | |
| cp_member:manage（管理CP内成员） | ✓ | ✓ | |
| custom_tab:manage | ✓ | ✓ | |

---

## 四、认证流程

### 4.1 Token 双轨机制

```
┌─────────────────────────────────────────────────────────────┐
│  Access Token (JWT HS256, 15min)                             │
│  → 存内存（前端 ref），每次请求 Authorization: Bearer <token> │
│  → Payload: { userId, role, iat, exp }                       │
├─────────────────────────────────────────────────────────────┤
│  Refresh Token (JWT HS256, 7d)                               │
│  → 存 HttpOnly Cookie（path=/api/v1/auth，防 XSS）           │
│  → 同时存 Redis（key = refresh:{userId}）用于主动吊销         │
│  → 刷新时对比 Redis 存储值，不一致则拒绝（防 Token 被盗用）    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 注册流程

#### 使用全站邀请码（owner/admin 生成，cp_id = NULL）

```
提交 { username, email, password, inviteCode }
  ├─ 验证邀请码：EXISTS + use_count < max_uses + NOT expired
  ├─ 检查 username/email 唯一性
  ├─ bcrypt.hash(password, 12)
  ├─ INSERT users（role 来自邀请码）
  └─ UPDATE invitations SET use_count = use_count + 1
```

注册后无 CP 归属，由 owner/admin 后续授权具体 CP。

#### 使用 CP 绑定邀请码（cp_admin 生成，cp_id ≠ NULL）

```
  ├─ 验证邀请码
  ├─ 注册用户（role 强制为 'editor'）
  ├─ INSERT cp_members { cp_id, user_id, cp_role: 'editor', granted_by }
  ├─ UPDATE invitations SET use_count += 1
  └─ UPDATE cp_admin_quota SET invite_used += 1
```

---

## 五、API 接口清单

### 认证接口（无需鉴权）

| Method | Path | 说明 |
|--------|------|------|
| POST | `/auth/login` | 登录 |
| POST | `/auth/register` | 注册（需邀请码） |
| POST | `/auth/refresh` | 刷新 Token |
| POST | `/auth/logout` | 登出 |
| GET | `/auth/me` | 获取当前用户（含 cpMemberships） |

### 个人信息（需登录）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/users/me` | 获取个人详情（含 cpMemberships） |
| PATCH | `/users/me` | 修改展示名/头像/偏好 |

### 全站用户管理（admin+）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/users` | 列出所有用户（分页/筛选） |
| PATCH | `/users/:id/role` | 修改全站角色 |
| DELETE | `/users/:id` | 停用账号（软删除） |
| POST | `/users/:id/activate` | 重新启用账号 |
| PATCH | `/users/:id/password` | 管理员重置密码 |
| PATCH | `/users/:id/quota` | 调整 cp_admin 邀请码配额（owner/admin） |
| POST | `/users/invite` | 生成全站邀请码 |
| GET | `/users/invitations` | 列出所有邀请码 |
| DELETE | `/users/invitations/:code` | 撤销邀请码 |
| GET | `/users/logs` | 查看操作日志 |

### CP 成员管理

| Method | Path | 说明 | 权限 |
|--------|------|------|------|
| GET | `/cps/:id/members` | 列出 CP 成员 | cp_admin+ |
| POST | `/cps/:id/members` | 添加成员到 CP | owner/admin |
| PATCH | `/cps/:id/members/:userId` | 修改 CP 内角色 | cp_admin+（不超过自身） |
| DELETE | `/cps/:id/members/:userId` | 移除成员 | cp_admin+ |
| POST | `/cps/:id/invite` | CP 内生成邀请码（消耗配额） | cp_admin |
| GET | `/cps/:id/invitations` | 查看本 CP 邀请码 | cp_admin+ |

---

## 六、/users/me 返回结构

```json
{
  "id": "...",
  "username": "alice",
  "role": "editor",
  "displayName": "Alice",
  "avatarUrl": null,
  "preferences": {},
  "isActive": true,
  "cpMemberships": [
    { "cpId": "uuid-1", "cpName": "CP-A", "cpRole": "cp_admin" },
    { "cpId": "uuid-2", "cpName": "CP-B", "cpRole": "editor" }
  ]
}
```

前端 `authStore` 存储 `cpMemberships`，`usePermission` composable 通过 `canInCp(cpId, action)` 判断。

---

## 七、安全措施

| 威胁 | 防护措施 | 状态 |
|------|----------|------|
| 密码泄露 | bcrypt cost=12 | ✅ |
| XSS 窃取 Token | Refresh Token 在 HttpOnly Cookie | ✅ |
| CSRF | Cookie `SameSite=Strict` | ✅ |
| Token 被盗用 | Refresh Token 存 Redis，可主动吊销 | ✅ |
| 越权操作 | 角色权重比较 `canOperate()` | ✅ |
| 邀请码滥用 | 一次性 + 过期时间 + 配额限制 | ✅ |
| 敏感信息泄露 | `buildUserPublic()` 过滤 passwordHash | ✅ |
| 暴力破解登录 | Redis 失败计数器（建议实现） | ⚠️ |
| 账号枚举 | 登录错误信息统一 | ✅ |
| SQL 注入 | Drizzle ORM 参数化查询 | ✅ |
| CP 越权操作 | cpPermissionMiddleware 双层检查 | ✅ |

---

## 八、技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 密码 hash | **bcryptjs** | 纯 JS，cost factor 可调 |
| JWT | **jose** | Web Crypto API 原生，Edge Runtime 兼容 |
| Token 存储 | **Redis** | 支持 TTL + 主动吊销 |
| 权限校验 | **双层静态矩阵** | 全站 + CP 两级，前后端共享定义 |
| 数据验证 | **Zod** | 运行时类型安全，TypeScript 类型生成 |
| DB ORM | **Drizzle ORM** | 类型安全查询，自动防 SQL 注入 |

---

## 九、实现优先级

| 优先级 | 工作 | 影响范围 |
|--------|------|----------|
| 🔴 高 | DB 迁移：枚举变更 + 新建 cp_members/cp_admin_quota | users/invitations 表 |
| 🔴 高 | 双层权限中间件 cpPermissionMiddleware | 新增中间件 |
| 🔴 高 | 注册流程适配 CP 绑定邀请码 | auth.service.ts |
| 🟡 中 | CP 成员管理 API | 新模块 |
| 🟡 中 | cp_admin 邀请码配额检查 | user.service.ts |
| 🟡 中 | /users/me 返回 cpMemberships | auth/user service |
| 🟡 中 | 前端 canInCp() + cpMemberships | usePermission.ts |
| 🟢 低 | 管理员重置密码接口 | user.routes.ts |
| 🟢 低 | 账号重新启用接口 | user.routes.ts |
| 🟢 低 | 前端 CP 成员管理 UI | 前端新页面 |
| 🟢 低 | 配额管理 UI | 前端设置页 |
