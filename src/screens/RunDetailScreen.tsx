import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { colors, spacing, radius } from '../theme/colors'
import { logSessionComplete } from '../db/queries/sessions'

interface RouteState { title: string; duration: number; zone: string | null; pace: string | null; notes: string | null }

function parseRunSteps(notes: string | null, zone: string | null, pace: string | null, duration: number): { label: string; detail: string }[] {
  const steps: { label: string; detail: string }[] = []
  const paceSuffix = pace ? ` · Pace: ${pace}` : ''
  steps.push({ label: 'Einlaufen', detail: '10 Min locker · <130 bpm' })
  if (!notes) {
    steps.push({ label: 'Hauptblock', detail: `${Math.max(10, duration - 20)} Min${zone ? ` · ${zone}` : ''}${paceSuffix}` })
  } else {
    const n = notes.trim()
    if (n.match(/\dx\d/)) steps.push({ label: 'Hauptblock', detail: `${n}${paceSuffix}` })
    else if (n.match(/HIIT/i)) steps.push({ label: 'HIIT Block', detail: `${n.replace(/^HIIT:?\s*/i, '')}${paceSuffix}` })
    else if (n.match(/Fahrtspiel/i)) steps.push({ label: 'Fahrtspiel', detail: `${n.replace(/^Fahrtspiel:?\s*/i, '')}${paceSuffix}` })
    else if (n.match(/DELOAD/i)) steps.push({ label: 'Deload-Lauf', detail: `${n.replace(/^DELOAD:?\s*/i, '')}${paceSuffix}` })
    else steps.push({ label: 'Hauptblock', detail: `${Math.max(10, duration - 20)} Min · ${n}${paceSuffix}` })
  }
  steps.push({ label: 'Auslaufen', detail: '10 Min sehr locker · <120 bpm' })
  return steps
}

export function RunDetailScreen() {
  const navigate = useNavigate()
  const { sessionId, date } = useParams<{ sessionId: string; date: string }>()
  const location = useLocation()
  const { title, duration, zone, pace, notes } = (location.state ?? {}) as RouteState
  const [rpe, setRpe] = useState<number | null>(null)
  const [done, setDone] = useState(false)

  const steps = parseRunSteps(notes, zone, pace, duration ?? 0)

  async function handleFinish() {
    if (!rpe) { alert('Bitte bewerte die Intensität (1–10)'); return }
    await logSessionComplete(Number(sessionId), date!, rpe, duration)
    setDone(true)
    setTimeout(() => navigate(-1), 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <button onClick={() => navigate(-1)} style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>← Zurück</button>

      <div style={{ fontSize: 26, fontWeight: 900, color: colors.textPrimary }}>{title ?? 'Laufen'}</div>
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' as const }}>
        {(['🏃 Laufen', `⏱ ${duration} Min`, zone ? `❤️ ${zone}` : null, pace ? `⚡ ${pace}` : null] as (string | null)[]).filter(Boolean).map((b, i) => (
          <span key={i} style={{ background: colors.card, padding: `${spacing.xs}px ${spacing.md}px`, borderRadius: radius.full, fontSize: 13 }}>{b}</span>
        ))}
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>Trainingsplan</div>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: spacing.md, paddingBottom: i < steps.length - 1 ? spacing.md : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: i === 0 ? colors.green : i === steps.length - 1 ? colors.indigo : colors.textSecondary, marginTop: 3, flexShrink: 0 }} />
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: colors.border, marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: spacing.sm }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{step.label}</div>
              <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{step.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {notes && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderLeft: `3px solid ${colors.green}` }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>Hinweis</div>
          <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.6 }}>{notes}</div>
        </div>
      )}

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Intensität nach dem Lauf (RPE 1–10)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              style={{ width: 42, height: 42, borderRadius: radius.md, background: rpe === n ? colors.green : colors.card, color: rpe === n ? colors.black : colors.textSecondary, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `1px solid ${colors.border}` }}
              onClick={() => setRpe(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      <button
        style={{ background: done ? colors.green : colors.indigo, borderRadius: radius.lg, padding: spacing.lg, fontSize: 16, fontWeight: 700, color: colors.white, cursor: 'pointer', border: 'none' }}
        onClick={handleFinish}
      >{done ? '✓ Gespeichert' : 'Training abschließen'}</button>
    </div>
  )
}
