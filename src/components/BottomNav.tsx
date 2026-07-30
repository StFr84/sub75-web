import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getUnseenInsightCount } from '../db/queries/insightState'

const TABS = [
  { to: '/',        icon: '◉', label: 'Heute'  },
  { to: '/week',    icon: '▦', label: 'Woche'  },
  { to: '/trends',  icon: '↗', label: 'Trends' },
  { to: '/coach',   icon: '✦', label: 'Coach'  },
  { to: '/plan',    icon: '≡', label: 'Plan'   },
  { to: '/profile', icon: '⚙', label: 'Profil' },
]

export function BottomNav() {
  const location = useLocation()
  const [unseenCount, setUnseenCount] = useState(0)

  useEffect(() => {
    getUnseenInsightCount().then(setUnseenCount).catch(() => setUnseenCount(0))
  }, [location.pathname])

  return (
    <nav className="bottom-tabs">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}
        >
          <span className="bottom-tab-icon" style={{ position: 'relative' }}>
            {t.icon}
            {t.to === '/coach' && unseenCount > 0 && <span className="bottom-tab-badge" />}
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
