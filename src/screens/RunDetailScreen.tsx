import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { colors, spacing, radius } from '../theme/colors'
import { Timer } from '../components/Timer'
import { logSessionComplete, getSessionLog } from '../db/queries/sessions'
import { saveIntervalSplits, getIntervalSplits, type SplitInput } from '../db/queries/splits'
import { formatMinSec } from '../utils/format'

interface RouteState {
  title: string; duration: number; zone: string | null; pace: string | null; notes: string | null
  intervals?: { rounds: number; workSec: number; restSec: number } | null
}

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

type RoundInputType = 'time' | 'distance' | null

const TIME_MMSS_RE = /^(\d{1,3}):([0-5]?\d)$/

function getRoundInputType(intervals: RouteState['intervals'], notes: string | null): RoundInputType {
  if (intervals && intervals.workSec > 0) return 'distance'
  if (intervals && intervals.rounds > 0) return 'time'
  if (notes && /\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*km/i.test(notes)) return 'time'
  return null
}

function getSuggestedRoundCount(intervals: RouteState['intervals'], notes: string | null): number {
  if (intervals?.rounds) return intervals.rounds
  const match = notes?.match(/(\d+)\s*[x×]/i)
  return match ? Number(match[1]) : 0
}

function parseRoundValue(raw: string, type: 'time' | 'distance'): { timeSec: number | null; distanceKm: number | null } {
  const trimmed = raw.trim()
  if (!trimmed) return { timeSec: null, distanceKm: null }
  if (type === 'time') {
    const m = trimmed.match(TIME_MMSS_RE)
    if (m) return { timeSec: Number(m[1]) * 60 + Number(m[2]), distanceKm: null }
    return { timeSec: null, distanceKm: null }
  }
  const n = parseFloat(trimmed.replace(',', '.'))
  return { timeSec: null, distanceKm: Number.isFinite(n) ? n : null }
}

