# Coach – regelbasierte Trainings-Insights

Status: implementiert (Phase 1)
Datum: 2026-07-30

## Kontext

Wunsch nach einem "virtuellen Sparringspartner", der auf Basis der eigenen Trainingsdaten proaktiv Feedback gibt (z.B. "Schwelle hat sich verschoben", "HRV seit Tagen niedriger") und auf Nachfrage Auskunft über den Stand im Verhältnis zum Saisonziel gibt (Hyrox Karlsruhe Sub-75, Frankfurt Sub-70).

`sub75-web` ist eine rein clientseitige PWA (Vite/React, Daten in Dexie/IndexedDB, gehostet auf GitHub Pages) ohne Backend. Ein LLM-gestützter Chat würde einen Server zum Schutz des API-Keys erfordern und laufende Kosten verursachen. Entscheidung: zunächst **Phase 1 – regelbasiert**, komplett lokal, kein neuer Server. Ein LLM-Layer (Phase 2) bleibt als späterer, separater Schritt möglich, ist aber nicht Teil dieser Umsetzung.

Harter Rand-Constraint (wie beim letzten Umbau): Schema-Änderungen sind additiv, bestehende Tabellen/Daten bleiben unangetastet.

## Architektur

Neues Modul `src/insights/`:

- `types.ts` — `Insight`-Interface, strukturiert (nicht nur Freitext), damit ein künftiger LLM-Layer dieselben Objekte als Kontext nutzen könnte, ohne die Regeln umzubauen.
- `rules.ts` — eine reine Funktion pro Erkenntnis-Typ, liest Dexie-Daten, gibt `Insight | null` zurück.
- `engine.ts` — `runInsightEngine(today?)` führt alle Regeln aus, fängt Fehler pro Regel ab (eine datenarme/kaputte Regel darf die anderen nicht crashen lassen), sortiert nach Schweregrad.

Persistenz nur für Lese-/Dismiss-Status, additive Dexie-Version 4:

```ts
interface InsightState { id: string; seen: number; dismissed: number }
insight_state: 'id'
```

Insight-IDs binden das Tagesdatum ein (z.B. `hrv-drop-2026-07-30`) — dadurch "verfallen" gesehene/verworfene Insights natürlich am nächsten Tag, ohne dass eine Ablauf-Logik nötig ist.

`src/db/queries/insightState.ts`: `getInsightState`, `markInsightsSeen`, `dismissInsight`, `getUnseenInsightCount`.

## Phase-1-Regeln

- **HRV-Trend** (`hrvTrendRule`): 3–7-Tage-Schnitt vs. 30-Tage-Baseline aus `hrv_logs`. Trigger ab −10% Abweichung (Severity `info`), ab −20% `attention`. Ergänzt die bestehende Tages-Ampel (`HrvAmpelCard`/`getHrvStatus`) um ein mehrtägiges Trendsignal.
- **Schwellen-Shift** (`thresholdShiftRule`): Pace der letzten 3 vs. vorherigen 3 TDL/ETL-Läufe (90-Tage-Fenster). Ab 3% Verbesserung → positive Insight.
- **Wettkampf-Prognose** (`racePredictionRule`): Ø-Pace der letzten 21 Tage TDL/ETL-Läufe vs. IAS-Zielpace (12,5 km/h aus dem Athletenprofil). Bewertet explizit nur die Lauf-Komponente — Stationen/Sled sind im Datenmodell nicht zeitbasiert erfasst, daher keine Gesamtzeit-Prognose in Minuten, sondern ein Pace-Abstand zum Ziel.
- **Trainingslast** (`loadTrendRule`): letzte Woche vs. Schnitt der Vorwochen (`getWeeklyLoad`), Trigger ab ±40% Abweichung.

Jede Regel verlangt eine Mindestdatenmenge und liefert sonst `null` (z.B. HRV erst ab 5 aktuellen + 10 Baseline-Tagen).

## UI & Navigation

- Neuer Bottom-Nav-Tab **Coach** zwischen Trends und Plan, mit gelbem Badge-Punkt bei ungesehenen Insights (`getUnseenInsightCount`, neu berechnet bei jedem Routenwechsel).
- `CoachScreen`: Liste von `InsightCard`s im bestehenden Card-Stil, linker Rand farbig nach Severity (grün=positiv, gelb=attention, blau=info), inkl. „×"-Dismiss pro Karte. Leerer Zustand mit erklärendem Hinweistext.
- Beim Öffnen des Coach-Screens werden alle aktuell berechneten Insight-IDs als „gesehen" markiert (Badge verschwindet).

Verifiziert im Dev-Server: Rendering, Badge-Erscheinen/-Verschwinden, Dismiss-Verhalten, keine Regressionen auf Today/Trends, `tsc --noEmit` und `vite build` sauber.

## Phase 2 (nicht Teil dieses Schritts)

Freie Konversation mit einem LLM über die eigenen Trainingsdaten. Würde einen kleinen Serverless-Proxy für den API-Key sowie laufende API-Kosten erfordern. Die `Insight`-Struktur ist bewusst so gehalten, dass sie später als Kontext für ein LLM dienen kann, ohne die Phase-1-Regeln umzubauen.

## Nicht Teil dieses Schritts

- LLM-Chat / freie Rückfragen.
- Push-Benachrichtigungen (Badge ist rein in-app).
- Zeitbasierte Stationen-/Sled-Erfassung als Grundlage für eine echte Gesamtzeit-Prognose.
