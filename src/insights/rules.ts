import { db } from '../db/dexie'
import { getRecentHrv } from '../db/queries/hrv'
import { getWeeklyLoad } from '../db/queries/trends'
import { daysUntilRace1 } from '../data/constants'
import type { Insight } from './types'

const IAS_PACE_MIN_KM = 60 / 12.5 // 4,8 min/km – hinterlegte Individuelle-Anaerobe-Schwelle-Pace

async function getThresholdZoneLogs(days: number) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const [logs, sessions] = await Promise.all([
    db.session_logs.where('log_date').aboveOrEqual(cutoff).toArray(),
    db.sessions.toArray(),
  ])
  const sessionById = new Map(sessions.map(s => [s.id, s]))
  return logs
    .map(l => ({ log: l, session: sessionById.get(l.session_id) }))
    .filter((r): r is { log: typeof r.log; session: NonNullable<typeof r.session> } =>
      !!r.session && r.session.type === 'run' && (r.session.zone === 'TDL' || r.session.zone === 'ETL') &&
      !!r.log.distance_km && !!r.log.duration_actual_min && r.log.distance_km > 0)
    .sort((a, b) => a.log.log_date.localeCompare(b.log.log_date))
}

export async function hrvTrendRule(today: string): Promise<Insight | null> {
  const recent = await getRecentHrv(37)
  const recentWindow = recent.filter(r => r.log_date <= today).slice(-5)
  const baselineWindow = recent.filter(r => !recentWindow.some(rw => rw.log_date === r.log_date))
  if (recentWindow.length < 3 || baselineWindow.length < 10) return null

  const recentAvg = recentWindow.reduce((s, r) => s + r.hrv_ms, 0) / recentWindow.length
  const baselineAvg = baselineWindow.reduce((s, r) => s + r.hrv_ms, 0) / baselineWindow.length
  const deviation = (recentAvg - baselineAvg) / baselineAvg
  if (deviation > -0.10) return null

  return {
    id: `hrv-drop-${today}`,
    type: 'hrv',
    severity: deviation <= -0.20 ? 'attention' : 'info',
    title: 'HRV seit einigen Tagen unter Baseline',
    message: `Dein HRV-Schnitt der letzten ${recentWindow.length} Tage liegt ${Math.round(Math.abs(deviation) * 100)}% unter deinem 30-Tage-Schnitt. Erwäge, die Intensität kurz zurückzunehmen oder auf ausreichend Schlaf/Regeneration zu achten.`,
    metric: { label: 'HRV Ø letzte Tage vs. 30-Tage-Schnitt', current: Math.round(recentAvg), baseline: Math.round(baselineAvg), unit: 'ms' },
    computedAt: today,
  }
}

export async function thresholdShiftRule(today: string): Promise<Insight | null> {
  const qualifying = await getThresholdZoneLogs(90)
  if (qualifying.length < 6) return null

  const paceOf = (r: { log: { distance_km: number | null; duration_actual_min: number | null } }) =>
    r.log.duration_actual_min! / r.log.distance_km!

  const recentThree = qualifying.slice(-3)
  const priorWindow = qualifying.slice(-9, -3)
  if (priorWindow.length < 3) return null

  const recentAvgPace = recentThree.reduce((s, r) => s + paceOf(r), 0) / recentThree.length
  const priorAvgPace = priorWindow.reduce((s, r) => s + paceOf(r), 0) / priorWindow.length
  const improvement = (priorAvgPace - recentAvgPace) / priorAvgPace
  if (improvement < 0.03) return null

  return {
    id: `threshold-shift-${today}`,
    type: 'threshold',
    severity: 'positive',
    title: 'Schwellen-Pace hat sich verbessert',
    message: `Deine Pace bei Tempodauerlauf/ETL-Einheiten ist in den letzten Einheiten im Schnitt ${Math.round(improvement * 100)}% schneller als im Zeitraum davor – deine Schwelle scheint sich nach vorne verschoben zu haben.`,
    metric: { label: 'Pace TDL/ETL, aktuell vs. vorher', current: Math.round(recentAvgPace * 100) / 100, baseline: Math.round(priorAvgPace * 100) / 100, unit: 'min/km' },
    computedAt: today,
  }
}

export async function racePredictionRule(today: string): Promise<Insight | null> {
  const qualifying = await getThresholdZoneLogs(21)
  if (qualifying.length < 3) return null

  const avgPace = qualifying.reduce((s, r) => s + r.log.duration_actual_min! / r.log.distance_km!, 0) / qualifying.length
  const gap = (avgPace - IAS_PACE_MIN_KM) / IAS_PACE_MIN_KM
  const days = daysUntilRace1()

  return {
    id: `race-prediction-${today}`,
    type: 'prediction',
    severity: gap <= 0 ? 'positive' : gap > 0.15 && days < 21 ? 'attention' : 'info',
    title: 'Wo du im Verhältnis zur Renn-Pace stehst',
    message: gap <= 0
      ? `Deine aktuelle Tempolauf-Pace liegt bereits auf oder über deinem IAS-Zielwert von ${IAS_PACE_MIN_KM.toFixed(1)} min/km – Laufform passt für Karlsruhe in ${days} Tagen. Hinweis: das bewertet nur die Lauf-Komponente, nicht die Stationen.`
      : `Deine Tempolauf-Pace liegt aktuell im Schnitt ${Math.round(gap * 100)}% über deinem IAS-Zielwert von ${IAS_PACE_MIN_KM.toFixed(1)} min/km (bis Karlsruhe: ${days} Tage). Hinweis: das bewertet nur die Lauf-Komponente, nicht die Stationen.`,
    metric: { label: 'Pace TDL/ETL vs. IAS-Ziel', current: Math.round(avgPace * 100) / 100, baseline: Math.round(IAS_PACE_MIN_KM * 100) / 100, unit: 'min/km' },
    computedAt: today,
  }
}

export async function loadTrendRule(today: string): Promise<Insight | null> {
  const weeks = await getWeeklyLoad(6)
  if (weeks.length < 5) return null

  const lastWeek = weeks[weeks.length - 1]
  const priorWeeks = weeks.slice(0, -1)
  const priorAvg = priorWeeks.reduce((s, w) => s + w.value, 0) / priorWeeks.length
  if (priorAvg === 0) return null
  const change = (lastWeek.value - priorAvg) / priorAvg
  if (Math.abs(change) < 0.4) return null

  return {
    id: `load-trend-${today}`,
    type: 'load',
    severity: change > 0 ? 'attention' : 'info',
    title: change > 0 ? 'Deutlicher Belastungssprung diese Woche' : 'Belastung deutlich niedriger als sonst',
    message: change > 0
      ? `Deine Trainingslast (RPE×Minuten) ist gegenüber dem Schnitt der Vorwochen um ${Math.round(change * 100)}% gestiegen. Achte auf ausreichend Regeneration, um Überlastung zu vermeiden.`
      : `Deine Trainingslast liegt ${Math.round(Math.abs(change) * 100)}% unter dem Schnitt der Vorwochen – falls ungeplant, ggf. wieder steigern.`,
    metric: { label: 'Wochenlast, aktuell vs. Vorwochen-Schnitt', current: Math.round(lastWeek.value), baseline: Math.round(priorAvg), unit: 'RPE×Min' },
    computedAt: today,
  }
}
