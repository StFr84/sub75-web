import { db } from '../dexie'
import { runInsightEngine } from '../../insights/engine'

export async function getInsightState(ids: string[]): Promise<Map<string, { seen: boolean; dismissed: boolean }>> {
  const rows = await db.insight_state.bulkGet(ids)
  const map = new Map<string, { seen: boolean; dismissed: boolean }>()
  rows.forEach((row, i) => {
    if (row) map.set(ids[i], { seen: !!row.seen, dismissed: !!row.dismissed })
  })
  return map
}

export async function markInsightsSeen(ids: string[]): Promise<void> {
  const existing = await getInsightState(ids)
  await db.insight_state.bulkPut(
    ids.map(id => ({ id, seen: 1, dismissed: existing.get(id)?.dismissed ? 1 : 0 })),
  )
}

export async function dismissInsight(id: string): Promise<void> {
  await db.insight_state.put({ id, seen: 1, dismissed: 1 })
}

export async function getUnseenInsightCount(): Promise<number> {
  const insights = await runInsightEngine()
  const state = await getInsightState(insights.map(i => i.id))
  return insights.filter(i => !state.get(i.id)?.seen && !state.get(i.id)?.dismissed).length
}
