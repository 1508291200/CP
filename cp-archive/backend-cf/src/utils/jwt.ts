/**
 * JWT 工具（基于 jose，Workers 兼容）
 *
 * accessToken:  短期（15 分钟），Bearer header
 * refreshToken: 长期（7 天），HttpOnly Cookie
 */
import { SignJWT, jwtVerify } from 'jose'
import type { UserRole } from '../db/schema/users.js'

export interface JWTPayload {
  userId: string
  role:   UserRole
}

const ACCESS_EXPIRY  = '15m'
const REFRESH_EXPIRY = '7d'

function enc(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: JWTPayload, secret: string): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRY)
    .sign(enc(secret))
}

export async function signRefreshToken(payload: JWTPayload, secret: string): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(enc(secret))
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, enc(secret))
  return {
    userId: payload['userId'] as string,
    role:   payload['role'] as UserRole,
  }
}

/** 7 天（秒） */
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60
