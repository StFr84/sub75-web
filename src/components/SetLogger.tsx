import { useRef } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import type { LoggedSet } from '../db/queries/sets'

interface Props {
  totalSets: number
  targetReps: number
  sets: LoggedSet[]
  lastWeight: number | null
  onSetChange: (setNumber: number, reps: number | null, weight: number | null, completed: boolean) => void
}

export function SetLogger({ totalSets, targetReps, sets, lastWeight, onSetChange }: Props) {
  const getSet = (num: number) => sets.find(s => s.set_number === num)
  const liveReps = useRef<Record<number, string>>({})
  const liveWeight = useRef<Record<number, string>>({})

  const cellStyle: React.CSSProperties = { flex: 1, fontSize: 13, color: colors.textPrimary, textAlign: 'center' }
  const inputStyle: React.CSSProperties = { ...cellStyle, background: colors.bg, borderRadius: radius.sm, padding: spacing.xs, border: 'none', outline: 'none', width: '100%' }

  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, padding: spacing.sm, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <div style={{ display: 'flex', gap: spacing.xs }}>
        <div style={{ width: 28, fontSize: 11, color: colors.textSecondary, textAlign: 'center', textTransform: 'uppercase' }}>Satz</div>
        <div style={{ ...cellStyle, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' }}>Wdh</div>
        <div style={{ ...cellStyle, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' }}>kg</div>
        <div style={{ width: 36, fontSize: 11, color: colors.textSecondary, textAlign: 'center', textTransform: 'uppercase' }}>✓</div>
      </div>
      {Array.from({ length: totalSets }, (_, i) => i + 1).map(num => {
        const set = getSet(num)
        const isChecked = set?.completed === 1
        return (
          <div key={num} style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
            <div style={{ width: 28, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{num}</div>
            <input
              style={inputStyle}
              type="number"
              inputMode="numeric"
              defaultValue={set?.reps_done ?? targetReps}
              onChange={e => { liveReps.current[num] = e.target.value }}
              onBlur={() => {
                const reps = Number(liveReps.current[num] ?? set?.reps_done) || null
                const weight = parseFloat(liveWeight.current[num] ?? set?.weight_kg?.toString() ?? '') || null
                onSetChange(num, reps, weight, isChecked)
              }}
            />
            <input
              style={{ ...inputStyle, color: set?.weight_kg ? colors.green : colors.textSecondary }}
              type="number"
              inputMode="decimal"
              placeholder={lastWeight?.toString() ?? '—'}
              defaultValue={set?.weight_kg?.toString() ?? ''}
              onChange={e => { liveWeight.current[num] = e.target.value }}
              onBlur={() => {
                const reps = Number(liveReps.current[num] ?? set?.reps_done) || null
                const weight = parseFloat(liveWeight.current[num] ?? set?.weight_kg?.toString() ?? '') || null
                onSetChange(num, reps, weight, isChecked)
              }}
            />
            <button
              style={{ width: 36, height: 28, borderRadius: radius.sm, background: isChecked ? colors.green : colors.bg, color: isChecked ? colors.black : colors.textSecondary, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
              onClick={() => {
                const reps = Number(liveReps.current[num] ?? set?.reps_done) || null
                const weight = parseFloat(liveWeight.current[num] ?? set?.weight_kg?.toString() ?? '') || null
                onSetChange(num, reps, weight, !isChecked)
              }}
            >✓</button>
          </div>
        )
      })}
    </div>
  )
}
