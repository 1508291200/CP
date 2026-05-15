import { eq, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { milestones } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import type { CreateMilestoneInput, UpdateMilestoneInput } from './milestone.schema.js'

export async function listMilestones(cpId: string) {
  return getDb().select().from(milestones).where(eq(milestones.cpId, cpId)).orderBy(milestones.milestoneDate)
}

export async function createMilestone(cpId: string, data: CreateMilestoneInput) {
  const [ms] = await getDb().insert(milestones).values({ ...data, cpId }).returning()
  return ms
}

export async function updateMilestone(cpId: string, id: string, data: UpdateMilestoneInput) {
  const [ms] = await getDb()
    .update(milestones)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(milestones.id, id), eq(milestones.cpId, cpId)))
    .returning()
  if (!ms) throw new NotFoundError('Milestone', id)
  return ms
}

export async function deleteMilestone(cpId: string, id: string) {
  const [ms] = await getDb()
    .delete(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.cpId, cpId)))
    .returning()
  if (!ms) throw new NotFoundError('Milestone', id)
}
