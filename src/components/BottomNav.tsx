import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/',        icon: '◉', label: 'Heute'  },
  { to: '/week',    icon: '▦', label: 'Woche'  },
  { to: '/trends',  icon: '↗', label: 'Trends' },
  { to: '/plan',    icon: '≡', label: 'Plan'   },
  { to: '/profile', icon: '⚙', label: 'Profil' },
]

export function BottomNav() {
  return (
    <nav className="bottom-tabs">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}
        >
          <span className="bottom-tab-icon">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
