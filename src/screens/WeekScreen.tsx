import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { colors, spacing, radius } from '../theme/colors'
import { getSessionsForWeek, getCompletedSessionIds, moveSession, swapSessionDays, type Session } from '../db/queries/sessions'
import { TRAIN_START, getCurrentWeek } from '../data/constants'

const DAY_LABELS: Record<string, string> = {
  monday: 'Mo', tuesday: 'Di', wednesday: 'Mi',
  thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So',
}
const DAY_ORDER = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
const DAY_OFFSET: Record<string, number> = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 }
const TYPE_COLOR: Record<string, string> = { run: colors.green, strength: colors.indigo, rest: colors.border }
const TYPE_ICON: Record<string, string> = { run: '🏃', strength: '💪', rest: '—' }

function getSessionDate(weekNum: number, dayName: string): string {
  const weekStart = new Date(TRAIN_START.getTime() + (weekNum - 1) * 7 * 86400000)
  const d = new Date(weekStart.getTime() + DAY_OFFSET[dayName] * 86400000)
  return d.toISOString().split('T')[0]
}

function getWeekDateRange(weekNum: number): string {
  const DE_MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  const start = new Date(TRAIN_START.getTime() + (weekNum - 1) * 7 * 86400000)
  const end = new Date(start.getTime() + 6 * 86400000)
  const sMon = DE_MONTHS[start.getUTCMonth()], eMon = DE_MONTHS[end.getUTCMonth()]
  return sMon === eMon
    ? `${start.getUTCDate()}. – ${end.getUTCDate()}. ${sMon}`
    : `${start.getUTCDate()}. ${sMon} – ${end.getUTCDate()}. ${eMon}`
}

function getTodayDayName(): string {
  return DAY_ORDER[new Date().getDay()]
}

