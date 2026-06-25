import { eq, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { characters } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import type { CreateCharacterInput, UpdateCharacterInput } from './character.schema.js'
import type { Env } from '../../types/env.js'

export async function listCharacters(cpId: string, env: Env) {
  return getDb(env.DB).select().from(characters).where(eq(characters.cpId, cpId)).orderBy(characters.sortOrder)
}

export async function createCharacter(cpId: string, data: CreateCharacterInput, env: Env) {
  const db = getDb(env.DB)
  const id = newId()
  const now = new Date()

  await db.insert(characters).values({
    id,
    cpId,
    ...data,
    aliases:      JSON.stringify(data.aliases ?? []),
    customFields: JSON.stringify(data.customFields ?? []),
    createdAt:    now,
    updatedAt:    now,
  })

  const [char] = await db.select().from(characters).where(eq(characters.id, id))
  return char!
}

export async function updateCharacter(cpId: string, id: string, data: UpdateCharacterInput, env: Env) {
  const db = getDb(env.DB)
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() }
  if (data.aliases)      updateData['aliases']      = JSON.stringify(data.aliases)
  if (data.customFields) updateData['customFields'] = JSON.stringify(data.customFields)

  await db.update(characters).set(updateData).where(and(eq(characters.id, id), eq(characters.cpId, cpId)))
  const [char] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.cpId, cpId)))
  if (!char) throw new NotFoundError('人物', id)
  return char
}

export async function deleteCharacter(cpId: string, id: string, env: Env) {
  const db = getDb(env.DB)
  const [char] = await db.select({ id: characters.id }).from(characters).where(and(eq(characters.id, id), eq(characters.cpId, cpId)))
  if (!char) throw new NotFoundError('人物', id)
  await db.delete(characters).where(and(eq(characters.id, id), eq(characters.cpId, cpId)))
}
