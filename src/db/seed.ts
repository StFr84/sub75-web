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
// (real logged training history) are never touched here.
//
// IMPORTANT (incident 2026-08-01): this matching previously also DELETED
// sessions/exercises it considered "stale" (unmatched + no logged history).
// On a real device the match silently failed for effectively the whole plan
// (root cause not fully pinned down — suspected original_day drift from an
// earlier plan restructure), which caused a full rebuild with fresh ids and
// deleted a week's worth of real session_logs/logged_sets before the "has
// logs" check ever got a chance to protect them, because the *new* rows created
// during the same reseed don't carry the old logs and the count check ran
// against the (now-diverged) old rows. Given matching has proven unreliable in
// practice, deletion is no longer attempted at all — an unmatched old row is
// just left in place (inert clutter, never data loss) instead of being
// removed. Never reintroduce a delete path here without a much stronger
// matching guarantee than week+day+type.
export async function seedIfNeeded(): Promise<void> {
  const meta = await db.user_meta.get('plan_version')
  if (meta?.value === PLAN_VERSION) return

  await db.transaction('rw', [db.sessions, db.exercises, db.session_logs, db.logged_sets, db.user_meta], async () => {
    const existing = await db.sessions.toArray()
    // type ist Teil des Schlüssels, weil ein Tag jetzt zwei Sessions haben kann
    // (Haupteinheit + Mobility).
    const byKey = new Map(existing.map(s => [`${s.week}-${s.original_day ?? s.day}-${s.type}`, s]))

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
          await db.sessions.update(match.id!, fields)

          const existingExercises = await db.exercises.where('session_id').equals(match.id!).toArray()
          const existingByName = new Map(existingExercises.map(ex => [ex.name, ex]))
          for (const ex of session.exercises ?? []) {
            const existingEx = existingByName.get(ex.name)
            if (existingEx) {
              await db.exercises.update(existingEx.id!, { sets: ex.sets, reps: ex.reps, hint: ex.hint ?? null })
            } else {
              await db.exercises.add({ session_id: match.id!, name: ex.name, sets: ex.sets, reps: ex.reps, hint: ex.hint ?? null })
            }
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

    await db.user_meta.put({ key: 'plan_version', value: PLAN_VERSION })
  })
}
