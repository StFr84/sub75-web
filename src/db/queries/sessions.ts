import { db, type Session, type Exercise } from '../dexie'
import { TRAIN_START } from '../../data/constants'

export type { Session, Exercise }

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export function dateToWeekDay(isoDate: string): { week: number; day: string } | null {
  const planStart = TRAIN_START.toISOString().split('T')[0]
  if (isoDate < planStart) return null
  const d = new Date(isoDate)
  const day = DAYS[d.getDay()]
  const diffMs = d.getTime() - TRAIN_START.getTime()
  const week = Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1)
  return { week, day }
}

export async function getSessionForDate(isoDate: string): Promise<Session | null> {
  const wd = dateToWeekDay(isoDate)
  if (!wd) return null
  const result = await db.sessions.where('[week+day]').equals([wd.week, wd.day]).filter(s => s.type !== 'mobility').first()
  return result ?? null
}

export async function getMobilitySessionForDate(isoDate: string): Promise<Session | null> {
  const wd = dateToWeekDay(isoDate)
  if (!wd) return null
  const result = await db.sessions.where('[week+day]').equals([wd.week, wd.day]).filter(s => s.type === 'mobility').first()
  return result ?? null
}

export async function getSessionsForWeek(week: number): Promise<Session[]> {
  return db.sessions.where('week').equals(week).toArray()
}

export async function getSessionById(sessionId: number): Promise<Session | null> {
  const row = await db.sessions.get(sessionId)
  return row ?? null
}

export async function getExercisesForSession(sessionId: number): Promise<Exercise[]> {
  return db.exercises.where('session_id').equals(sessionId).sortBy('id')
}

export async function logSessionComplete(
  sessionId: number,
  logDate: string,
  rpe: number,
  durationActualMin?: number,
  distanceKm?: number,
): Promise<number> {
  return db.session_logs.put({ session_id: sessionId, log_date: logDate, rpe, duration_actual_min: durationActualMin ?? null, distance_km: distanceKm ?? null, notes: null })
}

export async function getCompletedSessionIds(week: number): Promise<number[]> {
  const sessions = await db.sessions.where('week').equals(week).toArray()
  const sessionIds = sessions.map(s => s.id!)
  const logs = await db.session_logs.where('session_id').anyOf(sessionIds).toArray()
  return [...new Set(logs.map(l => l.session_id))]
}

export async function getStreak(): Promise<number> {
  const logs = await db.session_logs.orderBy('log_date').reverse().limit(60).toArray()
  const allDates = new Set(logs.map(l => l.log_date))
  if (!allDates.size) return 0

  let streak = 0
  const now = new Date()
  let current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  for (let i = 0; i < 60; i++) {
    const d = current.toISOString().split('T')[0]
    if (allDates.has(d)) {
      streak++
      current = new Date(current.getTime() - 86400000)
    } else if (i === 0) {
      current = new Date(current.getTime() - 86400000)
    } else {
      const wd = dateToWeekDay(d)
      if (wd) {
        const session = await db.sessions.where('[week+day]').equals([wd.week, wd.day]).filter(s => s.type !== 'mobility').first()
        if (session?.type === 'rest') {
          current = new Date(current.getTime() - 86400000)
          continue
        }
      }
      break
    }
  }
  return streak
}

export async function moveSession(sessionId: number, newDay: string): Promise<void> {
  await db.sessions.update(sessionId, { day: newDay })
}

export async function swapSessionDays(
  sessionId1: number, day1: string,
  sessionId2: number, day2: string,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    await db.sessions.update(sessionId1, { day: day2 })
    await db.sessions.update(sessionId2, { day: day1 })
  })
}
