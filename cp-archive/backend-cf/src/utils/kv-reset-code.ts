/**
 * 密码重置验证码 KV 管理
 *
 * key 格式：
 *   pwd_reset:{email}         → "{code}:{userId}"     TTL = 10 分钟
 *   pwd_reset_token:{token}   → userId                TTL = 15 分钟
 */

const RESET_CODE_TTL  = 10 * 60  // 10 分钟（秒）
const RESET_TOKEN_TTL = 15 * 60  // 15 分钟（秒）

// ── 验证码 ─────────────────────────────────────────────────────────────────

/** 存储密码重置验证码 */
export async function setResetCode(
  kv: KVNamespace,
  email: string,
  code: string,
  userId: string,
): Promise<void> {
  await kv.put(`pwd_reset:${email}`, `${code}:${userId}`, { expirationTtl: RESET_CODE_TTL })
}

/** 查找验证码（不存在或已过期返回 null） */
export async function getResetCode(
  kv: KVNamespace,
  email: string,
): Promise<{ code: string; userId: string } | null> {
  const value = await kv.get(`pwd_reset:${email}`)
  if (!value) return null
  const idx = value.indexOf(':')
  if (idx === -1) return null
  return { code: value.slice(0, idx), userId: value.slice(idx + 1) }
}

/** 删除验证码（验证通过后调用，保证一次性） */
export async function deleteResetCode(
  kv: KVNamespace,
  email: string,
): Promise<void> {
  await kv.delete(`pwd_reset:${email}`)
}

// ── 重置令牌 ───────────────────────────────────────────────────────────────

/** 存储重置令牌（验证码通过后换取，用于最终修改密码） */
export async function setResetToken(
  kv: KVNamespace,
  token: string,
  userId: string,
): Promise<void> {
  await kv.put(`pwd_reset_token:${token}`, userId, { expirationTtl: RESET_TOKEN_TTL })
}

/** 查找重置令牌 → userId（不存在返回 null） */
export async function getResetToken(
  kv: KVNamespace,
  token: string,
): Promise<string | null> {
  return kv.get(`pwd_reset_token:${token}`)
}

/** 删除重置令牌（使用后立即撤销） */
export async function deleteResetToken(
  kv: KVNamespace,
  token: string,
): Promise<void> {
  await kv.delete(`pwd_reset_token:${token}`)
}
