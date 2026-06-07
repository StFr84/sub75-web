// Zentrale Plan-Konstanten – Dual-Peak-Saison 2026
export const TRAIN_START = new Date('2026-05-24')   // Woche 1 · Comeback
export const RACE1_DATE  = new Date('2026-10-18')   // Hyrox Karlsruhe · Sub 75
export const RACE2_DATE  = new Date('2026-12-13')   // Hyrox Frankfurt  · Sub 70
export const TOTAL_WEEKS = 30

export function getCurrentWeek(): number {
  return Math.max(1, Math.floor((Date.now() - TRAIN_START.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
}

export function daysUntilRace1(): number {
  return Math.max(0, Math.round((RACE1_DATE.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

export function daysUntilRace2(): number {
  return Math.max(0, Math.round((RACE2_DATE.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}
