import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { colors, spacing, radius } from '../theme/colors'
import { EXERCISE_INSTRUCTIONS } from '../data/exercise-instructions'
import { getExercisesForSession, logSessionComplete, type Exercise } from '../db/queries/sessions'

interface RouteState { title?: string; duration?: number; notes?: string }

const MOBILITY_RPE = 2

export function MobilityDetailScreen() {
  const navigate = useNavigate()
  const { sessionId, date } = useParams<{ sessionId: string; date: string }>()
  const location = useLocation()
  const { title, duration, notes } = (location.state ?? {}) as RouteState
  const sessionIdNum = Number(sessionId)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    getExercisesForSession(sessionIdNum).then(setExercises)
  }, [sessionIdNum])

  async function handleFinish() {
    await logSessionComplete(sessionIdNum, date!, MOBILITY_RPE, duration)
    setDone(true)
    setTimeout(() => navigate(-1), 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <button onClick={() => navigate(-1)} style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>← Zurück</button>

      <div style={{ fontSize: 26, fontWeight: 900, color: colors.textPrimary }}>{title ?? 'Mobility & Dehnen'}</div>
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' as const }}>
        {(['🧘 Mobility', duration ? `⏱ ${duration} Min` : null] as (string | null)[]).filter(Boolean).map((b, i) => (
          <span key={i} style={{ background: colors.card, padding: `${spacing.xs}px ${spacing.md}px`, borderRadius: radius.full, fontSize: 13 }}>{b}</span>
        ))}
      </div>

      {notes && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderLeft: `3px solid ${colors.yellow}` }}>
          <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.6 }}>{notes}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {exercises.map(ex => {
          const isChecked = checked[ex.id!] ?? false
          const instructions = EXERCISE_INSTRUCTIONS[ex.name]
          return (
            <div
              key={ex.id}
              onClick={() => setChecked(prev => ({ ...prev, [ex.id!]: !prev[ex.id!] }))}
              style={{ background: isChecked ? colors.greenDim : colors.card, borderRadius: radius.md, padding: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.md, cursor: 'pointer' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: radius.sm, background: isChecked ? colors.green : colors.bg, color: isChecked ? colors.black : colors.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, border: `1px solid ${colors.border}` }}>
                {isChecked ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {ex.sets} × {ex.reps >= 60 ? `${Math.round(ex.reps / 60)} Min` : `${ex.reps}s`}{ex.hint ? ` · ${ex.hint}` : ''}
                </div>
                {instructions && (
                  <div style={{ marginTop: 6 }}>
                    {instructions.map((step, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#aaaaaa', lineHeight: 1.5 }}>· {step}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        style={{ background: done ? colors.green : colors.yellow, borderRadius: radius.lg, padding: spacing.lg, fontSize: 16, fontWeight: 700, color: colors.black, cursor: 'pointer', border: 'none' }}
        onClick={handleFinish}
      >{done ? '✓ Gespeichert' : 'Mobility abschließen'}</button>
    </div>
  )
}
