import { db } from './dexie'
import plan from '../data/plan.json'

const PLAN_VERSION = String((plan as { version?: number }).version ?? 1)

interface PlanExercise { name: string; sets: number; reps: number; hint?: string }
interface PlanSession {
  day: string; type: string; title: string; durationMin: number
  zone?: string; pace?: string; intervals?: { rounds: number; workSec: number; restSec: number }
  notes?: string; exercises?: PlanExercise[]
}
interface PlanWeek { week: number; phase: string; sessions: PlanSession[] }

// Upserts by (week, original_day, type) instead of clearing the tables, so
// existing session ids survive a plan_version bump and session_logs/logged_sets
// (real logged training history) are never touched here. Old rows whose
// (week, day, type) slot no longer exists in the new plan (e.g. a day's type
// changed from strength to rest) are removed only if nothing was ever logged
// against them — otherwise they're left in place so history isn't lost.
export async function seedIfNeeded(): Promise<void> {
  const meta = await db.user_meta.get('plan_version')
  if (meta?.value === PLAN_VERSION) return

  await db.transaction('rw', [db.sessions, db.exercises, db.session_logs, db.logged_sets, db.user_meta], async () => {
    const existing = await db.sessions.toArray()
    // type ist Teil des Schlüssels, weil ein Tag jetzt zwei Sessions haben kann
    // (Haupteinheit + Mobility).
    const byKey = new Map(existing.map(s => [`${s.week}-${s.original_day ?? s.day}-${s.type}`, s]))
    const matchedIds = new Set<number>()

    for (const week of (plan as { weeks: PlanWeek[] }).weeks) {
      for (const session of week.sessions) {
        const fields = {
          type: session.type as 'run' | 'strength' | 'rest' | 'mobility',
          title: session.title,
          duration_min: session.durationMin,
          zone: session.zone ?? null,
          pace: session.pace ?? null,
          intervals: session.intervals ?? null,
          phase: week.phase,
          notes: session.notes ?? null,
        }
        const match = byKey.get(`${week.week}-${session.day}-${session.type}`)
        if (match) {
          matchedIds.add(match.id!)
          await db.sessions.update(match.id!, fields)

          const existingExercises = await db.exercises.where('session_id').equals(match.id!).toArray()
          const existingByName = new Map(existingExercises.map(ex => [ex.name, ex]))
          for (const ex of session.exercises ?? []) {
            const existingEx = existingByName.get(ex.name)
            if (existingEx) {
              existingByName.delete(ex.name)
              await db.exercises.update(existingEx.id!, { sets: ex.sets, reps: ex.reps, hint: ex.hint ?? null })
            } else {
              await db.exercises.add({ session_id: match.id!, name: ex.name, sets: ex.sets, reps: ex.reps, hint: ex.hint ?? null })
            }
          }
          for (const stale of existingByName.values()) {
            const hasLog = await db.logged_sets.where('exercise_id').equals(stale.id!).count()
            if (hasLog === 0) await db.exercises.delete(stale.id!)
          }
          continue
        }
        const sessionId = await db.sessions.add({
          week: week.week,
          day: session.day,
          original_day: session.day,
          ...fields,
        })
        for (const ex of session.exercises ?? []) {
          await db.exercises.add({
            session_id: sessionId as number,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            hint: ex.hint ?? null,
          })
        }
      }
    }

    for (const old of existing) {
      if (matchedIds.has(old.id!)) continue
      const hasLog = await db.session_logs.where('session_id').equals(old.id!).count()
      if (hasLog > 0) continue
      await db.exercises.where('session_id').equals(old.id!).delete()
      await db.sessions.delete(old.id!)
    }

    await db.user_meta.put({ key: 'plan_version', value: PLAN_VERSION })
  })
}
