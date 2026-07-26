import { useEffect, useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { TrainingCard } from '../components/TrainingCard'
import { getSessionForDate, getMobilitySessionForDate, getStreak, type Session } from '../db/queries/sessions'
import { isSessionCompleted } from '../db/queries/logs'
import { TRAIN_START } from '../data/constants'

export function TodayScreen() {
  const today = new Date().toISOString().split('T')[0]
  const [session, setSession] = useState<Session | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [mobilitySession, setMobilitySession] = useState<Session | null>(null)
  const [mobilityCompleted, setMobilityCompleted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const [s, m, sk] = await Promise.all([getSessionForDate(today), getMobilitySessionForDate(today), getStreak()])
      setSession(s)
      setMobilitySession(m)
      setStreak(sk)
      if (s?.id) setIsCompleted(await isSessionCompleted(s.id, today))
      if (m?.id) setMobilityCompleted(await isSessionCompleted(m.id, today))
      setReady(true)
    }
    load()
  }, [today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const dayOfWeek = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short' })

  const planStartStr = TRAIN_START.toISOString().split('T')[0]
  const beforePlan = today < planStartStr
  const daysUntilStart = beforePlan
    ? Math.ceil((TRAIN_START.getTime() - Date.now()) / 86400000)
    : 0

  if (!ready) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 25, fontWeight: 800, color: colors.textPrimary }}>{greeting}</div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {dayOfWeek}{beforePlan ? ` · Start in ${daysUntilStart} Tagen` : session ? ` · Woche ${session.week}` : ''}
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: colors.card, border: `1px solid ${colors.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: colors.green }}>SF</div>
      </div>

      <div style={{ background: colors.card, borderRadius: radius.md, padding: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <span style={{ fontSize: 24 }}>🔥</span>
        <span style={{ fontSize: 28, fontWeight: 900, color: colors.green }}>{streak}</span>
        <span style={{ fontSize: 13, color: colors.textSecondary }}>Tage Streak</span>
      </div>

      {beforePlan && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.xl, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
          <div style={{ fontSize: 54, fontWeight: 900, color: colors.green }}>{daysUntilStart}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>Tage bis Trainingsstart</div>
          <div style={{ fontSize: 13, color: colors.textSecondary }}>Plan beginnt am 24. Mai · Woche 1 Comeback</div>
        </div>
      )}

      {!beforePlan && session && (
        <TrainingCard session={session} isCompleted={isCompleted} date={today} />
      )}

      {!beforePlan && !session && (
        <div style={{ background: colors.card, borderRadius: radius.md, padding: spacing.md }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>Ruhetag</div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Kein Training geplant — erhol dich gut.</div>
        </div>
      )}

      {!beforePlan && mobilitySession && (
        <TrainingCard session={mobilitySession} isCompleted={mobilityCompleted} date={today} />
      )}
    </div>
  )
}
