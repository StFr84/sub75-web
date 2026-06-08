# Changelog — Sub75 Web App

Jede Änderung an der App wird hier dokumentiert, damit bei Problemen der genaue Zeitpunkt und Umfang der Änderung nachvollzogen werden kann.

Format: `[Datum] Commit · Bereich · Beschreibung · Betroffene Dateien`

---

## v1.0.0 — 2026-06-07 · Erstveröffentlichung

### 20:39 · `e482cb2` · Deployment
**GitHub Actions Workflow für automatisches Deployment zu GitHub Pages**
- Neu: `.github/workflows/deploy.yml`
- Trigger: jeder Push auf `main`
- Build: `npm ci && npm run build` auf Ubuntu/Node 20
- Deploy: `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`
- Live-URL: https://stfr84.github.io/sub75-web/

---

### 20:38 · `3813947` · Screen: Profil
**ProfileScreen mit JSON-Export und -Import**
- Neu: `src/screens/ProfileScreen.tsx`
- Athletendaten: Steven Fredrickson, 190 cm, 84,4 kg, 41 J
- Leistungswerte: HRmax 170, VO2max 50,8, LT1 148 bpm, IAS 162 bpm
- Trainingszonen: LDL / MDL / TDL / ETL / Max mit Pace und HF-Bereichen
- Export: alle IndexedDB-Daten als `sub75-backup-YYYY-MM-DD.json`
- Import: JSON einlesen, nur Logs wiederhergestellt (Sessions bleiben aus plan.json)

---

### 20:38 · `17c2687` · Screens: Stats + Plan
**StatsScreen und PlanScreen**

StatsScreen (`src/screens/StatsScreen.tsx`):
- Countdown: Tage bis Karlsruhe (18./19. Okt) und Frankfurt (13. Dez)
- Planfortschritts-Balken (Woche X von 30, %-Anzeige)
- Diese-Woche-Block: erledigt / geplant / Trainingstreue %
- Wochenpunkte-Dots (Mo–So) farblich nach Typ (grün = Lauf, indigo = Kraft)
- Letzte 7 Einheiten aus session_logs (Datum, Dauer, RPE)

PlanScreen (`src/screens/PlanScreen.tsx`):
- Countdown bis Karlsruhe (Sub 75) und Frankfurt (Sub 70)
- 8 Phasen-Accordion: Comeback → Base → Build 1 → Peak 1 → Race 1 → Recovery → Build 2 → Race 2
- Aktuelle Phase hervorgehoben (grüner Hintergrund + "jetzt"-Badge)
- Accordion aufklappbar mit Phasenziel

---

### 20:38 · `d54cf56` · Screens: Workout + Lauf Detail
**WorkoutDetailScreen und RunDetailScreen**

WorkoutDetailScreen (`src/screens/WorkoutDetailScreen.tsx`):
- Lädt alle Übungen der Session aus IndexedDB
- Pro Übung: ExerciseRow mit SetLogger, ⓘ-Anleitung, Satz/Wdh/kg/✓
- RPE-Picker 1–10 nach dem Training
- "Einheit abschließen ✓" → schreibt session_log → zurück zur vorherigen Seite

RunDetailScreen (`src/screens/RunDetailScreen.tsx`):
- Parst `notes`-Feld zu Schritten: Einlaufen → Hauptblock → Auslaufen
- Erkennt Trainingstypen: Standard, HIIT, Fahrtspiel, Deload
- RPE-Picker 1–10
- "Training abschließen" → schreibt session_log mit Dauer

---

### 20:38 · `19d3886` · Screen: Woche
**WeekScreen mit Verschiebe-Dropdown**
- Neu: `src/screens/WeekScreen.tsx`
- Wochenwechsel per ‹ / › (Woche 1–30)
- Summary-Bar: Einheiten / Minuten / Erledigt
- Session-Cards mit farbigem Akzentstreifen (grün = Lauf, indigo = Kraft)
- "Heute"-Badge auf aktueller Session
- Vergangene, nicht absolvierte Sessions: 60% Opacity
- ⇄-Button öffnet Dropdown: Session auf freien Tag verschieben oder mit anderer tauschen
- Dropdown schließt beim Klick außerhalb (mousedown listener)

