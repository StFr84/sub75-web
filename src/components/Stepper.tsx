import { colors, radius } from '../theme/colors'

interface Props {
  value: number
  unit: string
  step: number
  min?: number
  onChange: (value: number) => void
}

export function Stepper({ value, unit, step, min = 0, onChange }: Props) {
  const btnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: radius.sm, background: colors.cardAlt, color: colors.blue,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bg, borderRadius: radius.md, padding: '8px 12px' }}>
      <button style={btnStyle} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: colors.textPrimary }}>{value}</div>
        <div style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase' }}>{unit}</div>
      </div>
      <button style={btnStyle} onClick={() => onChange(value + step)}>+</button>
    </div>
  )
}
