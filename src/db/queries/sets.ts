import Dexie from 'dexie'
import { db, type LoggedSet } from '../dexie'

export type { LoggedSet }

export async function getSetsForExerciseOnDate(exerciseId: number, logDate: string): Promise<LoggedSet[]> {
  return db.logged_sets
    .where('[exercise_id+log_date+set_number]')
    .between([exerciseId, logDate, Dexie.minKey], [exerciseId, logDate, Dexie.maxKey])
    .sortBy('set_number')
}

export async function getLastWeightForExercise(exerciseId: number): Promise<number | null> {
  const rows = await db.logged_sets
    .where('exercise_id').equals(exerciseId)
    .filter(s => s.weight_kg !== null)
    .reverse()
    .sortBy('log_date')
  return rows[0]?.weight_kg ?? null
}

export async function upsertSet(
  exerciseId: number, logDate: string, setNumber: number,
  repsDone: number | null, weightKg: number | null, completed: boolean,
): Promise<void> {
  const existing = await db.logged_sets
    .where('[exercise_id+log_date+set_number]')
    .equals([exerciseId, logDate, setNumber])
    .first()
  if (existing?.id !== undefined) {
    await db.logged_sets.update(existing.id, { reps_done: repsDone, weight_kg: weightKg, completed: completed ? 1 : 0 })
  } else {
    await db.logged_sets.add({ exercise_id: exerciseId, log_date: logDate, set_number: setNumber, reps_done: repsDone, weight_kg: weightKg, completed: completed ? 1 : 0 })
  }
}
