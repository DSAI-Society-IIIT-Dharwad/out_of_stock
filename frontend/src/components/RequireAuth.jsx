import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

export default function RequireAuth({ children }) {
  const { user, token, init, loading } = useAuth()

  useEffect(() => {
    if (token && !user) init()
  }, [token])

  if (token && !user && loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EE' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#8A8780' }}>Loading…</div>
      </div>
    )
  }

  if (!token) return <Navigate to="/landing" replace />
  return children
}
