import { useEffect, useRef, useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'

interface Props {
  rounds: number
  workSec: number
  restSec: number
  onDone: () => void
  label?: string
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Timer({ rounds, workSec, restSec, onDone, label }: Props) {
  const startPhase = workSec > 0 ? 'work' : 'rest'
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<'work' | 'rest'>(startPhase)
  const [remaining, setRemaining] = useState(startPhase === 'work' ? workSec : restSec)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1
        advance()
        return 0
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, phase, round])

  function advance() {
    if (phase === 'work') {
      setPhase('rest')
      setRemaining(restSec)
    } else if (round < rounds) {
      setRound(r => r + 1)
      setPhase(workSec > 0 ? 'work' : 'rest')
      setRemaining(workSec > 0 ? workSec : restSec)
    } else {
      onDone()
    }
  }

  function skip() {
    if (round >= rounds && phase === 'rest') { onDone(); return }
    advance()
  }

  const total = phase === 'work' ? workSec : restSec
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0
  const ringColor = phase === 'work' ? colors.blue : colors.green

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
      <div style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label ?? `Runde ${round}/${rounds}`}
      </div>
      <div style={{
        width: 180, height: 180, borderRadius: '50%',
        background: `conic-gradient(${ringColor} ${pct}% , ${colors.border} ${pct}% 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: colors.textPrimary }}>{formatTime(remaining)}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: ringColor, letterSpacing: 1 }}>{phase === 'work' ? 'ARBEIT' : 'PAUSE'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: spacing.sm, width: '100%' }}>
        <button
          style={{ flex: 1, background: colors.cardAlt, color: colors.textPrimary, borderRadius: radius.md, padding: spacing.md, fontWeight: 700, fontSize: 13 }}
          onClick={() => setPaused(p => !p)}
        >{paused ? '▶ Weiter' : '⏸ Pause'}</button>
        <button
          style={{ flex: 1, background: colors.blue, color: colors.black, borderRadius: radius.md, padding: spacing.md, fontWeight: 700, fontSize: 13 }}
          onClick={skip}
        >{round >= rounds && phase === 'rest' ? 'Fertig' : 'Überspringen'}</button>
      </div>
    </div>
  )
}
