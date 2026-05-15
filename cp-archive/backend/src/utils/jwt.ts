/**
 * JWT 工具
 * 使用 jose 库，支持 RS256 或 HS256
 * Access Token: 15min，Refresh Token: 7d（存 Redis）
 */

import { SignJWT, jwtVerify } from 'jose'
import { getConfig } from '../config/index.js'
import type { UserRole } from '../db/schema/users.js'

export interface JwtPayload {
  userId: string
  role:   UserRole
}

function getAccessSecret(): Uint8Array {
  return new TextEncoder().encode(getConfig().JWT_SECRET)
}

function getRefreshSecret(): Uint8Array {
  return new TextEncoder().encode(getConfig().JWT_REFRESH_SECRET)
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getAccessSecret())
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getRefreshSecret())
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret())
  return payload as unknown as JwtPayload
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, getRefreshSecret())
  return payload as { userId: string }
}
