# Intervall-Splits & präzise Gewichtseingabe

Status: approved
Datum: 2026-07-30

## Kontext

Zwei unabhängige Verbesserungen an der bestehenden `sub75-web` PWA:

1. Bei Intervall-Läufen (z.B. "5×1 km bei ETL-Pace") und HIIT-Einheiten (z.B. "4×4 Min >165 bpm") lässt sich aktuell nur eine Gesamtdauer und Gesamtdistanz pro Einheit erfassen (`RunDetailScreen`, `session_logs.duration_actual_min` / `distance_km`). Einzelne Rundenwerte (Splits) gehen verloren.
2. Die Gewichtseingabe bei Kraftübungen (`Stepper.tsx`, genutzt in `SetLogger.tsx`) erlaubt nur ±2,5 kg-Schritte über Buttons — bei schweren Sled-Lasten (z.B. 85–87 kg) unpraktikabel.

Harter Rand-Constraint (Nutzerwunsch nach dem Datenverlust beim letzten App-Umbau): alle Schema-Änderungen müssen additiv sein und dürfen bestehende Tabellen/Daten nicht anfassen oder migrieren.

## Teil A — Datenmodell für Rundensplits

Neue Dexie-Tabelle, additiv als Schema-Version 3:

```ts
export interface IntervalSplit {
  id?: number
  session_log_id: number   // FK -> session_logs.id
  round_number: number
  time_sec: number | null
  distance_km: number | null
}
```

```ts
this.version(3).stores({
  // ... v2 stores unverändert ...
  interval_splits: '++id, session_log_id, [session_log_id+round_number]',
})
```

`session_log_id` verweist auf die stabile ID der `session_logs`-Zeile (wird nie durch den Plan-Reseed neu erzeugt), damit Splits auch nach künftigen Plan-Umbauten an der richtigen Historie hängen bleiben.

### Erkennung des Eingabetyps pro Runde

Bestimmt beim Öffnen von `RunDetailScreen` anhand der Session:

- `intervals.workSec > 0` (feste Arbeitszeit pro Runde, z.B. HIIT 4×4 Min) → Eingabetyp **Distanz** (km) pro Runde.
- Kein festes `workSec`, aber Rundenanzahl aus `intervals.rounds` oder aus einem Freitext-Muster wie `5×1 km` in `notes` (Regex, angelehnt an das bereits vorhandene `\dx\d`-Muster in `parseRunSteps`) ableitbar → Eingabetyp **Zeit** (`mm:ss`) pro Runde.
- Weder noch → keine Runden-Karte, Verhalten bleibt wie bisher.

Die abgeleitete Rundenzahl ist nur eine Vorbelegung der Liste, keine feste Vorgabe.

## Teil B — UI & Trends

### RunDetailScreen

Neue Karte „Runden" zwischen „Tatsächliche Dauer" und „Distanz gelaufen", nur sichtbar wenn ein Eingabetyp erkannt wurde:

- Eine Zeile pro Runde: Label „Runde N", ein Eingabefeld (Zeit als `mm:ss`-Text oder Distanz als Dezimalzahl je nach erkanntem Typ), ein „×"-Button zum Entfernen.
- „+ Runde hinzufügen" am Ende der Liste.
- Vorbelegt mit der aus dem Plan abgeleiteten Rundenzahl (leere Felder), frei editierbar (hinzufügen/entfernen).

Zeit-Parsing: `mm:ss` (z.B. `4:35`) wird zu Sekunden konvertiert; reine Zahl wird als Sekunden interpretiert.

### Speichern

`logSessionComplete` gibt künftig die `session_logs`-ID zurück (Dexie `put` liefert den Key). Beim Abschließen der Einheit werden vorhandene Splits für diese `session_log_id` gelöscht und die aktuelle Liste neu eingefügt (Überschreiben erlaubt erneutes Bearbeiten).

### Trends

Neue Query `getSplitConsistencyTrend(limit = 10)`: über die letzten Einheiten mit Zeit-Runden (nur `time_sec`-Splits, keine Distanz-Runden gemischt) wird pro Einheit die durchschnittliche Rundenzeit berechnet und als neues Chart „Ø Rundenzeit" in `TrendsScreen` angezeigt (gleiches `LineChart`-Muster wie das bestehende Pace-Chart).

Ein analoges Chart für Distanz-Runden (HIIT) ist explizit **nicht** Teil dieses Schritts (YAGNI, kein aktueller Anwendungsfall) — kann bei Bedarf separat ergänzt werden.

## Teil C — Präzise Gewichtseingabe

`Stepper.tsx`: die zentrale Wertanzeige wird durch ein echtes `<input type="number" inputMode="decimal">` ersetzt (statt reinem `<div>`), gleiche Optik (zentriert, fett). Antippen öffnet die native Zifferntastatur des Geräts, Eingabe ist frei editierbar. Die bestehenden `−`/`+`-Buttons (2,5 kg-Schritt) bleiben für Schnellkorrekturen erhalten und schreiben weiterhin direkt auf denselben `value`.

Betrifft `Stepper.tsx` zentral, wirkt sich also gleichermaßen auf Gewicht- und Wiederholungs-Eingabe in `SetLogger.tsx` aus.

## Nicht Teil dieses Schritts

- Live-Stoppuhr-Erfassung der Runden während der Timer läuft (Nutzer hat sich explizit für nachträgliche Eingabe entschieden).
- Trends-Chart für Distanz-Runden (HIIT-Typ).
- Änderungen an `plan.json`, um Distanz-Intervalle strukturiert (statt per Freitext-Erkennung) abzubilden.