---

### 20:38 · `67367ae` · Screen: Heute
**TodayScreen mit Streak und Trainings-Card**
- Neu: `src/screens/TodayScreen.tsx`
- Begrüßung zeitabhängig: Guten Morgen / Guten Tag / Guten Abend
- Streak-Anzeige (Tage in Folge aus session_logs)
- Countdown-Karte wenn `heute < Trainingsstart (24. Mai 2026)`
- Heutige Session-Card (TrainingCard-Komponente)
- Fallback: Ruhetag-Karte wenn keine Session geplant

---

### 20:31 · `4101d3d` · Komponenten: TrainingCard, SetLogger, ExerciseRow
**Kern-Komponenten mit Info-Button**

TrainingCard (`src/components/TrainingCard.tsx`):
- Zeigt Session-Typ, Titel, Dauer, Zone
- "Erledigt"-Badge wenn abgeschlossen
- "Training starten →" navigiert zu WorkoutDetail oder RunDetail
- Farbcodierung: grün = Lauf, indigo = Kraft

SetLogger (`src/components/SetLogger.tsx`):
- Tabelle: Satz / Wdh / kg / ✓
- Uncontrolled inputs mit `useRef` für Live-Tracking
- Checkmark-Button togglet completed-Status in IndexedDB
- Zeigt letztes verwendetes Gewicht als Placeholder

ExerciseRow (`src/components/ExerciseRow.tsx`):
- Aufklappbare Reihe pro Übung (expandiert SetLogger)
- ⓘ-Button öffnet inline Ausführungsanleitung (aus exercise-instructions.ts)
- Fortschritts-Anzeige: erledigte Sätze / Gesamtsätze

---

### 20:31 · `d98792a` · App Shell: Router + Sidebar
**App-Grundstruktur mit Navigation**

`src/App.tsx`:
- BrowserRouter mit `basename="/sub75-web"`
- Seed-on-mount: `seedIfNeeded()` beim ersten Laden
- Lade-Spinner während DB initialisiert wird
- 7 Routen: `/`, `/week`, `/stats`, `/plan`, `/profile`, `/workout/:id/:date`, `/run/:id/:date`

`src/components/Sidebar.tsx`:
- Desktop: feste Sidebar (200px) mit SUB75-Logo und 5 NavLinks
- Mobile: Bottom-Tab-Leiste mit Icons und Labels
- Aktiver Link hervorgehoben (grün)

`src/main.tsx`:
- React 18 `createRoot`
- Importiert `global.css`

---

### 20:28 · `74a028b` · Datenbank: Seed
**Automatisches Befüllen der IndexedDB aus plan.json**
- Neu: `src/db/seed.ts`
- `seedIfNeeded()`: prüft `user_meta.plan_version` — überspringt wenn aktuell
- Bei neuer Version: löscht alle Tabellen und lädt plan.json neu ein
- Schreibt Sessions, Übungen und Plan-Version in einer Transaktion

---

### 20:28 · `bd5d8d1` · Datenbank: Schema + Queries
**Dexie.js IndexedDB-Schema und alle Datenbankfunktionen**

`src/db/dexie.ts` — Tabellen:
- `sessions`: Trainingseinheiten (week, day, type, title, duration_min, zone, phase, notes)
- `exercises`: Übungen je Session (session_id, name, sets, reps, hint)
- `logged_sets`: Protokollierte Sätze (exercise_id, log_date, set_number, reps_done, weight_kg, completed)
- `session_logs`: Abgeschlossene Sessions (session_id, log_date, rpe, duration_actual_min)
- `user_meta`: Key/Value für Einstellungen (plan_version)
- Compound-Indexes: `[week+day]`, `[exercise_id+log_date+set_number]`, `[session_id+log_date]`

