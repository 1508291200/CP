/**
 * UUID 生成（Workers 原生 crypto API）
 */
export function newId(): string {
  return crypto.randomUUID()
}

/** 当前 Unix 秒时间戳 */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

/** 秒时间戳 → Date */
export function fromSec(ts: number): Date {
  return new Date(ts * 1000)
}

/** Date → 秒时间戳 */
export function toSec(d: Date): number {
  return Math.floor(d.getTime() / 1000)
}
