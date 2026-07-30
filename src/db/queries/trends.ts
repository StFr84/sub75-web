import { db } from '../dexie'

export interface TrendPoint { label: string; value: number }

export async function getWeeklyLoad(weeks = 12): Promise<TrendPoint[]> {
  const logs = await db.session_logs.toArray()
  const sessions = await db.sessions.toArray()
  const sessionById = new Map(sessions.map(s => [s.id, s]))
  const byWeek = new Map<number, number>()
  for (const log of logs) {
    const session = sessionById.get(log.session_id)
    if (!session || !log.rpe || !log.duration_actual_min) continue
    const load = log.rpe * log.duration_actual_min
    byWeek.set(session.week, (byWeek.get(session.week) ?? 0) + load)
  }
  const sortedWeeks = [...byWeek.keys()].sort((a, b) => a - b).slice(-weeks)
  return sortedWeeks.map(w => ({ label: `W${w}`, value: Math.round(byWeek.get(w)!) }))
}

export async function getPaceTrend(limit = 10): Promise<TrendPoint[]> {
  const logs = await db.session_logs
    .filter(l => !!l.distance_km && !!l.duration_actual_min && l.distance_km! > 0)
    .sortBy('log_date')
  const recent = logs.slice(-limit)
  return recent.map(l => ({
    label: new Date(l.log_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    value: l.duration_actual_min! / l.distance_km!,
  }))
}

export async function getLoggedExerciseNames(): Promise<string[]> {
  const sets = await db.logged_sets.filter(s => s.weight_kg !== null).toArray()
  const exerciseIds = [...new Set(sets.map(s => s.exercise_id))]
  const exercises = await db.exercises.bulkGet(exerciseIds)
  return [...new Set(exercises.filter((e): e is NonNullable<typeof e> => !!e).map(e => e.name))].sort()
}

export async function getExerciseWeightTrend(exerciseName: string, limit = 15): Promise<TrendPoint[]> {
  const exercises = await db.exercises.where('name').equals(exerciseName).toArray()
  const exerciseIds = new Set(exercises.map(e => e.id))
  const sets = await db.logged_sets
    .filter(s => exerciseIds.has(s.exercise_id) && s.weight_kg !== null)
    .sortBy('log_date')
  const byDate = new Map<string, number>()
  for (const s of sets) {
    byDate.set(s.log_date, Math.max(byDate.get(s.log_date) ?? 0, s.weight_kg!))
  }
  const dates = [...byDate.keys()].sort().slice(-limit)
  return dates.map(d => ({ label: new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), value: byDate.get(d)! }))
}

export async function getSplitConsistencyTrend(limit = 10): Promise<TrendPoint[]> {
  const [logs, allSplits] = await Promise.all([
    db.session_logs.orderBy('log_date').toArray(),
    db.interval_splits.toArray(),
  ])
  const splitsByLog = new Map<number, typeof allSplits>()
  for (const split of allSplits) {
    const list = splitsByLog.get(split.session_log_id)
    if (list) list.push(split)
    else splitsByLog.set(split.session_log_id, [split])
  }
  const points: TrendPoint[] = []
  for (const log of logs) {
    if (!log.id) continue
    const splits = splitsByLog.get(log.id) ?? []
    const times = splits.map(s => s.time_sec).filter((t): t is number => t != null && t > 0)
    if (times.length === 0) continue
    const avgSec = times.reduce((a, b) => a + b, 0) / times.length
    points.push({
      label: new Date(log.log_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      value: avgSec / 60,
    })
  }
  return points.slice(-limit)
}
