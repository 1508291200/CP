/**
 * Auth Service — D1 + KV 版本
 *
 * 变更摘要（相比原 Node.js 版本）：
 * - Redis → Cloudflare KV（kv-session.ts 封装）
 * - cpAdminQuota / 配额系统：原版 PG 专属，D1 版暂不实现
 * - emitNotification：原版用 PostgreSQL LISTEN，D1 版跳过（前端轮询）
 */
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { users, invitations, cpMembers } from '../../db/schema/index.js'
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors.js'
import { signAccessToken, signRefreshToken, verifyToken } from '../../utils/jwt.js'
import { hashPassword, verifyPassword } from '../../utils/hash.js'
import {
  setRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '../../utils/kv-session.js'
import { newId, nowSec, fromSec } from '../../utils/id.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'
import type { Env } from '../../types/env.js'

// 脱敏：去掉 passwordHash
function buildUserPublic(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...pub } = user
  return pub
}

/** 查询用户所属 CP */
async function getCpMemberships(db: ReturnType<typeof getDb>, userId: string) {
  const { cps } = await import('../../db/schema/index.js')
  return db
    .select({ cpId: cpMembers.cpId, cpName: cps.name, cpRole: cpMembers.role })
    .from(cpMembers)
    .innerJoin(cps, eq(cpMembers.cpId, cps.id))
    .where(eq(cpMembers.userId, userId))
}

// ── 防时序枚举攻击用的虚假 hash ─────────────────────────────────────────────
const DUMMY_HASH = '$2b$12$invaliddummyhashfortimingattttttttttttttttttt'

export async function login(data: LoginInput, env: Env) {
  const db = getDb(env.DB)
  const [user] = await db.select().from(users).where(eq(users.username, data.username))

  const hashToCompare = user?.passwordHash ?? DUMMY_HASH
  const valid = await verifyPassword(data.password, hashToCompare)

  if (!user || !user.isActive || !valid) {
    throw new UnauthorizedError('用户名或密码错误')
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ userId: user.id, role: user.role as never }, env.JWT_SECRET),
    signRefreshToken({ userId: user.id, role: user.role as never }, env.JWT_REFRESH_SECRET),
  ])

  // 存 KV
  await setRefreshToken(env.KV, refreshToken, user.id)

  const cpMemberships = await getCpMemberships(db, user.id)
  return { accessToken, refreshToken, user: { ...buildUserPublic(user), cpMemberships } }
}

export async function refresh(cookieRefreshToken: string, env: Env) {
  let payload: { userId: string; role: string }
  try {
    payload = await verifyToken(cookieRefreshToken, env.JWT_REFRESH_SECRET)
  } catch {
    throw new UnauthorizedError('refresh token 无效')
  }

  // KV 校验（防止 token 被撤销）
  const stored = await getRefreshToken(env.KV, cookieRefreshToken)
  if (!stored || stored !== payload.userId) {
    throw new UnauthorizedError('refresh token 已失效')
  }

  const db = getDb(env.DB)
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId))
  if (!user || !user.isActive) throw new UnauthorizedError('用户不存在')

  const accessToken = await signAccessToken(
    { userId: user.id, role: user.role as never },
    env.JWT_SECRET,
  )
  return { accessToken }
}

export async function logout(refreshToken: string, env: Env) {
  await deleteRefreshToken(env.KV, refreshToken)
}

export async function register(data: RegisterInput, env: Env) {
  const db = getDb(env.DB)
  const now = fromSec(nowSec())

  // 验证邀请码
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.code, data.inviteCode))

  if (!invite) throw new ValidationError('邀请码无效')
  if (invite.useCount >= invite.maxUses) throw new ValidationError('邀请码已使用完毕')
  if (invite.expiresAt && invite.expiresAt < now) throw new ValidationError('邀请码已过期')

  // 唯一性校验
  const [existUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, data.username))
  if (existUser) throw new ConflictError('用户名已被使用')

  const [existEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email))
  if (existEmail) throw new ConflictError('邮箱已被注册')

  const passwordHash = await hashPassword(data.password)
  const userRole = invite.cpId ? 'editor' : invite.role
  const userId = newId()

  // D1 不支持 .returning()，拆分为 insert + select
  await db.insert(users).values({
    id:           userId,
    username:     data.username,
    email:        data.email,
    passwordHash,
    role:         userRole,
    isActive:     true,
    createdAt:    now,
    updatedAt:    now,
  })

  // 更新邀请码使用计数
  await db.update(invitations)
    .set({
      useCount: invite.useCount + 1,
      usedBy:   invite.maxUses === 1 ? userId : invite.usedBy ?? null,
    })
    .where(eq(invitations.code, data.inviteCode))

  // CP 绑定邀请码：自动加入 cp_members
  if (invite.cpId) {
    await db.insert(cpMembers).values({
      id:        newId(),
      cpId:      invite.cpId,
      userId,
      role:      'editor',
      createdAt: now,
    })
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user) throw new Error('用户创建失败')
  return buildUserPublic(user)
}

export async function getMe(userId: string, env: Env) {
  const db = getDb(env.DB)
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user) throw new NotFoundError('用户', userId)

  const cpMemberships = await getCpMemberships(db, userId)
  return { ...buildUserPublic(user), cpMemberships }
}
