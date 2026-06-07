import { useEffect, useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { getSessionsForWeek, getCompletedSessionIds } from '../db/queries/sessions'
import { getRecentSessionLogs, type SessionLog } from '../db/queries/logs'
import { TRAIN_START, RACE1_DATE, RACE2_DATE, TOTAL_WEEKS, getCurrentWeek } from '../data/constants'

const DAY_OFFSET: Record<string, number> = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 }
const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS: Record<string, string> = { monday:'Mo',tuesday:'Di',wednesday:'Mi',thursday:'Do',friday:'Fr',saturday:'Sa',sunday:'So' }

function getSessionDate(weekNum: number, dayName: string): string {
  const s = new Date(TRAIN_START.getTime() + (weekNum - 1) * 7 * 86400000)
  return new Date(s.getTime() + DAY_OFFSET[dayName] * 86400000).toISOString().split('T')[0]
}

export function StatsScreen() {
  const week = getCurrentWeek()
  const today = new Date().toISOString().split('T')[0]
  const daysLeft = Math.max(0, Math.ceil((RACE1_DATE.getTime() - Date.now()) / 86400000))
  const daysLeft2 = Math.max(0, Math.ceil((RACE2_DATE.getTime() - Date.now()) / 86400000))
  void daysLeft2
  const weeksLeft = Math.ceil(daysLeft / 7)
  const [sessions, setSessions] = useState<any[]>([])
  const [completedIds, setCompletedIds] = useState<number[]>([])
  const [recentLogs, setRecentLogs] = useState<SessionLog[]>([])

  useEffect(() => {
    async function load() {
      const [s, c, logs] = await Promise.all([
        getSessionsForWeek(week),
        getCompletedSessionIds(week),
        getRecentSessionLogs(30),
      ])
      setSessions(s)
      setCompletedIds(c)
      setRecentLogs(logs)
    }
    load()
  }, [week])

  const activeSessions = sessions.filter(s => s.type !== 'rest')
  const plannedCount = activeSessions.length
  const completedCount = completedIds.length
  const dueSessions = activeSessions.filter(s => getSessionDate(week, s.day) <= today)
  const dueCompleted = dueSessions.filter(s => completedIds.includes(s.id)).length
  const adherencePct = dueSessions.length > 0 ? Math.round((dueCompleted / dueSessions.length) * 100) : 0
  const weekProgress = plannedCount > 0 ? completedCount / plannedCount : 0
  const progressPct = Math.min(100, ((week - 1 + weekProgress) / TOTAL_WEEKS) * 100)

  const adherenceColor = adherencePct >= 80 ? colors.green : adherencePct >= 50 ? colors.yellow : colors.red

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ fontSize: 25, fontWeight: 800, color: colors.textPrimary }}>Fortschritt</div>
      <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: -spacing.xs }}>Woche {week} von {TOTAL_WEEKS}</div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, border: `1px solid ${colors.indigo}33`, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { num: daysLeft, label: 'Tage bis\nKarlsruhe' },
            { num: weeksLeft, label: 'Wochen\nverbleibend' },
            { num: Math.max(0, TOTAL_WEEKS - week), label: 'Trainings-\nwochen' },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${colors.border}` : undefined }}>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>{item.num}</div>
              <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4, whiteSpace: 'pre-line' as const }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: colors.indigo, textAlign: 'center', fontWeight: 600 }}>
          Karlsruhe 18./19. Okt · Frankfurt 13. Dez
        </div>
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Planfortschritt</span>
          <span style={{ fontSize: 13, color: colors.green, fontWeight: 600 }}>Wo {week} / {TOTAL_WEEKS}</span>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: 6, height: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: colors.green, borderRadius: 6, width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>Start</span>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{Math.round(progressPct)}% absolviert</span>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>Rennen</span>
        </div>
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>Diese Woche</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: colors.green }}>{completedCount}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary }}>erledigt</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: colors.textSecondary }}>{plannedCount}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary }}>geplant</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: adherenceColor }}>{plannedCount > 0 ? `${adherencePct}%` : '—'}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary }}>Treue</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
          {DAY_ORDER.map(day => {
            const s = sessions.find(x => x.day === day)
            if (!s) return null
            const done = completedIds.includes(s.id)
            const dotColor = done ? (s.type === 'run' ? colors.green : colors.indigo) : colors.border
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: done ? colors.black : 'transparent' }}>✓</div>
                <span style={{ fontSize: 10, color: colors.textSecondary }}>{DAY_LABELS[day]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {recentLogs.length > 0 && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Letzte Einheiten</div>
          {recentLogs.slice(0, 7).map((log, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4, borderBottom: i < Math.min(recentLogs.length, 7) - 1 ? `1px solid ${colors.border}` : undefined }}>
              <span style={{ fontSize: 13, color: colors.textSecondary }}>
                {new Date(log.log_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              </span>
              <span style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 600 }}>
                {log.duration_actual_min ? `${log.duration_actual_min} Min` : '—'}
              </span>
              <span style={{ fontSize: 13, color: colors.green }}>RPE {log.rpe}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
