import { hrvTrendRule, thresholdShiftRule, racePredictionRule, loadTrendRule } from './rules'
import type { Insight, InsightSeverity } from './types'

const RULES = [hrvTrendRule, thresholdShiftRule, racePredictionRule, loadTrendRule]
const SEVERITY_ORDER: Record<InsightSeverity, number> = { attention: 0, positive: 1, info: 2 }

export async function runInsightEngine(today = new Date().toISOString().split('T')[0]): Promise<Insight[]> {
  const results = await Promise.all(
    RULES.map(rule => rule(today).catch(e => { console.error('[insights] Regel fehlgeschlagen:', e); return null })),
  )
  return results
    .filter((r): r is Insight => r !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
