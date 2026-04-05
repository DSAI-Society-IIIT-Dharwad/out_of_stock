import { useState } from 'react'
import { useAuth } from '../store/useAuth'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import { BtnPrimary, BtnSecondary } from '../components/ui/Btn'

const inputStyle = {
  background: '#F5F3EE', border: '1px solid rgba(26,25,23,0.25)',
  color: '#1A1917', fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12, padding: '9px 12px', outline: 'none', borderRadius: 0,
  width: '100%', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 9, color: '#8A8780', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: 5, display: 'block',
}

export default function Profile() {
  const { user, updateProfile, logout, loading, error, clearError } = useAuth()

  const [fullName, setFullName]       = useState(user?.full_name || '')
  const [phone, setPhone]             = useState(user?.phone_number || '')
  const [city, setCity]               = useState(user?.city || '')
  const [state, setState]             = useState(user?.state || '')
  const [company, setCompany]         = useState(user?.company_name || '')
  const [curPwd, setCurPwd]           = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [msg, setMsg]                 = useState('')
  const [msgType, setMsgType]         = useState('ok')

  const handleSave = async () => {
    clearError(); setMsg('')
    if (phone && !phone.startsWith('+')) {
      setMsg('Phone must start with country code, e.g. +919834577965')
      setMsgType('err'); return
    }
    try {
      const body = {}
      if (fullName !== user?.full_name)     body.full_name = fullName
      if (phone !== user?.phone_number)     body.phone_number = phone
      if (city !== user?.city)              body.city = city
      if (state !== user?.state)            body.state = state
      if (company !== user?.company_name)   body.company_name = company
      if (newPwd) { body.current_password = curPwd; body.new_password = newPwd }
      await updateProfile(body)
      setMsg('Profile updated successfully.')
      setMsgType('ok')
      setCurPwd(''); setNewPwd('')
    } catch (e) {
      setMsg(e.message); setMsgType('err')
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
        PROFILE
      </div>

      <Card>
        <SectionLabel>Account Details</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={{ ...inputStyle, opacity: 0.6 }} value={user?.email || ''} disabled />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} value={state} onChange={e => setState(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>WhatsApp Alerts Number</SectionLabel>
        <div>
          <label style={labelStyle}>Phone Number</label>
          <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+919834577965" />
          <div style={{ fontSize: 10, color: '#8A8780', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
            All alert notifications are sent to this number. Changing it takes effect immediately.
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>Change Password</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <input type="password" style={inputStyle} value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" style={inputStyle} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 characters" minLength={6} />
          </div>
        </div>
      </Card>

      {(msg || error) && (
        <div style={{
          fontSize: 11, padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace",
          color: (msgType === 'ok' && !error) ? '#1A7A4A' : '#D84A1B',
          background: (msgType === 'ok' && !error) ? 'rgba(26,122,74,0.08)' : 'rgba(216,74,27,0.08)',
          border: `1px solid ${(msgType === 'ok' && !error) ? 'rgba(26,122,74,0.2)' : 'rgba(216,74,27,0.2)'}`,
        }}>
          {(msgType === 'ok' && !error) ? '✓ ' : '✗ '}{error || msg}
        </div>
      )}

      <div className="flex gap-3">
        <BtnPrimary onClick={handleSave} disabled={loading}>
          {loading ? '⟳ Saving…' : 'Save Changes'}
        </BtnPrimary>
        <BtnSecondary onClick={logout}>Sign Out</BtnSecondary>
      </div>
    </div>
  )
}
