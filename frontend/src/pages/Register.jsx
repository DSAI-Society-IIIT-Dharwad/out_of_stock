import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

const C = { dark: '#1A1917', red: '#D84A1B', bg: '#F5F3EE', muted: '#8A8780', border: 'rgba(26,25,23,0.12)' }
const mono = "'IBM Plex Mono', monospace"
const syne = "'Syne', sans-serif"

const inputStyle = {
  width: '100%', background: C.bg,
  border: '1px solid rgba(26,25,23,0.25)', color: C.dark,
  fontFamily: mono, fontSize: 13, padding: '11px 14px',
  outline: 'none', borderRadius: 0, boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 9, color: C.muted, letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: 6, display: 'block',
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
]

export default function Register() {
  const navigate = useNavigate()
  const { register, loading, error, clearError } = useAuth()

  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    phone_number: '', city: '', state: '',
    company_name: '', business_type: '',
  })
  const [localErr, setLocalErr] = useState('')

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); clearError(); setLocalErr('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalErr('')
    if (!form.full_name.trim())       return setLocalErr('Full name is required')
    if (!form.phone_number.trim())    return setLocalErr('WhatsApp number is required for alerts')
    if (!form.phone_number.startsWith('+')) return setLocalErr('Include country code, e.g. +919834577965')
    if (!form.city.trim())            return setLocalErr('City is required')
    if (!form.state)                  return setLocalErr('State is required')
    if (form.password.length < 6)     return setLocalErr('Password must be at least 6 characters')
    try {
      await register({
        full_name: form.full_name, email: form.email,
        password: form.password, phone_number: form.phone_number,
        city: form.city, state: form.state,
        company_name: form.company_name || undefined,
        business_type: form.business_type || undefined,
      })
      navigate('/')
    } catch {}
  }

  const displayErr = localErr || error

  return (
    <div style={{ minHeight: '100vh', background: C.dark, display: 'flex' }}>

      {/* Left branding panel */}
      <div style={{
        flex: '0 0 400px', padding: '48px 48px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: '1px solid rgba(245,243,238,0.08)',
      }} className="hidden lg:flex">
        <Link to="/landing" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 22, color: '#F5F3EE', letterSpacing: '-0.02em' }}>
            Price<span style={{ color: C.red }}>Sentinel</span>
          </div>
        </Link>

        <div>
          <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 30, color: '#F5F3EE', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 24 }}>
            Know every<br />price move<br /><span style={{ color: C.red }}>before it hurts.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '📱', text: 'WhatsApp alerts in your language' },
              { icon: '◈',  text: 'Geo prices across 12+ Indian cities' },
              { icon: '🎯', text: 'ML-powered optimal price predictor' },
              { icon: '⚑',  text: 'Price war detection before you react' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: 'rgba(245,243,238,0.5)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(245,243,238,0.2)', letterSpacing: '0.06em' }}>
          AMAZON BEARING PRICE INTELLIGENCE
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 32px', background: C.bg, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Mobile logo */}
          <div style={{ marginBottom: 28 }} className="lg:hidden">
            <Link to="/landing" style={{ textDecoration: 'none' }}>
              <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 22, color: C.dark }}>
                Price<span style={{ color: C.red }}>Sentinel</span>
              </div>
            </Link>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: C.dark }}>
              Create your account
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 6 }}>
              Already have one?{' '}
              <Link to="/login" style={{ color: C.red, textDecoration: 'none' }}>Sign in →</Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name */}
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" required value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Rajesh Kumar" style={inputStyle} />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" required value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@company.com" style={inputStyle} />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password *</label>
              <input type="password" required value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min. 6 characters" style={inputStyle} minLength={6} />
            </div>

            {/* WhatsApp */}
            <div>
              <label style={labelStyle}>WhatsApp Number *</label>
              <input type="tel" required value={form.phone_number}
                onChange={e => set('phone_number', e.target.value)}
                placeholder="+919834577965" style={inputStyle} />
              <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
                All price alerts are sent here. Include country code (+91 for India).
              </div>
            </div>

            {/* City + State */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>City *</label>
                <input type="text" required value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Chennai" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State *</label>
                <select required value={form.state} onChange={e => set('state', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Optional fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input type="text" value={form.company_name}
                  onChange={e => set('company_name', e.target.value)}
                  placeholder="Optional" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Business Type</label>
                <select value={form.business_type} onChange={e => set('business_type', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Optional</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Trader">Trader</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {displayErr && (
              <div style={{
                fontSize: 11, color: C.red, padding: '10px 12px',
                background: 'rgba(216,74,27,0.08)', border: '1px solid rgba(216,74,27,0.2)',
                fontFamily: mono,
              }}>
                ✗ {displayErr}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: C.dark, color: '#F5F3EE', border: 'none', padding: '14px 0',
              fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s', marginTop: 4,
            }}>
              {loading ? '⟳ Creating account…' : 'Create Account →'}
            </button>

            <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, lineHeight: 1.6 }}>
              By registering you agree to receive WhatsApp price alerts on the number provided.
              You can update your details anytime from your profile.
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