export function RunDetailScreen() {
  const navigate = useNavigate()
  const { sessionId, date } = useParams<{ sessionId: string; date: string }>()
  const location = useLocation()
  const { title, duration, zone, pace, notes, intervals } = (location.state ?? {}) as RouteState
  const [rpe, setRpe] = useState<number | null>(null)
  const [distance, setDistance] = useState('')
  const [actualDuration, setActualDuration] = useState(duration != null ? String(duration) : '')
  const [done, setDone] = useState(false)
  const [showTimer, setShowTimer] = useState(false)

  const roundInputType = getRoundInputType(intervals, notes)
  const roundIdCounter = useRef(0)
  const [rounds, setRounds] = useState(() =>
    Array.from({ length: getSuggestedRoundCount(intervals, notes) }, () => ({ id: roundIdCounter.current++, value: '' })),
  )

  useEffect(() => {
    if (!sessionId || !date) return
    let cancelled = false
    ;(async () => {
      const log = await getSessionLog(Number(sessionId), date)
      if (!log || cancelled) return
      setRpe(log.rpe)
      setDistance(log.distance_km != null ? String(log.distance_km) : '')
      setActualDuration(log.duration_actual_min != null ? String(log.duration_actual_min) : String(duration ?? ''))
      if (roundInputType && log.id != null) {
        const splits = await getIntervalSplits(log.id)
        if (splits.length && !cancelled) {
          setRounds(splits.map(s => ({
            id: roundIdCounter.current++,
            value: roundInputType === 'time'
              ? (s.time_sec != null ? formatMinSec(s.time_sec / 60) : '')
              : (s.distance_km != null ? String(s.distance_km) : ''),
          })))
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, date])

  function addRound() {
    setRounds(rs => [...rs, { id: roundIdCounter.current++, value: '' }])
  }
  function removeRound(id: number) {
    setRounds(rs => rs.filter(r => r.id !== id))
  }
  function updateRound(id: number, value: string) {
    setRounds(rs => rs.map(r => (r.id === id ? { ...r, value } : r)))
  }

  const steps = parseRunSteps(notes, zone, pace, duration ?? 0)
  const distanceNum = parseFloat(distance)
  const actualDurationNum = parseFloat(actualDuration)
  const livePace = distanceNum > 0 && actualDurationNum > 0 ? actualDurationNum / distanceNum : null

  async function handleFinish() {
    if (!rpe) { alert('Bitte bewerte die Intensität (1–10)'); return }
    if (roundInputType === 'time' && rounds.some(r => r.value.trim() !== '' && !TIME_MMSS_RE.test(r.value.trim()))) {
      alert('Bitte alle Rundenzeiten als mm:ss angeben (z.B. 4:35)')
      return
    }
    const sessionLogId = await logSessionComplete(
      Number(sessionId), date!, rpe,
      actualDurationNum > 0 ? actualDurationNum : duration,
      distanceNum > 0 ? distanceNum : undefined,
    )
    if (roundInputType) {
      const splits: SplitInput[] = rounds
        .map((r, i) => ({ roundNumber: i + 1, ...parseRoundValue(r.value, roundInputType) }))
        .filter(s => s.timeSec !== null || s.distanceKm !== null)
      if (splits.length) await saveIntervalSplits(sessionLogId, splits)
    }
    setDone(true)
    setTimeout(() => navigate(-1), 800)
  }

  if (showTimer && intervals) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, paddingTop: spacing.xl }}>
        <button onClick={() => setShowTimer(false)} style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'left', background: 'none', border: 'none' }}>← Zurück zur Übersicht</button>
        <Timer rounds={intervals.rounds} workSec={intervals.workSec} restSec={intervals.restSec} onDone={() => setShowTimer(false)} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <button onClick={() => navigate(-1)} style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'left', background: 'none', border: 'none' }}>← Zurück</button>

      <div style={{ fontSize: 26, fontWeight: 900, color: colors.textPrimary }}>{title ?? 'Laufen'}</div>
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' as const }}>
        {(['🏃 Laufen', `⏱ ${duration} Min`, zone ? `❤️ ${zone}` : null, pace ? `⚡ ${pace}` : null] as (string | null)[]).filter(Boolean).map((b, i) => (
          <span key={i} style={{ background: colors.card, padding: `${spacing.xs}px ${spacing.md}px`, borderRadius: radius.full, fontSize: 13 }}>{b}</span>
        ))}
      </div>

      {intervals && (
        <button
          style={{ background: colors.blue, color: colors.black, borderRadius: radius.lg, padding: spacing.md, fontWeight: 700, fontSize: 15, border: 'none' }}
          onClick={() => setShowTimer(true)}
        >⏱ Timer starten · {intervals.rounds} Runden</button>
      )}

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column' }}>
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
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Tatsächliche Dauer (Min)</div>
        <input
          type="number" inputMode="decimal" placeholder="z.B. 50" value={actualDuration}
          onChange={e => setActualDuration(e.target.value)}
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm, color: colors.textPrimary, fontSize: 16 }}
        />
        <div style={{ fontSize: 11, color: colors.textSecondary }}>Geplant: {duration} Min · bei Bedarf anpassen</div>
      </div>

      {roundInputType && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
            Runden {roundInputType === 'time' ? '(Zeit mm:ss)' : '(Distanz km)'}
          </div>
          {rounds.map((r, i) => {
            const isTimeInvalid = roundInputType === 'time' && r.value.trim() !== '' && !TIME_MMSS_RE.test(r.value.trim())
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
                  <div style={{ width: 56, fontSize: 13, color: colors.textSecondary }}>Runde {i + 1}</div>
                  <input
                    type="text" inputMode={roundInputType === 'time' ? 'text' : 'decimal'}
                    placeholder={roundInputType === 'time' ? 'z.B. 4:35' : 'z.B. 1.0'}
                    value={r.value}
                    onChange={e => updateRound(r.id, e.target.value)}
                    style={{ flex: 1, background: colors.bg, border: `1px solid ${isTimeInvalid ? colors.red : colors.border}`, borderRadius: radius.sm, padding: spacing.sm, color: colors.textPrimary, fontSize: 15 }}
                  />
                  <button
                    onClick={() => removeRound(r.id)}
                    style={{ width: 28, height: 28, borderRadius: radius.sm, background: colors.cardAlt, color: colors.textSecondary, fontSize: 14, border: 'none' }}
                  >×</button>
                </div>
                {isTimeInvalid && (
                  <div style={{ fontSize: 11, color: colors.red, marginLeft: 56 + spacing.xs }}>Bitte als mm:ss, z.B. 4:35</div>
                )}
              </div>
            )
          })}
          <button
            onClick={addRound}
            style={{ background: colors.cardAlt, color: colors.textPrimary, borderRadius: radius.sm, padding: spacing.sm, fontSize: 13, fontWeight: 600, border: 'none' }}
          >+ Runde hinzufügen</button>
        </div>
      )}

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Distanz gelaufen (km)</div>
        <input
          type="number" inputMode="decimal" placeholder="z.B. 8.4" value={distance}
          onChange={e => setDistance(e.target.value)}
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm, color: colors.textPrimary, fontSize: 16 }}
        />
        {livePace !== null && livePace > 0 && (
          <div style={{ fontSize: 12, color: colors.green }}>≈ {formatMinSec(livePace)} min/km</div>
        )}
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Intensität nach dem Lauf (RPE 1–10)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              style={{ width: 42, height: 42, borderRadius: radius.md, background: rpe === n ? colors.blue : colors.card, color: rpe === n ? colors.black : colors.textSecondary, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `1px solid ${colors.border}` }}
              onClick={() => setRpe(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      <button
        style={{ background: done ? colors.green : colors.blue, borderRadius: radius.lg, padding: spacing.lg, fontSize: 16, fontWeight: 700, color: colors.black, cursor: 'pointer', border: 'none' }}
        onClick={handleFinish}
      >{done ? '✓ Gespeichert' : 'Training abschließen'}</button>
    </div>
  )
}
