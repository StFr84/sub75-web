import { db } from '../dexie'

export type HrvStatus = 'green' | 'yellow' | 'red' | 'none'

export async function getHrvForDate(logDate: string): Promise<number | null> {
  const row = await db.hrv_logs.where('log_date').equals(logDate).first()
  return row?.hrv_ms ?? null
}

export async function setHrvForDate(logDate: string, hrvMs: number): Promise<void> {
  const existing = await db.hrv_logs.where('log_date').equals(logDate).first()
  if (existing?.id !== undefined) {
    await db.hrv_logs.update(existing.id, { hrv_ms: hrvMs })
  } else {
    await db.hrv_logs.add({ log_date: logDate, hrv_ms: hrvMs })
  }
}

export async function getRecentHrv(days = 30): Promise<{ log_date: string; hrv_ms: number }[]> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  return db.hrv_logs.where('log_date').aboveOrEqual(cutoff).sortBy('log_date')
}

export async function getHrvStatus(logDate: string): Promise<{ status: HrvStatus; value: number | null; weekMean: number | null }> {
  const recent = await getRecentHrv(8)
  const todayRow = recent.find(r => r.log_date === logDate)
  const priorDays = recent.filter(r => r.log_date !== logDate).slice(-7)
  const weekMean = priorDays.length ? priorDays.reduce((s, r) => s + r.hrv_ms, 0) / priorDays.length : null
  if (!todayRow) return { status: 'none', value: null, weekMean }
  if (weekMean === null) return { status: 'green', value: todayRow.hrv_ms, weekMean: null }
  const deviation = (todayRow.hrv_ms - weekMean) / weekMean
  const status: HrvStatus = deviation >= 0 ? 'green' : deviation >= -0.10 ? 'yellow' : 'red'
  return { status, value: todayRow.hrv_ms, weekMean }
}
