import { db } from './dexie'
import plan from '../data/plan.json'

const PLAN_VERSION = String((plan as { version?: number }).version ?? 1)

interface PlanExercise { name: string; sets: number; reps: number; hint?: string }
interface PlanSession {
  day: string; type: string; title: string; durationMin: number
  zone?: string; notes?: string; exercises?: PlanExercise[]
}
interface PlanWeek { week: number; phase: string; sessions: PlanSession[] }

export async function seedIfNeeded(): Promise<void> {
  const meta = await db.user_meta.get('plan_version')
  if (meta?.value === PLAN_VERSION) return

  await db.transaction('rw', [db.sessions, db.exercises, db.logged_sets, db.session_logs, db.user_meta], async () => {
    await db.logged_sets.clear()
    await db.session_logs.clear()
    await db.exercises.clear()
    await db.sessions.clear()

    for (const week of (plan as { weeks: PlanWeek[] }).weeks) {
      for (const session of week.sessions) {
        const sessionId = await db.sessions.add({
          week: week.week,
          day: session.day,
          original_day: session.day,
          type: session.type as 'run' | 'strength' | 'rest',
          title: session.title,
          duration_min: session.durationMin,
          zone: session.zone ?? null,
          phase: week.phase,
          notes: session.notes ?? null,
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
