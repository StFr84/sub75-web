import { useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { daysUntilRace1, daysUntilRace2, getCurrentWeek } from '../data/constants'

const PHASES = [
  { id: 'comeback', label: 'Comeback',  weeks: '1–2',   dates: 'Mai 2026',            goal: 'Sanfter Wiedereinstieg nach Krankheit. Nur LDL unter 130–137 bpm. Kein Laktat.' },
  { id: 'base',     label: 'Base',      weeks: '3–9',   dates: 'Jun – Jul 2026',       goal: 'Aerobes Fundament. 70–80% der Laufminuten unter 137 bpm. Grundkraft aufbauen.' },
  { id: 'build1',   label: 'Build 1',   weeks: '10–17', dates: 'Aug – Sep 2026',       goal: 'VO2max steigern (Ziel 54–56). HIIT, Schwelle, Stationsspezifik, Transitions.' },
  { id: 'peak1',    label: 'Peak 1',    weeks: '18',    dates: 'Ende Sep 2026',        goal: 'Kompensierter Peak (1 Woche): letzte Schärfung, eine volle Halbsimulation, Taper-Übergang. Karlsruhe ist Zwischentest — Hauptfokus bleibt Frankfurt.' },
  { id: 'race1',    label: '🏆 Race 1', weeks: '19',    dates: '3. Okt 2026',          goal: 'Taper-Woche + Hyrox Karlsruhe (Sa) · Ziel Sub 75 Min' },
  { id: 'recovery', label: 'Recovery',  weeks: '20–24', dates: 'Okt – Nov 2026',       goal: 'Aktive Erholung (Wo 20–21), dann progressiver Wiederaufbau (Wo 22–24). Race-Analyse einbeziehen, Brücke zu Build 2.' },
  { id: 'build2',   label: 'Build 2',   weeks: '25–28', dates: 'Nov 2026',             goal: 'Zweiter Aufbaublock. Laufpace und schwächste Stationen gezielt verbessern.' },
  { id: 'peak2',    label: '🏆 Race 2', weeks: '29–30', dates: '13. Dez 2026',         goal: 'Hyrox Frankfurt · Ziel Sub 70 Min' },
]

function getCurrentPhase(): string {
  const week = getCurrentWeek()
  if (week <= 2)  return 'comeback'
  if (week <= 9)  return 'base'
  if (week <= 17) return 'build1'
  if (week <= 18) return 'peak1'
  if (week <= 19) return 'race1'
  if (week <= 24) return 'recovery'
  if (week <= 28) return 'build2'
  return 'peak2'
}

export function PlanScreen() {
  const currentPhase = getCurrentPhase()
  const [expanded, setExpanded] = useState<string | null>(currentPhase)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ textAlign: 'center', padding: `${spacing.md}px 0` }}>
        <div style={{ fontSize: 54, fontWeight: 800, color: colors.green }}>{daysUntilRace1()}</div>
        <div style={{ fontSize: 14, color: colors.textSecondary }}>Tage bis Karlsruhe (Sub 75)</div>
        <div style={{ fontSize: 14, color: colors.indigo, marginTop: 4 }}>
          +{daysUntilRace2() - daysUntilRace1()} Tage bis Frankfurt (Sub 70)
        </div>
      </div>

      {PHASES.map(phase => {
        const isCurrent = phase.id === currentPhase
        const isOpen = expanded === phase.id
        return (
          <div
            key={phase.id}
            style={{ background: isCurrent ? colors.blueDim : colors.card, borderRadius: radius.md, padding: spacing.md, border: isCurrent ? `1px solid ${colors.blueBorder}` : undefined, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: spacing.sm }}
            onClick={() => setExpanded(isOpen ? null : phase.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: isCurrent ? colors.green : colors.border, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isCurrent ? colors.green : colors.textPrimary }}>{phase.label}</span>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>Wo {phase.weeks}</span>
                </div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{phase.dates}</div>
              </div>
              {isCurrent && <span style={{ fontSize: 11, color: colors.green, background: colors.greenDim, padding: '2px 6px', borderRadius: radius.full }}>jetzt</span>}
            </div>
            {isOpen && <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>{phase.goal}</div>}
          </div>
        )
      })}
    </div>
  )
}
