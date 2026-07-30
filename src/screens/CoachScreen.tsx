import { useEffect, useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { InsightCard } from '../components/InsightCard'
import { runInsightEngine } from '../insights/engine'
import { getInsightState, markInsightsSeen, dismissInsight } from '../db/queries/insightState'
import type { Insight } from '../insights/types'

export function CoachScreen() {
  const [insights, setInsights] = useState<Insight[] | null>(null)

  useEffect(() => {
    async function load() {
      const computed = await runInsightEngine()
      const state = await getInsightState(computed.map(i => i.id))
      const active = computed.filter(i => !state.get(i.id)?.dismissed)
      setInsights(active)
      await markInsightsSeen(active.map(i => i.id))
    }
    load()
  }, [])

  async function handleDismiss(id: string) {
    await dismissInsight(id)
    setInsights(prev => prev?.filter(i => i.id !== id) ?? prev)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ fontSize: 25, fontWeight: 800, color: colors.textPrimary }}>Coach</div>

      {insights === null && (
        <div style={{ fontSize: 13, color: colors.textSecondary }}>Lädt …</div>
      )}

      {insights !== null && insights.length === 0 && (
        <div style={{ background: colors.card, borderRadius: radius.md, padding: spacing.lg, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: colors.textSecondary }}>
            Noch keine Insights — sobald genug Trainingsdaten vorliegen, meldet sich dein Coach hier.
          </div>
        </div>
      )}

      {insights?.map(i => (
        <InsightCard key={i.id} insight={i} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
