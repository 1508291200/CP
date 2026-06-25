/**
 * KV Session 管理（替代 Redis）
 *
 * key 格式：
 *   refresh:{token}  → userId（TTL = 7天）
 *
 * KV 写次数限制（免费版 1000次/天），refreshToken 仅在登录/刷新时写入，量级低，够用。
 */

const REFRESH_TTL = 7 * 24 * 60 * 60  // 7 天（秒）

/** 存储 refresh token */
export async function setRefreshToken(
  kv: KVNamespace,
  token: string,
  userId: string,
): Promise<void> {
  await kv.put(`refresh:${token}`, userId, { expirationTtl: REFRESH_TTL })
}

/** 查找 refresh token → userId（不存在返回 null） */
export async function getRefreshToken(
  kv: KVNamespace,
  token: string,
): Promise<string | null> {
  return kv.get(`refresh:${token}`)
}

/** 删除 refresh token（登出） */
export async function deleteRefreshToken(
  kv: KVNamespace,
  token: string,
): Promise<void> {
  await kv.delete(`refresh:${token}`)
}
