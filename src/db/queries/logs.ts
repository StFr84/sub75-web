import { db, type SessionLog } from '../dexie'

export type { SessionLog }

export async function getRecentSessionLogs(limitDays = 30): Promise<SessionLog[]> {
  const cutoff = new Date(Date.now() - limitDays * 86400000).toISOString().split('T')[0]
  return db.session_logs.where('log_date').aboveOrEqual(cutoff).reverse().sortBy('log_date')
}

export async function isSessionCompleted(sessionId: number, logDate: string): Promise<boolean> {
  const log = await db.session_logs
    .where('[session_id+log_date]')
    .equals([sessionId, logDate])
    .first()
  return !!log
}
