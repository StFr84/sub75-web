import { db } from '../dexie'

export interface SplitInput {
  roundNumber: number
  timeSec: number | null
  distanceKm: number | null
}

export async function saveIntervalSplits(sessionLogId: number, splits: SplitInput[]): Promise<void> {
  await db.transaction('rw', db.interval_splits, async () => {
    await db.interval_splits.where('session_log_id').equals(sessionLogId).delete()
    if (splits.length) {
      await db.interval_splits.bulkAdd(
        splits.map(s => ({
          session_log_id: sessionLogId,
          round_number: s.roundNumber,
          time_sec: s.timeSec,
          distance_km: s.distanceKm,
        })),
      )
    }
  })
}
