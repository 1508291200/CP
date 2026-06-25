import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { tags } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import type { CreateTagInput, UpdateTagInput } from './tag.schema.js'
import type { Env } from '../../types/env.js'

export async function listTags(env: Env) {
  return getDb(env.DB).select().from(tags).orderBy(tags.name)
}

export async function createTag(data: CreateTagInput, env: Env, createdBy?: string) {
  const db = getDb(env.DB)
  const id = newId()
  await db.insert(tags).values({ id, ...data, createdBy: createdBy ?? null, createdAt: new Date() })
  const [tag] = await db.select().from(tags).where(eq(tags.id, id))
  return tag!
}

export async function updateTag(id: string, data: UpdateTagInput, env: Env) {
  const db = getDb(env.DB)
  const [exists] = await db.select({ id: tags.id }).from(tags).where(eq(tags.id, id))
  if (!exists) throw new NotFoundError('标签', id)
  await db.update(tags).set(data).where(eq(tags.id, id))
  const [tag] = await db.select().from(tags).where(eq(tags.id, id))
  return tag!
}

export async function deleteTag(id: string, env: Env) {
  const db = getDb(env.DB)
  const [exists] = await db.select({ id: tags.id }).from(tags).where(eq(tags.id, id))
  if (!exists) throw new NotFoundError('标签', id)
  await db.delete(tags).where(eq(tags.id, id))
}
