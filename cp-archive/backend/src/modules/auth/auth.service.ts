import { eq, and, isNull } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { users, invitations, cpMembers, cps, cpAdminQuota } from '../../db/schema/index.js'
import { UnauthorizedError, NotFoundError, ConflictError, ValidationError } from '../../shared/errors.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js'
import { hashPassword, verifyPassword } from '../../utils/hash.js'
import { getRedis } from '../../utils/redis.js'
import { emitNotification } from '../../shared/notification.emitter.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 天（秒）

function refreshKey(userId: string) {
  return `refresh:${userId}`
}

function buildUserPublic(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...publicUser } = user
  return publicUser
}

/** 查询用户的 CP 成员关系（用于 me 接口返回） */
async function getCpMemberships(userId: string) {
  const db = getDb()
  const rows = await db
    .select({
      cpId:   cpMembers.cpId,
      cpName: cps.name,
      cpRole: cpMembers.cpRole,
    })
    .from(cpMembers)
    .innerJoin(cps, eq(cpMembers.cpId, cps.id))
    .where(eq(cpMembers.userId, userId))
  return rows
}

export async function login(data: LoginInput) {
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.username, data.username))

  // 无论用户是否存在，都执行 bcrypt 比较，消除响应时序差异，防止用户名枚举攻击。
  // 若用户不存在，使用一个预计算的虚假 hash（bcrypt 格式合法，但永远不匹配）。
  const DUMMY_HASH = '$2b$12$invalidhashfortimingattttttttttttttttttttttt'
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH
  const valid = await verifyPassword(data.password, hashToCompare)

  // 统一错误消息，不区分"用户不存在"和"密码错误"
  if (!user || !user.isActive || !valid) {
    throw new UnauthorizedError('用户名或密码错误')
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ userId: user.id, role: user.role }),
    signRefreshToken(user.id),
  ])

  // 存 Refresh Token 到 Redis
  const redis = await getRedis()
  await redis.setEx(refreshKey(user.id), REFRESH_TOKEN_TTL, refreshToken)

  const cpMemberships = await getCpMemberships(user.id)

  return { accessToken, refreshToken, user: { ...buildUserPublic(user), cpMemberships } }
}

export async function refresh(cookieRefreshToken: string) {
  let payload: { userId: string }
  try {
    payload = await verifyRefreshToken(cookieRefreshToken)
  } catch {
    throw new UnauthorizedError('Invalid refresh token')
  }

  const redis = await getRedis()
  const stored = await redis.get(refreshKey(payload.userId))

  if (!stored || stored !== cookieRefreshToken) {
    throw new UnauthorizedError('Refresh token expired or revoked')
  }

  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId))
  if (!user || !user.isActive) throw new UnauthorizedError('User not found')

  const accessToken = await signAccessToken({ userId: user.id, role: user.role })
  return { accessToken }
}

export async function logout(userId: string) {
  const redis = await getRedis()
  await redis.del(refreshKey(userId))
}

export async function register(data: RegisterInput) {
  const db = getDb()

  // ── 验证邀请码 ───────────────────────────────────────────────────────
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.code, data.inviteCode))

  if (!invite) throw new ValidationError('邀请码无效或已使用')
  if (invite.useCount >= invite.maxUses) throw new ValidationError('邀请码已使用完毕')
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new ValidationError('邀请码已过期')

  // ── 检查用户名/邮箱唯一性 ────────────────────────────────────────────
  const [existUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, data.username))
  if (existUser) throw new ConflictError('用户名已被使用')

  const [existEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
  if (existEmail) throw new ConflictError('邮箱已被注册')

  const passwordHash = await hashPassword(data.password)

  // ── 确定注册用户的全站角色 ───────────────────────────────────────────
  // CP 绑定邀请码（cp_admin 生成）→ 强制 editor 角色
  // 全站邀请码（owner/admin 生成）→ 使用邀请码中指定的角色
  const userRole = invite.cpId ? 'editor' : invite.role

  const [user] = await db
    .insert(users)
    .values({
      username:     data.username,
      email:        data.email,
      passwordHash,
      role:         userRole,
    })
    .returning()

  // ── 更新邀请码使用计数 ───────────────────────────────────────────────
  await db.update(invitations)
    .set({
      useCount: invite.useCount + 1,
      usedBy:   invite.maxUses === 1 ? user.id : invite.usedBy, // maxUses=1 时记录使用者
    })
    .where(eq(invitations.code, data.inviteCode))

  // ── CP 绑定邀请码：自动加入 cp_members ──────────────────────────────
  if (invite.cpId) {
    await db.insert(cpMembers).values({
      cpId:      invite.cpId,
      userId:    user.id,
      cpRole:    'editor',
      grantedBy: invite.createdBy ?? undefined,
    })

    // 扣减 cp_admin 配额（用 SQL 表达式避免并发问题）
    if (invite.createdBy) {
      const { sql } = await import('drizzle-orm')
      await db.update(cpAdminQuota)
        .set({ inviteUsed: sql`invite_used + 1` })
        .where(
          and(
            eq(cpAdminQuota.userId, invite.createdBy),
            eq(cpAdminQuota.cpId, invite.cpId),
          ),
        )
    }

    // 发布邀请加入通知
    emitNotification({
      type:       'member:joined',
      cpId:       invite.cpId,
      actorId:    user.id,       // 新成员自身触发（邀请人不排除，他们会收到通知）
      entityId:   user.id,
      entityType: 'user',
      title:      `新成员通过邀请码加入`,
      body:       `${user.username} 已加入`,
    })
  }

  return buildUserPublic(user)
}

export async function getMe(userId: string) {
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user) throw new NotFoundError('User', userId)

  const cpMemberships = await getCpMemberships(userId)
  return { ...buildUserPublic(user), cpMemberships }
}