`src/db/queries/sessions.ts`:
- `getSessionForDate(date)` — Session für ein Datum (über week+day Index)
- `getSessionsForWeek(week)` — alle Sessions einer Woche
- `getExercisesForSession(id)` — Übungen einer Session
- `logSessionComplete(id, date, rpe, duration?)` — Session abschließen
- `getCompletedSessionIds(week)` — erledigte Session-IDs der Woche
- `getStreak()` — Streak in Tagen (überspringt Ruhetage)
- `moveSession(id, newDay)` — Session auf anderen Tag verschieben
- `swapSessionDays(id1, day1, id2, day2)` — zwei Sessions tauschen

`src/db/queries/sets.ts`:
- `getSetsForExerciseOnDate(exerciseId, date)` — Sätze einer Übung
- `getLastWeightForExercise(exerciseId)` — letztes verwendetes Gewicht
- `upsertSet(...)` — Satz anlegen oder aktualisieren

`src/db/queries/logs.ts`:
- `getRecentSessionLogs(days)` — letzte N Tage Session-Logs
- `isSessionCompleted(sessionId, date)` — Abschluss-Check

---

### 20:21 · `c2ad3a3` · Datendateien
**Trainingsdaten und Übungsanleitungen**
- Kopiert: `src/data/plan.json` (30 Wochen, alle Sessions und Übungen, Version 3)
- Kopiert: `src/data/constants.ts` (TRAIN_START 24.05.2026, RACE1 18.10.2026, RACE2 13.12.2026, TOTAL_WEEKS 30)
- Neu: `src/data/exercise-instructions.ts` — 33 Hyrox-Übungen mit deutschen Schritt-für-Schritt-Anleitungen

---

### 20:21 · `8e34132` · Theme: Farben + CSS
**Dark-Theme und responsives Layout**
- Kopiert: `src/theme/colors.ts` (bg, card, green, indigo, red, yellow, border, textPrimary, textSecondary, black, white, greenDim, greenBorder + radius + spacing)
- Neu: `src/theme/global.css`
  - CSS Reset
  - Body: `#0d0d0d`, System-Font-Stack (SF Pro / Segoe UI / sans-serif)
  - `.app-shell`: Flex-Container
  - `.sidebar`: 200px fest, fixed, Desktop
  - `.sidebar-logo`, `.sidebar-link`, `.sidebar-link.active`
  - `.main-content`: margin-left 200px, max-width 720px
  - `.bottom-tabs`: fixed bottom, nur mobil sichtbar
  - `@media (max-width: 768px)`: Sidebar ausgeblendet, Bottom-Tabs aktiv, padding-bottom 88px

---

### 16:49 · `c155e88` · Projekt-Grundgerüst
**Initialer Vite + React + TypeScript Scaffold**
- Neu: `package.json` (react 18.3, react-dom, react-router-dom 6, dexie 4)
- Neu: `vite.config.ts` (base: `/sub75-web/`, @vitejs/plugin-react)
- Neu: `tsconfig.json` (strict, jsx: react-jsx, moduleResolution: bundler)
- Neu: `index.html` (apple-mobile-web-app Meta-Tags, DE lang)
- Neu: `.gitignore`
- Neu: `src/App.tsx`, `src/main.tsx` (Stubs)
- Git-Repository initialisiert
- `npm install` + `npm run build` erfolgreich

---

## Projektkontext

| | |
|---|---|
| **Projekt** | Sub75 Hyrox Training Web App |
| **Athlet** | Steven Fredrickson, 41 J, 190 cm, 84,4 kg |
| **Ziel 1** | Hyrox Karlsruhe 18./19. Okt 2026 · Sub 75 Min |
| **Ziel 2** | Hyrox Frankfurt 13. Dez 2026 · Sub 70 Min |
| **Trainingsstart** | 24. Mai 2026 (Comeback nach Krankheitspause) |
| **Tech Stack** | Vite 5 · React 18 · TypeScript 5 · Dexie.js 4 · React Router 6 |
| **Hosting** | GitHub Pages · https://stfr84.github.io/sub75-web/ |
| **Repo** | https://github.com/StFr84/sub75-web |
| **Deployment** | GitHub Actions bei jedem Push auf `main` |
| **Datenhaltung** | IndexedDB (Dexie.js) · lokal im Browser · Export/Import als JSON |
