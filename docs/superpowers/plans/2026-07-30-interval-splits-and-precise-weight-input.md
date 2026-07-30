# Intervall-Splits & präzise Gewichtseingabe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runden-Splits (Zeit oder Distanz pro Intervall) erfassbar machen und die Gewichts-/Wiederholungs-Eingabe im Stepper auf direkte Zahleneingabe umstellen.

**Architecture:** Additive Dexie-Schema-Erweiterung (`interval_splits`, Version 3) referenziert per Foreign Key auf `session_logs.id`. Neue UI-Karte in `RunDetailScreen` erkennt automatisch, ob eine Session Zeit- oder Distanz-Runden braucht, und speichert eine variable Liste von Rundenwerten beim Abschließen. Ein neues Trends-Chart zeigt die Rundenzeit-Entwicklung. `Stepper.tsx` wird von reiner Wertanzeige auf ein editierbares `<input>` umgestellt.

**Tech Stack:** React 18 + TypeScript, Vite, Dexie (IndexedDB), react-router-dom. Kein Test-Framework im Projekt vorhanden (`package.json` hat nur `dev`/`build`/`preview`) — Verifikation je Task läuft über `npx tsc --noEmit` plus manuelle Prüfung im Dev-Server (`npm run dev`), analog zum bisherigen Vorgehen im Projekt.

## Global Constraints

- Alle Schema-Änderungen sind additiv (neue Tabelle/Version), bestehende Tabellen und Daten werden nicht migriert oder gelöscht.
- Bestehendes Verhalten von `RunDetailScreen` (Felder werden bei jedem Öffnen leer initialisiert, kein Nachladen alter Werte) bleibt für die neuen Runden-Felder konsistent — kein Pre-Fill aus der DB.
- Zeit-Runden und Distanz-Runden werden in Trends nicht gemischt (nur ein Chart für Zeit-Runden in diesem Schritt, siehe Spec).

---

### Task 1: Dexie-Schema erweitern (`interval_splits`) + `logSessionComplete` liefert ID zurück

**Files:**
- Modify: `src/db/dexie.ts`
- Modify: `src/db/queries/sessions.ts:45-53`

**Interfaces:**
- Produces: `export interface IntervalSplit { id?: number; session_log_id: number; round_number: number; time_sec: number | null; distance_km: number | null }` (aus `dexie.ts`)
- Produces: `db.interval_splits: Table<IntervalSplit>`
- Produces: `logSessionComplete(sessionId: number, logDate: string, rpe: number, durationActualMin?: number, distanceKm?: number): Promise<number>` (ändert sich von `Promise<void>` auf `Promise<number>`, liefert die neue `session_logs`-ID)

- [ ] **Step 1: `IntervalSplit`-Interface und Tabelle in `dexie.ts` ergänzen**

In `src/db/dexie.ts` nach dem `UserMeta`-Interface (vor `class Sub75DB`):

```ts
export interface IntervalSplit {
  id?: number
  session_log_id: number
  round_number: number
  time_sec: number | null
  distance_km: number | null
}
```

In der Klasse `Sub75DB`, Table-Deklaration ergänzen:

```ts
  interval_splits!: Table<IntervalSplit>
```

Nach dem bestehenden `this.version(2).stores({...})`-Block eine neue Version 3 ergänzen (v2-Block bleibt unverändert stehen):

```ts
    this.version(3).stores({
      sessions: '++id, week, day, [week+day]',
      exercises: '++id, session_id',
      logged_sets: '++id, [exercise_id+log_date+set_number], exercise_id, log_date',
      session_logs: '++id, session_id, log_date, [session_id+log_date]',
      hrv_logs: '++id, log_date',
      user_meta: 'key',
      interval_splits: '++id, session_log_id, [session_log_id+round_number]',
    })
```

- [ ] **Step 2: `logSessionComplete` die neue `session_logs`-ID zurückgeben lassen**

In `src/db/queries/sessions.ts`, Funktion `logSessionComplete` (Zeilen 45–53) ändern:

