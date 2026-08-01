import { useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { Stepper } from './Stepper'
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
  const [draft, setDraft] = useState<Record<number, { reps: number; weight: number }>>({})

  function draftFor(num: number) {
    const existing = getSet(num)
    return draft[num] ?? { reps: existing?.reps_done ?? targetReps, weight: existing?.weight_kg ?? lastWeight ?? 0 }
  }

  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, padding: spacing.sm, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      {Array.from({ length: totalSets }, (_, i) => i + 1).map(num => {
        const set = getSet(num)
        const isChecked = set?.completed === 1
        const d = draftFor(num)
        return (
          <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: isChecked ? colors.greenDim : 'transparent', borderRadius: radius.sm, padding: isChecked ? spacing.xs : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textSecondary }}>
              <span>Satz {num}</span>
              {isChecked && <span style={{ color: colors.green }}>✓ erledigt</span>}
            </div>
            <div style={{ display: 'flex', gap: spacing.xs }}>
              <div style={{ flex: 1 }}>
                <Stepper value={d.reps} unit="Wdh" step={1} onChange={v => {
                  setDraft(p => ({ ...p, [num]: { ...d, reps: v } }))
                  onSetChange(num, v, d.weight, isChecked)
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <Stepper value={d.weight} unit="kg" step={2.5} onChange={v => {
                  setDraft(p => ({ ...p, [num]: { ...d, weight: v } }))
                  onSetChange(num, d.reps, v, isChecked)
                }} />
              </div>
            </div>
            <button
              style={{ background: isChecked ? colors.green : colors.cardAlt, color: isChecked ? colors.black : colors.textPrimary, borderRadius: radius.sm, padding: spacing.sm, fontWeight: 700, fontSize: 12 }}
              onClick={() => onSetChange(num, d.reps, d.weight, !isChecked)}
            >{isChecked ? '✓ Satz abgeschlossen' : 'Satz abschließen'}</button>
          </div>
        )
      })}
    </div>
  )
}
