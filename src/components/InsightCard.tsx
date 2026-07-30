import { colors, spacing, radius } from '../theme/colors'
import type { Insight } from '../insights/types'

const SEVERITY_COLOR: Record<Insight['severity'], string> = {
  positive: colors.green,
  attention: colors.yellow,
  info: colors.blue,
}
const SEVERITY_ICON: Record<Insight['severity'], string> = {
  positive: '↗',
  attention: '!',
  info: 'i',
}

interface Props {
  insight: Insight
  onDismiss: (id: string) => void
}

export function InsightCard({ insight, onDismiss }: Props) {
  const color = SEVERITY_COLOR[insight.severity]
  return (
    <div style={{ background: colors.card, borderRadius: radius.md, borderLeft: `3px solid ${color}`, padding: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <span style={{ width: 20, height: 20, borderRadius: radius.full, background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
          {SEVERITY_ICON[insight.severity]}
        </span>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, flex: 1 }}>{insight.title}</div>
        <button
          onClick={() => onDismiss(insight.id)}
          aria-label="Verwerfen"
          style={{ background: 'transparent', border: 'none', color: colors.textSecondary, fontSize: 14, padding: 4, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.4 }}>{insight.message}</div>
      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
        {insight.metric.label}: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{insight.metric.current} {insight.metric.unit}</span>
        {' · Basis '}{insight.metric.baseline} {insight.metric.unit}
      </div>
    </div>
  )
}
