import { db } from './dexie'
import plan from '../data/plan.json'

const PLAN_VERSION = String((plan as { version?: number }).version ?? 1)

interface PlanExercise { name: string; sets: number; reps: number; hint?: string }
interface PlanSession {
  day: string; type: string; title: string; durationMin: number
  zone?: string; pace?: string; notes?: string; exercises?: PlanExercise[]
}
interface PlanWeek { week: number; phase: string; sessions: PlanSession[] }

// Upserts by (week, original_day) instead of clearing the tables, so existing
// session ids survive a plan_version bump and session_logs/logged_sets (real
// logged training history) are never touched here.
export async function seedIfNeeded(): Promise<void> {
  const meta = await db.user_meta.get('plan_version')
  if (meta?.value === PLAN_VERSION) return

  await db.transaction('rw', [db.sessions, db.exercises, db.user_meta], async () => {
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
          phase: week.phase,
          notes: session.notes ?? null,
        }
        const match = byKey.get(`${week.week}-${session.day}-${session.type}`)
        if (match) {
          await db.sessions.update(match.id!, fields)
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
