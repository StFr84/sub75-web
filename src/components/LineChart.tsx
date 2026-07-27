import { colors, spacing } from '../theme/colors'

interface Point { label: string; value: number }
interface Props {
  data: Point[]
  color: string
  unit?: string
  formatValue?: (n: number) => string
  height?: number
}

export function LineChart({ data, color, unit = '', formatValue = (n) => n.toFixed(0), height = 120 }: Props) {
  if (data.length === 0) {
    return <div style={{ fontSize: 13, color: colors.textSecondary, padding: spacing.md, textAlign: 'center' }}>Noch keine Daten</div>
  }
  const width = 300
  const padY = 16
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width
    const y = height - padY - ((d.value - min) / range) * (height - padY * 2)
    return { x, y }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = data[data.length - 1]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>{formatValue(last.value)}</span>
        <span style={{ fontSize: 12, color: colors.textSecondary }}>{unit}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3.5 : 0} fill={color} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
        <span>{data[0].label}</span>
        <span>{last.label}</span>
      </div>
    </div>
  )
}
