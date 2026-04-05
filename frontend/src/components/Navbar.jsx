import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'

const links = [
  { to: '/',          label: 'Dashboard' },
  { to: '/search',    label: 'Search' },
  { to: '/geo',       label: 'Geo Intel' },
  { to: '/prices',    label: 'Prices' },
  { to: '/buybox',    label: 'Buy Box' },
  { to: '/sellers',   label: 'Sellers' },
  { to: '/alerts',    label: 'Alerts' },
  { to: '/suggest',   label: 'Suggest' },
  { to: '/predict',   label: 'ML Predict' },
  { to: '/analytics', label: 'Analytics' },
]

export default function Navbar() {
  const { alerts } = useStore()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 800)
    return () => clearTimeout(t)
  }, [alerts.length])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav
      className="bg-[#1A1917] px-8 flex items-center justify-between"
      style={{ height: 52, position: 'sticky', top: 0, zIndex: 50 }}
    >
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#F5F3EE', letterSpacing: '-0.02em' }}>
        Price<span style={{ color: '#D84A1B' }}>Sentinel</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            style={({ isActive }) => ({
              padding: '6px 12px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive ? '#F5F3EE' : 'rgba(245,243,238,0.45)',
              background: isActive ? 'rgba(245,243,238,0.1)' : 'transparent',
              borderBottom: isActive ? '2px solid #D84A1B' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s',
              position: 'relative',
              whiteSpace: 'nowrap',
            })}
          >
            {l.label}
            {l.to === '/alerts' && alerts.length > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#D84A1B' }} />
            )}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: pulse ? '#1A7A4A' : 'rgba(26,122,74,0.4)', transition: 'background 0.3s' }} />
        <span style={{ fontSize: 9, color: 'rgba(245,243,238,0.3)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>LIVE</span>
        {user && (
          <>
            <NavLink to="/profile" style={{ fontSize: 10, color: 'rgba(245,243,238,0.5)', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.06em' }}>
              {user.full_name?.split(' ')[0].toUpperCase()}
            </NavLink>
            <button onClick={handleLogout} style={{ fontSize: 9, color: 'rgba(245,243,238,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace', letterSpacing: '0.06em'" }}>
              SIGN OUT
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
