import { eq, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { characters } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import type { CreateCharacterInput, UpdateCharacterInput } from './character.schema.js'

export async function listCharacters(cpId: string) {
  return getDb().select().from(characters).where(eq(characters.cpId, cpId)).orderBy(characters.sortOrder)
}

export async function createCharacter(cpId: string, data: CreateCharacterInput) {
  const [char] = await getDb().insert(characters).values({ ...data, cpId }).returning()
  return char
}

export async function updateCharacter(cpId: string, id: string, data: UpdateCharacterInput) {
  const [char] = await getDb()
    .update(characters)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(characters.id, id), eq(characters.cpId, cpId)))
    .returning()
  if (!char) throw new NotFoundError('Character', id)
  return char
}

export async function deleteCharacter(cpId: string, id: string) {
  const [char] = await getDb()
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.cpId, cpId)))
    .returning()
  if (!char) throw new NotFoundError('Character', id)
}