export function WeekScreen() {
  const navigate = useNavigate()
  const { weekNum } = useParams<{ weekNum: string }>()
  const today = new Date().toISOString().split('T')[0]
  const currentWeek = getCurrentWeek()
  const todayDayName = getTodayDayName()
  // Woche kommt aus der URL statt aus lokalem State, damit sie beim
  // Zurückgehen aus einem Trainingsdetail erhalten bleibt statt zur
  // aktuellen Woche zurückzuspringen.
  const week = Math.min(30, Math.max(1, Number(weekNum) || currentWeek))
  const [sessions, setSessions] = useState<Session[]>([])
  const [completedIds, setCompletedIds] = useState<number[]>([])
  const [dropdownFor, setDropdownFor] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const [s, c] = await Promise.all([getSessionsForWeek(week), getCompletedSessionIds(week)])
      setSessions(s)
      setCompletedIds(c)
    }
    load()
  }, [week])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownFor(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const phase = sessions[0]?.phase ?? ''
  const activeSessions = sessions.filter(s => s.type !== 'rest' && s.type !== 'mobility')
  const completedActiveCount = completedIds.filter(id => activeSessions.some(s => s.id === id)).length
  const totalMin = activeSessions.reduce((sum, s) => sum + (s.duration_min ?? 0), 0)
  const isCurrentWeek = week === currentWeek

  async function handleReschedule(session: Session, targetDay: string) {
    const sourceDay = session.day
    const targetSession = sessions.find(s => s.day === targetDay && s.type !== 'mobility')
    if (targetSession) {
      await swapSessionDays(session.id!, sourceDay, targetSession.id!, targetDay)
    } else {
      await moveSession(session.id!, targetDay)
    }

    // Mobility-Session hängt an der Haupteinheit und zieht mit um, statt am
    // alten Kalendertag hängen zu bleiben.
    const sourceMobility = sessions.find(s => s.day === sourceDay && s.type === 'mobility')
    const targetMobility = sessions.find(s => s.day === targetDay && s.type === 'mobility')
    if (sourceMobility && targetMobility) {
      await swapSessionDays(sourceMobility.id!, sourceDay, targetMobility.id!, targetDay)
    } else if (sourceMobility) {
      await moveSession(sourceMobility.id!, targetDay)
    } else if (targetMobility) {
      await moveSession(targetMobility.id!, sourceDay)
    }

    const [s, c] = await Promise.all([getSessionsForWeek(week), getCompletedSessionIds(week)])
    setSessions(s)
    setCompletedIds(c)
    setDropdownFor(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(`/week/${Math.max(1, week - 1)}`, { replace: true })} style={{ width: 44, height: 44, fontSize: 28, color: colors.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: colors.textPrimary }}>Woche {week}</div>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>{phase.charAt(0).toUpperCase() + phase.slice(1)}{isCurrentWeek ? ' · Aktuell' : ''}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, opacity: 0.7 }}>{getWeekDateRange(week)}</div>
        </div>
        <button onClick={() => navigate(`/week/${Math.min(30, week + 1)}`, { replace: true })} style={{ width: 44, height: 44, fontSize: 28, color: colors.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer' }}>›</button>
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', alignItems: 'center' }}>
        {[
          { num: activeSessions.length, label: 'Einheiten' },
          { num: totalMin, label: 'Minuten' },
          { num: `${completedActiveCount}/${activeSessions.length}`, label: 'Erledigt' },
        ].map((item, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${colors.border}` : undefined }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.textPrimary }}>{item.num}</div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {DAY_ORDER.map(day => {
        const s = sessions.find(x => x.day === day && x.type !== 'mobility')
        const mobility = sessions.find(x => x.day === day && x.type === 'mobility')
        const mobilityDone = mobility ? completedIds.includes(mobility.id!) : false
        if (!s || s.type === 'rest') {
          return mobility ? (
            <div
              key={day}
              onClick={() => navigate(`/mobility/${mobility.id}/${getSessionDate(week, day)}`, { state: { title: mobility.title, duration: mobility.duration_min, notes: mobility.notes } })}
              style={{ background: colors.card, borderRadius: radius.lg, display: 'flex', overflow: 'hidden', cursor: 'pointer', opacity: mobilityDone ? 0.7 : 1 }}
            >
              <div style={{ width: 4, background: colors.yellow, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: colors.textSecondary }}>{DAY_LABELS[day]} · 🧘 {mobility.title}</span>
                {mobilityDone ? <span style={{ fontSize: 15, color: colors.green }}>✓</span> : <span style={{ fontSize: 12, color: colors.textSecondary }}>{mobility.duration_min} Min</span>}
              </div>
            </div>
          ) : null
        }
        const isDone = completedIds.includes(s.id!)
        const accent = TYPE_COLOR[s.type]
        const isToday = isCurrentWeek && day === todayDayName
        const sessionDate = getSessionDate(week, day)
        const isPast = isCurrentWeek && sessionDate < today

        return (
          <div key={day} style={{ position: 'relative' }}>
            <div
              style={{ background: isToday ? '#0f2a1a' : colors.card, borderRadius: radius.lg, display: 'flex', overflow: 'hidden', border: isToday ? `1px solid ${colors.greenBorder}` : undefined, opacity: isPast && !isDone ? 0.6 : 1, cursor: 'pointer' }}
              onClick={() => {
                if (s.type === 'strength') navigate(`/workout/${s.id}/${sessionDate}`)
                else if (s.type === 'run') navigate(`/run/${s.id}/${sessionDate}`, { state: { title: s.title, duration: s.duration_min, zone: s.zone, pace: s.pace, notes: s.notes } })
              }}
            >
              <div style={{ width: 4, background: isPast ? colors.border : accent, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 600 }}>{DAY_LABELS[day]}</span>
                  {isToday && <span style={{ fontSize: 10, color: colors.green, background: colors.greenDim, padding: '2px 7px', borderRadius: radius.full, fontWeight: 600 }}>Heute</span>}
                  {isPast && !isDone && <span style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>nicht absolviert</span>}
                  {isDone && <span style={{ marginLeft: 'auto', fontSize: 18, color: colors.green }}>✓</span>}
                  {s.original_day && s.original_day !== s.day && <span style={{ fontSize: 12, color: colors.textSecondary }}>↕</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? colors.green : colors.textPrimary }}>{s.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 13, color: colors.textSecondary }}>{TYPE_ICON[s.type]} {s.type === 'run' ? 'Laufen' : 'Kraft'}</span>
                  <span style={{ color: colors.border }}>·</span>
                  <span style={{ fontSize: 13, color: colors.textSecondary }}>{s.duration_min} Min</span>
                  {s.zone && <><span style={{ color: colors.border }}>·</span><span style={{ fontSize: 13, color: colors.textSecondary }}>{s.zone}</span></>}
                  {s.pace && <><span style={{ color: colors.border }}>·</span><span style={{ fontSize: 13, color: colors.textSecondary }}>🏃 {s.pace}</span></>}
                </div>
              </div>
              <button
                style={{ padding: '0 12px', color: colors.indigo, fontSize: 11, fontWeight: 600, background: 'transparent', borderLeft: `1px solid ${colors.border}`, border: 'none', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setDropdownFor(dropdownFor === s.id ? null : s.id!) }}
              >⇄</button>
            </div>

            {dropdownFor === s.id && (
              <div ref={dropdownRef} style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#1a1a1a', borderRadius: radius.md, border: `1px solid ${colors.border}`, zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', fontSize: 11, color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Verschieben nach:</div>
                {DAY_ORDER.filter(d => d !== day).map(targetDay => {
                  const existing = sessions.find(x => x.day === targetDay && x.type !== 'mobility')
                  const label = DAY_LABELS[targetDay]
                  const desc = existing ? `(${existing.type === 'run' ? 'Laufen' : existing.type === 'strength' ? 'Kraft' : 'Pause'})` : '(frei)'
                  return (
                    <button
                      key={targetDay}
                      style={{ display: 'block', width: '100%', padding: '9px 12px', textAlign: 'left', fontSize: 13, color: colors.textPrimary, background: 'transparent', cursor: 'pointer', border: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.border)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => handleReschedule(s, targetDay)}
                    >
                      {label} {desc}
                    </button>
                  )
                })}
              </div>
            )}

            {mobility && (
              <div
                onClick={() => navigate(`/mobility/${mobility.id}/${sessionDate}`, { state: { title: mobility.title, duration: mobility.duration_min, notes: mobility.notes } })}
                style={{ background: colors.card, borderRadius: radius.md, display: 'flex', overflow: 'hidden', cursor: 'pointer', marginTop: 4, opacity: mobilityDone ? 0.6 : 0.9 }}
              >
                <div style={{ width: 4, background: colors.yellow, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>🧘 {mobility.title}</span>
                  {mobilityDone ? <span style={{ fontSize: 13, color: colors.green }}>✓</span> : <span style={{ fontSize: 11, color: colors.textSecondary }}>{mobility.duration_min} Min</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
