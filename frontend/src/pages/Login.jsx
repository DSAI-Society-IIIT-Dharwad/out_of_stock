import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

const C = { dark: '#1A1917', red: '#D84A1B', bg: '#F5F3EE', surface: '#EDEAE2', muted: '#8A8780', border: 'rgba(26,25,23,0.12)' }
const mono = "'IBM Plex Mono', monospace"
const syne = "'Syne', sans-serif"

const inputStyle = {
  width: '100%', background: C.bg,
  border: '1px solid rgba(26,25,23,0.25)', color: C.dark,
  fontFamily: mono, fontSize: 13, padding: '11px 14px',
  outline: 'none', borderRadius: 0, boxSizing: 'border-box',
}
const labelStyle = { fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

export default function Login() {
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    try {
      await login({ email, password })
      navigate('/')
    } catch {}
  }

  return (
    <div style={{ minHeight: '100vh', background: C.dark, display: 'flex' }}>

      {/* Left branding panel */}
      <div style={{
        flex: '0 0 420px', padding: '48px 48px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: '1px solid rgba(245,243,238,0.08)',
      }} className="hidden lg:flex">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 22, color: '#F5F3EE', letterSpacing: '-0.02em' }}>
            Price<span style={{ color: C.red }}>Sentinel</span>
          </div>
        </Link>

        <div>
          <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 32, color: '#F5F3EE', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
            Welcome<br />back.
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(245,243,238,0.45)', lineHeight: 1.8 }}>
            Your price intelligence dashboard is waiting.
            Sign in to see what moved while you were away.
          </div>
        </div>

        <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(245,243,238,0.25)', letterSpacing: '0.06em' }}>
          AMAZON BEARING PRICE INTELLIGENCE
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', background: C.bg }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile logo */}
          <div style={{ marginBottom: 32 }} className="lg:hidden">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 22, color: C.dark }}>
                Price<span style={{ color: C.red }}>Sentinel</span>
              </div>
            </Link>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: C.dark }}>
              Sign in
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 6 }}>
              No account?{' '}
              <Link to="/register" style={{ color: C.red, textDecoration: 'none' }}>Create one free →</Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" required value={email} onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="you@company.com" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" required value={password} onChange={e => { setPassword(e.target.value); clearError() }}
                placeholder="••••••••" style={inputStyle} />
            </div>

            {error && (
              <div style={{
                fontSize: 11, color: C.red, padding: '10px 12px',
                background: 'rgba(216,74,27,0.08)', border: '1px solid rgba(216,74,27,0.2)',
                fontFamily: mono,
              }}>
                ✗ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: C.dark, color: '#F5F3EE', border: 'none', padding: '14px 0',
              fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}>
              {loading ? '⟳ Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: 24, fontFamily: mono, fontSize: 10, color: C.muted, lineHeight: 1.6 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: C.red, textDecoration: 'none' }}>Register here</Link>
            {' '}— it's free and takes 2 minutes.
          </div>
        </div>
      </div>
    </div>
  )
}
