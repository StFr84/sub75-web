import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/',        icon: '◉', label: 'Heute'  },
  { to: '/week',    icon: '▦', label: 'Woche'  },
  { to: '/stats',   icon: '↗', label: 'Stats'  },
  { to: '/plan',    icon: '≡', label: 'Plan'   },
  { to: '/profile', icon: '⚙', label: 'Profil' },
]

export function Sidebar() {
  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-logo">SUB75</div>
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>

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
    </>
  )
}