```ts
export async function logSessionComplete(
  sessionId: number,
  logDate: string,
  rpe: number,
  durationActualMin?: number,
  distanceKm?: number,
): Promise<number> {
  return db.session_logs.put({ session_id: sessionId, log_date: logDate, rpe, duration_actual_min: durationActualMin ?? null, distance_km: distanceKm ?? null, notes: null })
}
```

(`Table.put()` von Dexie liefert den Primärschlüssel der geschriebenen Zeile — bisher wurde der Rückgabewert verworfen, jetzt wird er durchgereicht.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler. (Der Aufrufer in `WorkoutDetailScreen.tsx` ruft `logSessionComplete` bereits ohne die Rückgabe zu verwenden auf — das bleibt mit dem neuen Rückgabetyp gültig.)

- [ ] **Step 4: Manuell im Dev-Server prüfen**

`npm run dev`, App öffnen, `indexedDB.databases()` in der Browser-Konsole ausführen → `sub75` sollte jetzt Version `30` melden (Dexie-Version 3 × 10). Über die Chrome-DevTools (Application → IndexedDB → sub75) prüfen, dass ein leerer Object Store `interval_splits` existiert.

- [ ] **Step 5: Commit**

```bash
git add src/db/dexie.ts src/db/queries/sessions.ts
git commit -m "feat: add interval_splits table (Dexie v3, additive) and return session_log id"
```

---

### Task 2: Query-Modul zum Speichern von Splits

**Files:**
- Create: `src/db/queries/splits.ts`

**Interfaces:**
- Consumes: `db` und `IntervalSplit` aus `../dexie` (Task 1)
- Produces: `export async function saveIntervalSplits(sessionLogId: number, splits: { roundNumber: number; timeSec: number | null; distanceKm: number | null }[]): Promise<void>`

- [ ] **Step 1: Datei anlegen**

```ts
// src/db/queries/splits.ts
import { db } from '../dexie'

export interface SplitInput {
  roundNumber: number
  timeSec: number | null
  distanceKm: number | null
}

export async function saveIntervalSplits(sessionLogId: number, splits: SplitInput[]): Promise<void> {
  await db.transaction('rw', db.interval_splits, async () => {
    await db.interval_splits.where('session_log_id').equals(sessionLogId).delete()
    if (splits.length) {
      await db.interval_splits.bulkAdd(
        splits.map(s => ({
          session_log_id: sessionLogId,
          round_number: s.roundNumber,
          time_sec: s.timeSec,
          distance_km: s.distanceKm,
        })),
      )
    }
  })
}
```

(Löschen-dann-Einfügen macht die Funktion idempotent, falls sie für dieselbe `session_log_id` erneut aufgerufen wird — auch wenn `RunDetailScreen` sie in diesem Schritt nur einmal pro Abschluss aufruft.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/db/queries/splits.ts
git commit -m "feat: add saveIntervalSplits query"
```

---

### Task 3: Runden-Erfassung in `RunDetailScreen`

**Files:**
- Modify: `src/screens/RunDetailScreen.tsx`

**Interfaces:**
- Consumes: `logSessionComplete` (jetzt `Promise<number>`, Task 1), `saveIntervalSplits` und `SplitInput` aus `../db/queries/splits` (Task 2)

- [ ] **Step 1: Erkennungs-Helper für Runden-Eingabetyp ergänzen**

In `src/screens/RunDetailScreen.tsx`, nach der bestehenden Funktion `parseRunSteps` (nach Zeile 28), neue Helper einfügen:

```ts
type RoundInputType = 'time' | 'distance' | null

function getRoundInputType(intervals: RouteState['intervals'], notes: string | null): RoundInputType {
  if (intervals && intervals.workSec > 0) return 'distance'
  if (intervals && intervals.rounds > 0) return 'time'
  if (notes && /\d+\s*[x×]\s*\d/i.test(notes)) return 'time'
  return null
}

function getSuggestedRoundCount(intervals: RouteState['intervals'], notes: string | null): number {
  if (intervals?.rounds) return intervals.rounds
  const match = notes?.match(/(\d+)\s*[x×]/i)
  return match ? Number(match[1]) : 0
}

function parseRoundValue(raw: string, type: 'time' | 'distance'): { timeSec: number | null; distanceKm: number | null } {
  const trimmed = raw.trim()
  if (!trimmed) return { timeSec: null, distanceKm: null }
  if (type === 'time') {
    const m = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/)
    if (m) return { timeSec: Number(m[1]) * 60 + Number(m[2]), distanceKm: null }
    const n = parseFloat(trimmed.replace(',', '.'))
    return { timeSec: Number.isFinite(n) ? n : null, distanceKm: null }
  }
  const n = parseFloat(trimmed.replace(',', '.'))
  return { timeSec: null, distanceKm: Number.isFinite(n) ? n : null }
}
```

- [ ] **Step 2: State für die Rundenliste ergänzen**

Import-Zeile ergänzen (`useState` → zusätzlich `useRef`):

```ts
import { useState, useRef } from 'react'
```

Import für `saveIntervalSplits`:

```ts
import { saveIntervalSplits, type SplitInput } from '../db/queries/splits'
```

Im Funktionskörper, nach der bestehenden Zeile `const [showTimer, setShowTimer] = useState(false)`, ergänzen:

```ts
  const roundInputType = getRoundInputType(intervals, notes)
  const roundIdCounter = useRef(0)
  const [rounds, setRounds] = useState(() =>
    Array.from({ length: getSuggestedRoundCount(intervals, notes) }, () => ({ id: roundIdCounter.current++, value: '' })),
  )

  function addRound() {
    setRounds(rs => [...rs, { id: roundIdCounter.current++, value: '' }])
  }
  function removeRound(id: number) {
    setRounds(rs => rs.filter(r => r.id !== id))
  }
  function updateRound(id: number, value: string) {
    setRounds(rs => rs.map(r => (r.id === id ? { ...r, value } : r)))
  }
```

- [ ] **Step 3: `handleFinish` um das Speichern der Splits erweitern**

Bestehende Funktion (Zeilen 46–55) ersetzen durch:

```ts
  async function handleFinish() {
    if (!rpe) { alert('Bitte bewerte die Intensität (1–10)'); return }
    const sessionLogId = await logSessionComplete(
      Number(sessionId), date!, rpe,
      actualDurationNum > 0 ? actualDurationNum : duration,
      distanceNum > 0 ? distanceNum : undefined,
    )
    if (roundInputType) {
      const splits: SplitInput[] = rounds
        .map((r, i) => ({ roundNumber: i + 1, ...parseRoundValue(r.value, roundInputType) }))
        .filter(s => s.timeSec !== null || s.distanceKm !== null)
      if (splits.length) await saveIntervalSplits(sessionLogId, splits)
    }
    setDone(true)
    setTimeout(() => navigate(-1), 800)
  }
```

- [ ] **Step 4: „Runden"-Karte in der UI ergänzen**

Nach dem Card-Block „Tatsächliche Dauer (Min)" (endet mit `</div>` vor der „Distanz gelaufen"-Karte, aktuell Zeile 115), neue Karte einfügen — nur wenn `roundInputType` gesetzt ist:

```tsx
      {roundInputType && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
            Runden {roundInputType === 'time' ? '(Zeit mm:ss)' : '(Distanz km)'}
          </div>
          {rounds.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
              <div style={{ width: 56, fontSize: 13, color: colors.textSecondary }}>Runde {i + 1}</div>
              <input
                type="text" inputMode={roundInputType === 'time' ? 'text' : 'decimal'}
                placeholder={roundInputType === 'time' ? 'z.B. 4:35' : 'z.B. 1.0'}
                value={r.value}
                onChange={e => updateRound(r.id, e.target.value)}
                style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm, color: colors.textPrimary, fontSize: 15 }}
              />
              <button
                onClick={() => removeRound(r.id)}
                style={{ width: 28, height: 28, borderRadius: radius.sm, background: colors.cardAlt, color: colors.textSecondary, fontSize: 14, border: 'none' }}
              >×</button>
            </div>
          ))}
          <button
            onClick={addRound}
            style={{ background: colors.cardAlt, color: colors.textPrimary, borderRadius: radius.sm, padding: spacing.sm, fontSize: 13, fontWeight: 600, border: 'none' }}
          >+ Runde hinzufügen</button>
        </div>
      )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 6: Manuell im Dev-Server prüfen**

