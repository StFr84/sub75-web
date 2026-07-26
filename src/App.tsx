import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TodayScreen }          from './screens/TodayScreen'
import { WeekScreen }           from './screens/WeekScreen'
import { StatsScreen }          from './screens/StatsScreen'
import { PlanScreen }           from './screens/PlanScreen'
import { ProfileScreen }        from './screens/ProfileScreen'
import { WorkoutDetailScreen }  from './screens/WorkoutDetailScreen'
import { RunDetailScreen }      from './screens/RunDetailScreen'
import { MobilityDetailScreen } from './screens/MobilityDetailScreen'
import { seedIfNeeded }         from './db/seed'
import { colors }               from './theme/colors'
import { getCurrentWeek }       from './data/constants'

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    seedIfNeeded()
      .then(() => setReady(true))
      .catch(e => { setError(e?.message ?? 'DB-Fehler'); setReady(true) })
  }, [])

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${colors.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <BrowserRouter basename="/sub75-web">
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          {error && (
            <div style={{ color: colors.red, marginBottom: 16, padding: 12, background: colors.card, borderRadius: 8 }}>
              Fehler: {error}
            </div>
          )}
          <Routes>
            <Route path="/"               element={<TodayScreen />} />
            <Route path="/week"           element={<Navigate to={`/week/${getCurrentWeek()}`} replace />} />
            <Route path="/week/:weekNum"  element={<WeekScreen />} />
            <Route path="/stats"          element={<StatsScreen />} />
            <Route path="/plan"           element={<PlanScreen />} />
            <Route path="/profile"        element={<ProfileScreen />} />
            <Route path="/workout/:sessionId/:date" element={<WorkoutDetailScreen />} />
            <Route path="/run/:sessionId/:date"     element={<RunDetailScreen />} />
            <Route path="/mobility/:sessionId/:date" element={<MobilityDetailScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
