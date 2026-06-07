import { useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { SetLogger } from './SetLogger'
import { EXERCISE_INSTRUCTIONS } from '../data/exercise-instructions'
import type { Exercise } from '../db/queries/sessions'
import type { LoggedSet } from '../db/queries/sets'

interface Props {
  exercise: Exercise
  sets: LoggedSet[]
  lastWeight: number | null
  onSetChange: (setNumber: number, reps: number | null, weight: number | null, completed: boolean) => void
}

export function ExerciseRow({ exercise, sets, lastWeight, onSetChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const doneCount = sets.filter(s => s.completed === 1).length
  const instructions = EXERCISE_INSTRUCTIONS[exercise.name]

  return (
    <div style={{ background: colors.card, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm }}>
      <div
        style={{ display: 'flex', alignItems: 'center', padding: spacing.md, justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>{exercise.name}</div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            {exercise.sets} × {exercise.reps}{exercise.hint ? ` · ${exercise.hint}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {instructions && (
            <button
              style={{ fontSize: 10, color: colors.indigo, background: '#1a1a2e', border: `1px solid ${colors.indigo}`, borderRadius: 20, padding: '3px 8px', fontWeight: 600, cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setShowInfo(v => !v) }}
            >
              ⓘ Anleitung
            </button>
          )}
          <span style={{ fontSize: 12, color: colors.textSecondary }}>{doneCount}/{exercise.sets}</span>
        </div>
      </div>

      {showInfo && instructions && (
        <div style={{ background: '#0f0f2a', borderTop: `1px solid #1e1e6e`, padding: `${spacing.sm}px ${spacing.md}px` }}>
          <div style={{ fontSize: 10, color: colors.indigo, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Ausführung</div>
          <ol style={{ paddingLeft: 16, margin: 0 }}>
            {instructions.map((step, i) => (
              <li key={i} style={{ fontSize: 12, color: '#aaaaaa', lineHeight: 1.6, marginBottom: 2 }}>{step}</li>
            ))}
          </ol>
          {exercise.hint && (
            <div style={{ marginTop: 6, fontSize: 11, color: colors.green }}>💡 Heute: {exercise.hint}</div>
          )}
        </div>
      )}

      {expanded && (
        <SetLogger
          totalSets={exercise.sets}
          targetReps={exercise.reps}
          sets={sets}
          lastWeight={lastWeight}
          onSetChange={onSetChange}
        />
      )}
    </div>
  )
}
