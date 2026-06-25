import { eq, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { milestones } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import type { CreateMilestoneInput, UpdateMilestoneInput } from './milestone.schema.js'
import type { Env } from '../../types/env.js'

export async function listMilestones(cpId: string, env: Env) {
  return getDb(env.DB).select().from(milestones).where(eq(milestones.cpId, cpId)).orderBy(milestones.sortOrder)
}

export async function createMilestone(cpId: string, data: CreateMilestoneInput, env: Env) {
  const db = getDb(env.DB)
  const id = newId()
  const now = new Date()
  await db.insert(milestones).values({ id, cpId, ...data, createdAt: now, updatedAt: now })
  const [m] = await db.select().from(milestones).where(eq(milestones.id, id))
  return m!
}

export async function updateMilestone(cpId: string, id: string, data: UpdateMilestoneInput, env: Env) {
  const db = getDb(env.DB)
  await db.update(milestones).set({ ...data, updatedAt: new Date() }).where(and(eq(milestones.id, id), eq(milestones.cpId, cpId)))
  const [m] = await db.select().from(milestones).where(and(eq(milestones.id, id), eq(milestones.cpId, cpId)))
  if (!m) throw new NotFoundError('里程碑', id)
  return m
}

export async function deleteMilestone(cpId: string, id: string, env: Env) {
  const db = getDb(env.DB)
  const [m] = await db.select({ id: milestones.id }).from(milestones).where(and(eq(milestones.id, id), eq(milestones.cpId, cpId)))
  if (!m) throw new NotFoundError('里程碑', id)
  await db.delete(milestones).where(and(eq(milestones.id, id), eq(milestones.cpId, cpId)))
}
