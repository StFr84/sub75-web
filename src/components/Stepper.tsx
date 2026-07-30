import { useEffect, useState } from 'react'
import { colors, radius } from '../theme/colors'

interface Props {
  value: number
  unit: string
  step: number
  min?: number
  onChange: (value: number) => void
}

export function Stepper({ value, unit, step, min = 0, onChange }: Props) {
  const [text, setText] = useState(String(value))
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => { if (!isFocused) setText(String(value)) }, [value, isFocused])

  function commit(raw: string) {
    const n = parseFloat(raw.replace(',', '.'))
    if (Number.isFinite(n)) onChange(Math.max(min, n))
    else setText(String(value))
  }

  const btnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: radius.sm, background: colors.cardAlt, color: colors.blue,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, border: 'none',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bg, borderRadius: radius.md, padding: '8px 12px' }}>
      <button style={btnStyle} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <div style={{ textAlign: 'center' }}>
        <input
          className="no-spinner"
          type="number"
          inputMode="decimal"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={e => { commit(e.target.value); setIsFocused(false) }}
          style={{
            width: 64, textAlign: 'center', fontSize: 20, fontWeight: 800, color: colors.textPrimary,
            background: 'transparent', border: 'none', outline: 'none',
          }}
        />
        <div style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase' }}>{unit}</div>
      </div>
      <button style={btnStyle} onClick={() => onChange(value + step)}>+</button>
    </div>
  )
}
