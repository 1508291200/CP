import { eq, and, isNull } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { users, invitations } from '../../db/schema/index.js'
import { UnauthorizedError, NotFoundError, ConflictError, ValidationError } from '../../shared/errors.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js'
import { hashPassword, verifyPassword } from '../../utils/hash.js'
import { getRedis } from '../../utils/redis.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 天（秒）

function refreshKey(userId: string) {
  return `refresh:${userId}`
}

function buildUserPublic(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...publicUser } = user
  return publicUser
}

export async function login(data: LoginInput) {
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.username, data.username))

  if (!user || !user.isActive) throw new UnauthorizedError('用户名或密码错误')

  const valid = await verifyPassword(data.password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('用户名或密码错误')

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ userId: user.id, role: user.role }),
    signRefreshToken(user.id),
  ])

  // 存 Refresh Token 到 Redis
  const redis = await getRedis()
  await redis.setEx(refreshKey(user.id), REFRESH_TOKEN_TTL, refreshToken)

  return { accessToken, refreshToken, user: buildUserPublic(user) }
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

  // 验证邀请码
  const [invite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.code, data.inviteCode),
        isNull(invitations.usedBy),
      ),
    )

  if (!invite) throw new ValidationError('邀请码无效或已使用')
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new ValidationError('邀请码已过期')

  // 检查用户名/邮箱唯一性
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

  const [user] = await db
    .insert(users)
    .values({
      username:     data.username,
      email:        data.email,
      passwordHash,
      role:         invite.role,
    })
    .returning()

  // 标记邀请码已使用
  await db.update(invitations).set({ usedBy: user.id }).where(eq(invitations.code, data.inviteCode))

  return buildUserPublic(user)
}

export async function getMe(userId: string) {
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user) throw new NotFoundError('User', userId)
  return buildUserPublic(user)
}
