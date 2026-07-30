import { useEffect, useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { LineChart } from '../components/LineChart'
import { daysUntilRace1, daysUntilRace2 } from '../data/constants'
import { getRecentHrv } from '../db/queries/hrv'
import { getWeeklyLoad, getPaceTrend, getLoggedExerciseNames, getExerciseWeightTrend, getSplitConsistencyTrend, type TrendPoint } from '../db/queries/trends'
import { formatMinSec } from '../utils/format'

const cardStyle: React.CSSProperties = { background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }

export function TrendsScreen() {
  const [load, setLoad] = useState<TrendPoint[]>([])
  const [pace, setPace] = useState<TrendPoint[]>([])
  const [hrv, setHrv] = useState<TrendPoint[]>([])
  const [exerciseNames, setExerciseNames] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [exerciseTrend, setExerciseTrend] = useState<TrendPoint[]>([])
  const [splitConsistency, setSplitConsistency] = useState<TrendPoint[]>([])

  useEffect(() => {
    async function load_() {
      const [l, p, h, names, sc] = await Promise.all([
        getWeeklyLoad(), getPaceTrend(), getRecentHrv(30), getLoggedExerciseNames(), getSplitConsistencyTrend(),
      ])
      setLoad(l)
      setPace(p)
      setHrv(h.map(r => ({ label: new Date(r.log_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), value: r.hrv_ms })))
      setExerciseNames(names)
      setSplitConsistency(sc)
      if (names.length > 0) setSelectedExercise(names[0])
    }
    load_()
  }, [])

  useEffect(() => {
    if (selectedExercise) getExerciseWeightTrend(selectedExercise).then(setExerciseTrend)
  }, [selectedExercise])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ fontSize: 25, fontWeight: 800, color: colors.textPrimary }}>Trends</div>

      <div style={{ ...cardStyle, flexDirection: 'row', justifyContent: 'space-around', textAlign: 'center' }}>
        <div><div style={{ fontSize: 24, fontWeight: 800, color: colors.blue }}>{daysUntilRace1()}</div><div style={{ fontSize: 10, color: colors.textSecondary }}>Tage Karlsruhe</div></div>
        <div><div style={{ fontSize: 24, fontWeight: 800, color: colors.indigo }}>{daysUntilRace2()}</div><div style={{ fontSize: 10, color: colors.textSecondary }}>Tage Frankfurt</div></div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Trainingsbelastung / Woche</div>
        <LineChart data={load} color={colors.blue} unit="RPE×Min" />
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Pace-Trend (Läufe)</div>
        <LineChart data={pace} color={colors.green} unit="min/km" formatValue={formatMinSec} />
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Ø Rundenzeit (Intervalle)</div>
        <LineChart data={splitConsistency} color={colors.indigo} unit="min/Runde" formatValue={formatMinSec} />
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>HRV-Verlauf</div>
        <LineChart data={hrv} color={colors.yellow} unit="ms" />
      </div>

      {exerciseNames.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Gewichtsverlauf</div>
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              style={{ background: colors.cardAlt, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '4px 8px', fontSize: 12 }}
            >
              {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <LineChart data={exerciseTrend} color={colors.indigo} unit="kg" />
        </div>
      )}
    </div>
  )
}
