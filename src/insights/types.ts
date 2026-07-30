export type InsightType = 'hrv' | 'threshold' | 'prediction' | 'load'
export type InsightSeverity = 'positive' | 'attention' | 'info'

export interface Insight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  message: string
  metric: { label: string; current: number; baseline: number; unit: string }
  computedAt: string
}
