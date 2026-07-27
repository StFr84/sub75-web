import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { colors, spacing, radius } from '../theme/colors'
import { ExerciseRow } from '../components/ExerciseRow'
import { Timer } from '../components/Timer'
import { getExercisesForSession, logSessionComplete, type Exercise } from '../db/queries/sessions'
import { getSetsForExerciseOnDate, getLastWeightForExercise, upsertSet, type LoggedSet } from '../db/queries/sets'

const REST_SECONDS = 90

export function WorkoutDetailScreen() {
  const navigate = useNavigate()
  const { sessionId, date } = useParams<{ sessionId: string; date: string }>()
  const sessionIdNum = Number(sessionId)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sets, setSets] = useState<Record<number, LoggedSet[]>>({})
  const [lastWeights, setLastWeights] = useState<Record<number, number | null>>({})
  const [rpe, setRpe] = useState<number | null>(null)
  const [resting, setResting] = useState(false)

  useEffect(() => {
    async function load() {
      const exs = await getExercisesForSession(sessionIdNum)
      setExercises(exs)
      const setsMap: Record<number, LoggedSet[]> = {}
      const weightsMap: Record<number, number | null> = {}
      for (const ex of exs) {
        setsMap[ex.id!] = await getSetsForExerciseOnDate(ex.id!, date!)
        weightsMap[ex.id!] = await getLastWeightForExercise(ex.id!)
      }
      setSets(setsMap)
      setLastWeights(weightsMap)
    }
    load()
  }, [sessionIdNum, date])

  const handleSetChange = useCallback(async (
    exerciseId: number, setNumber: number,
    reps: number | null, weight: number | null, completed: boolean,
  ) => {
    await upsertSet(exerciseId, date!, setNumber, reps, weight, completed)
    const updated = await getSetsForExerciseOnDate(exerciseId, date!)
    setSets(prev => ({ ...prev, [exerciseId]: updated }))
    if (completed) setResting(true)
  }, [date])

  async function handleFinish() {
    if (rpe === null) { alert('Bitte gib deinen RPE-Wert (1–10) ein.'); return }
    await logSessionComplete(sessionIdNum, date!, rpe)
    navigate(-1)
  }

  if (resting) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, paddingTop: spacing.xl }}>
        <button onClick={() => setResting(false)} style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'left', background: 'none', border: 'none' }}>← Pause überspringen</button>
        <Timer rounds={1} workSec={0} restSec={REST_SECONDS} label="Satzpause" onDone={() => setResting(false)} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <button onClick={() => navigate(-1)} style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'left', marginBottom: spacing.xs, background: 'none', border: 'none' }}>← Zurück</button>

      {exercises.map(ex => (
        <ExerciseRow
          key={ex.id}
          exercise={ex}
          sets={sets[ex.id!] ?? []}
          lastWeight={lastWeights[ex.id!] ?? null}
          onSetChange={(setNum, reps, weight, completed) => handleSetChange(ex.id!, setNum, reps, weight, completed)}
        />
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        <div style={{ fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>RPE nach dem Training</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              style={{ flex: 1, minWidth: 36, background: rpe === n ? colors.blue : colors.card, borderRadius: radius.sm, padding: spacing.sm, fontSize: 14, color: rpe === n ? colors.black : colors.textSecondary, fontWeight: rpe === n ? 700 : 400, border: 'none' }}
              onClick={() => setRpe(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      <button
        style={{ background: colors.blue, borderRadius: radius.md, padding: spacing.md, fontSize: 15, fontWeight: 700, color: colors.black, border: 'none' }}
        onClick={handleFinish}
      >Einheit abschließen ✓</button>
    </div>
  )
}
