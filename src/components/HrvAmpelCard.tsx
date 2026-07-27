import { useEffect, useState } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { getHrvStatus, setHrvForDate, type HrvStatus } from '../db/queries/hrv'

interface Props {
  date: string
  onSaved?: () => void
}

const STATUS_COLOR: Record<HrvStatus, string> = {
  green: colors.green, yellow: colors.yellow, red: colors.red, none: colors.textSecondary,
}
const STATUS_LABEL: Record<HrvStatus, string> = {
  green: 'Grün · wie geplant', yellow: 'Gelb · eine Zone runter', red: 'Rot · nur LDL/Ruhe', none: '',
}

export function HrvAmpelCard({ date, onSaved }: Props) {
  const [status, setStatus] = useState<HrvStatus>('none')
  const [value, setValue] = useState<number | null>(null)
  const [input, setInput] = useState('')

  useEffect(() => {
    getHrvStatus(date).then(r => { setStatus(r.status); setValue(r.value) })
  }, [date])

  async function handleSave() {
    const ms = Number(input)
    if (!ms || ms <= 0) return
    await setHrvForDate(date, ms)
    const r = await getHrvStatus(date)
    setStatus(r.status)
    setValue(r.value)
    onSaved?.()
  }

  if (value === null) {
    return (
      <div style={{ background: colors.card, borderRadius: radius.md, padding: spacing.md, display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>HRV heute</div>
          <div style={{ fontSize: 13, color: colors.textPrimary, marginTop: 2 }}>Wert eintragen für die Ampel</div>
        </div>
        <input
          type="number" inputMode="numeric" placeholder="ms" value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: 60, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm, color: colors.textPrimary, textAlign: 'center' }}
        />
        <button style={{ background: colors.blue, color: colors.black, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px`, fontWeight: 700, fontSize: 12 }} onClick={handleSave}>Sichern</button>
      </div>
    )
  }

  return (
    <div style={{ background: colors.card, borderRadius: radius.md, padding: spacing.md, display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: STATUS_COLOR[status], flexShrink: 0, boxShadow: `0 0 8px ${STATUS_COLOR[status]}` }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>HRV heute</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>{value} ms</div>
      </div>
      <div style={{ fontSize: 11, color: STATUS_COLOR[status], fontWeight: 600, textAlign: 'right' }}>{STATUS_LABEL[status]}</div>
    </div>
  )
}
