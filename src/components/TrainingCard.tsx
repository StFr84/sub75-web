import { useNavigate } from 'react-router-dom'
import { colors, spacing, radius } from '../theme/colors'
import type { Session } from '../db/queries/sessions'

interface Props {
  session: Session
  isCompleted?: boolean
  date: string
}

const TYPE_COLOR: Record<string, string> = {
  run: colors.blue, strength: colors.indigo, rest: colors.textSecondary, mobility: colors.yellow,
}
const TYPE_LABEL: Record<string, string> = {
  run: 'Laufen', strength: 'Kraft', rest: 'Ruhe', mobility: 'Mobility',
}

export function TrainingCard({ session, isCompleted, date }: Props) {
  const navigate = useNavigate()
  const accent = isCompleted ? colors.green : (TYPE_COLOR[session.type] ?? colors.textSecondary)

  function handleStart() {
    if (session.type === 'strength') {
      navigate(`/workout/${session.id}/${date}`)
    } else if (session.type === 'run') {
      navigate(`/run/${session.id}/${date}`, {
        state: { title: session.title, duration: session.duration_min, zone: session.zone, pace: session.pace, notes: session.notes, intervals: session.intervals }
      })
    } else if (session.type === 'mobility') {
      navigate(`/mobility/${session.id}/${date}`, {
        state: { title: session.title, duration: session.duration_min, notes: session.notes }
      })
    }
  }

  const cardBg = isCompleted ? colors.greenDim : colors.card

  return (
    <div style={{ background: cardBg, borderRadius: radius.md, padding: spacing.md, borderLeft: `3px solid ${accent}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: colors.green, textTransform: 'uppercase', letterSpacing: 1 }}>
          {session.phase} · {TYPE_LABEL[session.type] ?? session.type}
        </span>
        {isCompleted && (
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.black, background: colors.green, padding: '3px 10px', borderRadius: radius.full }}>✓ Erledigt</span>
        )}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>{session.title}</div>
      <div style={{ fontSize: 13, color: colors.textSecondary }}>
        {session.duration_min ? `${session.duration_min} Min` : ''}
        {session.zone ? ` · ${session.zone}` : ''}
      </div>
      {!isCompleted && session.type !== 'rest' && (
        <button
          onClick={handleStart}
          style={{ marginTop: spacing.sm, background: session.type === 'mobility' ? colors.yellow : colors.blue, color: colors.black, borderRadius: radius.sm, padding: spacing.sm, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none' }}
        >
          {session.type === 'mobility' ? 'Mobility starten →' : 'Training starten →'}
        </button>
      )}
      {session.type === 'rest' && (
        <span style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Ruhetag — Erhol dich gut</span>
      )}
    </div>
  )
}
