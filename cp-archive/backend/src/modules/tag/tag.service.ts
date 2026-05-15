import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { tags } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import type { CreateTagInput, UpdateTagInput } from './tag.schema.js'

export async function listTags() {
  return getDb().select().from(tags).orderBy(tags.name)
}

export async function createTag(data: CreateTagInput, createdBy?: string) {
  const [tag] = await getDb().insert(tags).values({ ...data, createdBy: createdBy ?? null }).returning()
  return tag
}

export async function updateTag(id: string, data: UpdateTagInput) {
  const [tag] = await getDb().update(tags).set(data).where(eq(tags.id, id)).returning()
  if (!tag) throw new NotFoundError('Tag', id)
  return tag
}

export async function deleteTag(id: string) {
  const [tag] = await getDb().delete(tags).where(eq(tags.id, id)).returning()
  if (!tag) throw new NotFoundError('Tag', id)
}
