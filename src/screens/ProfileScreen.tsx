import { useRef } from 'react'
import { colors, spacing, radius } from '../theme/colors'
import { db } from '../db/dexie'

const ZONES = [
  { id: 'LDL', name: 'Langer Dauerlauf',       pace: '<8,4 km/h',        hf: '<137 bpm' },
  { id: 'MDL', name: 'Mittlerer Dauerlauf',     pace: '8,4–11,9 km/h',   hf: '138–158 bpm' },
  { id: 'TDL', name: 'Tempodauerlauf',          pace: '11,9–12,6 km/h',  hf: '159–161 bpm' },
  { id: 'ETL', name: 'Extensive Tempoläufe',    pace: '12,4–13,4 km/h',  hf: '161–165 bpm' },
  { id: 'Max', name: 'Wettkampfpace',           pace: '>13,4 km/h',      hf: '>165 bpm' },
]

async function exportData() {
  const [sessions, exercises, logged_sets, session_logs, user_meta] = await Promise.all([
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.logged_sets.toArray(),
    db.session_logs.toArray(),
    db.user_meta.toArray(),
  ])
  const blob = new Blob(
    [JSON.stringify({ sessions, exercises, logged_sets, session_logs, user_meta, exportedAt: new Date().toISOString() }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sub75-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function importData(file: File): Promise<string> {
  const text = await file.text()
  const data = JSON.parse(text)
  await db.transaction('rw', [db.sessions, db.exercises, db.logged_sets, db.session_logs, db.user_meta], async () => {
    if (data.logged_sets?.length)  { await db.logged_sets.clear();  await db.logged_sets.bulkAdd(data.logged_sets.map((r: any) => { const { id: _id, ...rest } = r; return rest })) }
    if (data.session_logs?.length) { await db.session_logs.clear(); await db.session_logs.bulkAdd(data.session_logs.map((r: any) => { const { id: _id, ...rest } = r; return rest })) }
  })
  return `Importiert: ${data.session_logs?.length ?? 0} Einheiten, ${data.logged_sets?.length ?? 0} Sätze`
}

export function ProfileScreen() {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const msg = await importData(file)
      alert(msg)
    } catch {
      alert('Import fehlgeschlagen — ist das eine gültige Sub75-Backup-Datei?')
    }
    e.target.value = ''
  }

  const cardStyle: React.CSSProperties = { background: colors.card, borderRadius: radius.md, padding: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.sm }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: colors.card, border: `2px solid ${colors.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 800, color: colors.green }}>SF</div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary }}>Steven Fredrickson</div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>190 cm · 84,4 kg · 41 J</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Leistungswerte</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: spacing.sm }}>
          {[['HRmax','170 bpm'],['VO2max','50,8 ml/kg'],['LT1','148 bpm · 9,0 km/h'],['IAS','162 bpm · 12,5 km/h']].map(([k, v]) => (
            <div key={k} style={{ width: '48%' }}>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Trainingszonen</div>
        {ZONES.map(z => (
          <div key={z.id} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.green, width: 36 }}>{z.id}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{z.name}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>{z.hf} · {z.pace}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Ziel</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>Hyrox Karlsruhe · &lt;75 Min</div>
        <div style={{ fontSize: 13, color: colors.textSecondary }}>3. Oktober 2026</div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Datensicherung</div>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>Daten lokal im Browser gespeichert. Exportiere zum Sichern oder für einen Gerätewechsel.</div>
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.xs }}>
          <button
            style={{ flex: 1, background: colors.greenDim, border: `1px solid ${colors.green}`, borderRadius: radius.md, padding: spacing.sm, fontSize: 13, fontWeight: 600, color: colors.green, cursor: 'pointer' }}
            onClick={exportData}
          >⬇ Exportieren</button>
          <button
            style={{ flex: 1, background: '#1a1a2e', border: `1px solid ${colors.indigo}`, borderRadius: radius.md, padding: spacing.sm, fontSize: 13, fontWeight: 600, color: colors.indigo, cursor: 'pointer' }}
            onClick={() => fileRef.current?.click()}
          >⬆ Importieren</button>
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
    </div>
  )
}