`npm run dev`, im Browser zu Woche → einer Session mit `notes` wie „5×1 km…" navigieren (z.B. Woche 10, Freitag „Intervalle"). Prüfen:
- Karte „Runden (Zeit mm:ss)" erscheint mit 5 leeren Zeilen.
- Werte `4:35`, `4:30`, `4:31`, `4:36`, `4:35` eintragen, „Training abschließen" klicken.
- In den Chrome-DevTools (Application → IndexedDB → sub75 → interval_splits) prüfen, dass 5 Zeilen mit den passenden `time_sec`-Werten (275, 270, 271, 276, 275) gespeichert wurden und `session_log_id` auf die zugehörige `session_logs`-Zeile zeigt.
- Zusätzlich eine HIIT-Session (z.B. Woche 10, Montag) öffnen und prüfen, dass dort „Runden (Distanz km)" mit 4 Zeilen erscheint statt Zeit-Feldern.
- Eine normale Lauf-Session ohne Intervalle öffnen (z.B. „Langer Lauf") und prüfen, dass keine Runden-Karte erscheint.

- [ ] **Step 7: Commit**

```bash
git add src/screens/RunDetailScreen.tsx
git commit -m "feat: capture per-round splits (time or distance) on RunDetailScreen"
```

---

### Task 4: Trends-Query und Chart für Ø Rundenzeit

**Files:**
- Modify: `src/db/queries/trends.ts`
- Modify: `src/screens/TrendsScreen.tsx`

**Interfaces:**
- Consumes: `db.interval_splits`, `db.session_logs` (Task 1)
- Produces: `export async function getSplitConsistencyTrend(limit = 10): Promise<TrendPoint[]>`

- [ ] **Step 1: Query ergänzen**

In `src/db/queries/trends.ts`, am Ende der Datei ergänzen:

```ts
export async function getSplitConsistencyTrend(limit = 10): Promise<TrendPoint[]> {
  const logs = await db.session_logs.orderBy('log_date').toArray()
  const points: TrendPoint[] = []
  for (const log of logs) {
    if (!log.id) continue
    const splits = await db.interval_splits.where('session_log_id').equals(log.id).toArray()
    const times = splits.map(s => s.time_sec).filter((t): t is number => t != null && t > 0)
    if (times.length === 0) continue
    const avgSec = times.reduce((a, b) => a + b, 0) / times.length
    points.push({
      label: new Date(log.log_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      value: avgSec / 60,
    })
  }
  return points.slice(-limit)
}
```

(`value` ist wie beim bestehenden Pace-Chart in Dezimal-Minuten, damit dieselbe `formatValue`-Formatierung in mm:ss wiederverwendet werden kann.)

- [ ] **Step 2: Chart in `TrendsScreen` ergänzen**

In `src/screens/TrendsScreen.tsx`:

Import-Zeile erweitern:

```ts
import { getWeeklyLoad, getPaceTrend, getLoggedExerciseNames, getExerciseWeightTrend, getSplitConsistencyTrend, type TrendPoint } from '../db/queries/trends'
```

Neuen State ergänzen (bei den anderen `useState`-Aufrufen):

```ts
  const [splitConsistency, setSplitConsistency] = useState<TrendPoint[]>([])
```

Im ersten `useEffect` (`load_`-Funktion) die `Promise.all`-Destructuring erweitern:

```ts
      const [l, p, h, names, sc] = await Promise.all([
        getWeeklyLoad(), getPaceTrend(), getRecentHrv(30), getLoggedExerciseNames(), getSplitConsistencyTrend(),
      ])
```

und direkt danach ergänzen:

```ts
      setSplitConsistency(sc)
```

Neue Chart-Karte einfügen, direkt nach der bestehenden „Pace-Trend (Läufe)"-Karte:

```tsx
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Ø Rundenzeit (Intervalle)</div>
        <LineChart data={splitConsistency} color={colors.indigo} unit="min/Runde" formatValue={n => `${Math.floor(n)}:${Math.round((n % 1) * 60).toString().padStart(2, '0')}`} />
      </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Manuell im Dev-Server prüfen**

Nach dem Speichern der Runden aus Task 3 Step 6: `/trends` öffnen, prüfen dass die Karte „Ø Rundenzeit (Intervalle)" erscheint und für die eingetragenen 5 Runden (4:35/4:30/4:31/4:36/4:35, Ø 4:33,4) einen Wert nahe `4:33` anzeigt. Eine Session ohne Splits sollte die Karte nicht beeinflussen (leerer Trend → „Noch keine Daten").

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/trends.ts src/screens/TrendsScreen.tsx
git commit -m "feat: add avg round-time trend chart"
```

---

### Task 5: `Stepper` auf tippbare Zahleneingabe umstellen

**Files:**
- Modify: `src/components/Stepper.tsx`
- Modify: `src/theme/global.css`

**Interfaces:**
- Keine Änderung der Props-Schnittstelle (`value`, `unit`, `step`, `min`, `onChange` bleiben gleich) — `SetLogger.tsx` braucht keine Anpassung.

- [ ] **Step 1: CSS-Utility zum Ausblenden der nativen Spinner-Pfeile ergänzen**

In `src/theme/global.css` am Ende ergänzen:

```css
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
}
```

- [ ] **Step 2: `Stepper.tsx` umbauen**

Kompletter neuer Inhalt von `src/components/Stepper.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { colors, radius } from '../theme/colors'

interface Props {
  value: number
  unit: string
  step: number
  min?: number
  onChange: (value: number) => void
}

export function Stepper({ value, unit, step, min = 0, onChange }: Props) {
  const [text, setText] = useState(String(value))

  useEffect(() => { setText(String(value)) }, [value])

  function commit(raw: string) {
    const n = parseFloat(raw.replace(',', '.'))
    if (Number.isFinite(n)) onChange(Math.max(min, n))
    else setText(String(value))
  }

  const btnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: radius.sm, background: colors.cardAlt, color: colors.blue,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, border: 'none',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bg, borderRadius: radius.md, padding: '8px 12px' }}>
      <button style={btnStyle} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <div style={{ textAlign: 'center' }}>
        <input
          className="no-spinner"
          type="number"
          inputMode="decimal"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={e => commit(e.target.value)}
          style={{
            width: 64, textAlign: 'center', fontSize: 20, fontWeight: 800, color: colors.textPrimary,
            background: 'transparent', border: 'none', outline: 'none',
          }}
        />
        <div style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase' }}>{unit}</div>
      </div>
      <button style={btnStyle} onClick={() => onChange(value + step)}>+</button>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Manuell im Dev-Server prüfen**

`npm run dev`, zu einer Kraft-Session navigieren (z.B. „Kraftausdauer" von heute), einen Satz aufklappen:
- Auf die kg-Zahl tippen/klicken → Zifferntastatur/Cursor erscheint, direktes Eintippen von z.B. `87` funktioniert.
- Feld verlassen (Blur) → Wert wird über `onChange` übernommen, `−`/`+`-Buttons funktionieren weiterhin in 2,5-kg-Schritten ausgehend vom neuen Wert.
- Ungültige Eingabe (z.B. Feld leeren und Blur auslösen) → Wert springt zurück auf den letzten gültigen Wert statt `NaN` anzuzeigen.
- Gleiches Verhalten für das Wdh-Feld (Stepper mit `step={1}`) prüfen.

- [ ] **Step 5: Commit**

```bash
git add src/components/Stepper.tsx src/theme/global.css
git commit -m "feat: make Stepper value directly typeable instead of button-only"
```

---

## Nach Abschluss aller Tasks

- [ ] `npm run build` einmal komplett durchlaufen lassen (prüft `tsc` + Vite-Build zusammen, wie im bestehenden Deploy-Workflow).
- [ ] Mit dem Nutzer klären, ob & wann gepusht werden soll (siehe Guardrail-Bestätigungspflicht aus der bisherigen Session für `git push` auf `github.com/StFr84/sub75-web`).
