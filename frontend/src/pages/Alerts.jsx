import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAuth, authHeaders } from '../store/useAuth'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { BtnPrimary, BtnSecondary } from '../components/ui/Btn'
import { toIST } from '../utils/time'
import { usePolling } from '../hooks/usePolling'

const RULE_TYPES  = ['ANY', 'PRICE_DROP', 'BUYBOX_CHANGE', 'PRICE_WAR', 'STOCKOUT_SIGNAL']
const ALERT_TYPES = ['PRICE_DROP', 'BUYBOX_CHANGE', 'PRICE_WAR', 'STOCKOUT_SIGNAL', 'PRICE_RECOVERY']
const SIM_TYPES   = ['PRICE_DROP', 'BUYBOX_CHANGE', 'PRICE_WAR', 'STOCKOUT_SIGNAL']
const LOCATIONS   = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'kolkata',
  'ahmedabad', 'jaipur', 'lucknow', 'bhopal', 'patna', 'chandigarh']
const API = '/api/v1'

const labelStyle = { fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }
const inputStyle = {
  width: 120, background: '#F5F3EE', border: '1px solid rgba(26,25,23,0.3)',
  color: '#1A1917', fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11, padding: '8px 10px', outline: 'none', borderRadius: 0,
}

async function authFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
  })
  return res.json()
}

// ── Create Rule ───────────────────────────────────────────────────────────────
function CreateRulePanel({ asins, user, onCreated }) {
  const [asin, setAsin]           = useState('')
  const [location, setLocation]   = useState('')
  const [alertType, setAlertType] = useState('ANY')
  const [threshold, setThreshold] = useState('')
  const [status, setStatus]       = useState(null)
  const [msg, setMsg]             = useState('')

  const handleCreate = async () => {
    if (!asin) return
    setStatus('loading'); setMsg('')
    try {
      const data = await authFetch(`${API}/alerts/rules`, {
        method: 'POST',
        body: JSON.stringify({
          asin, location: location || null,
          alert_type: alertType,
          threshold: threshold ? parseFloat(threshold) : null,
        }),
      })
      if (data.detail || data.error) { setStatus('error'); setMsg(data.detail || data.error); return }
      setStatus('ok')
      setMsg(`Rule created — confirmation sent to ${data.mobile}`)
      onCreated?.()
    } catch (e) { setStatus('error'); setMsg(e.message) }
  }

  return (
    <Card>
      <SectionLabel>Create Alert Rule</SectionLabel>

      {/* Phone info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: 'rgba(26,122,74,0.06)', border: '1px solid rgba(26,122,74,0.2)',
        marginBottom: 16, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <span style={{ fontSize: 16 }}>📱</span>
        <div>
          <span style={{ color: '#1A7A4A', fontWeight: 500 }}>Alerts will be sent to: </span>
          <span style={{ color: '#1A1917' }}>{user?.phone_number}</span>
          <span style={{ color: '#8A8780', marginLeft: 8, fontSize: 10 }}>
            · <Link to="/profile" style={{ color: '#1B6BD8', textDecoration: 'none' }}>Change number</Link>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <div style={labelStyle}>ASIN</div>
          <Select value={asin} onChange={e => setAsin(e.target.value)}>
            <option value="">— Select ASIN —</option>
            {asins.map(a => <option key={a.asin} value={a.asin}>{a.model} · {a.asin}</option>)}
          </Select>
        </div>
        <div>
          <div style={labelStyle}>Location (optional)</div>
          <Select value={location} onChange={e => setLocation(e.target.value)}>
            <option value="">All locations</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </Select>
        </div>
        <div>
          <div style={labelStyle}>Alert Type</div>
          <Select value={alertType} onChange={e => setAlertType(e.target.value)}>
            {RULE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
        {alertType === 'PRICE_DROP' && (
          <div>
            <div style={labelStyle}>Min Drop %</div>
            <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)}
              placeholder="e.g. 5" style={inputStyle} />
          </div>
        )}
        <BtnPrimary onClick={handleCreate} disabled={!asin || status === 'loading'}>
          {status === 'loading' ? '⟳ Creating...' : '+ Create Rule'}
        </BtnPrimary>
      </div>
      {msg && (
        <div style={{ marginTop: 10, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
          color: status === 'ok' ? '#1A7A4A' : '#D84A1B' }}>
          {status === 'ok' ? '✓ ' : '✗ '}{msg}
        </div>
      )}
    </Card>
  )
}

// ── Simulate ──────────────────────────────────────────────────────────────────
function SimulatePanel({ asins, user, onSimulated }) {
  const [alertType, setAlertType] = useState('PRICE_DROP')
  const [asin, setAsin]           = useState('')
  const [location, setLocation]   = useState('chennai')
  const [notify, setNotify]       = useState(true)
  const [status, setStatus]       = useState(null)
  const [msg, setMsg]             = useState('')

  const handleSimulate = async () => {
    setStatus('loading'); setMsg('')
    try {
      const data = await authFetch(`${API}/alerts/simulate`, {
        method: 'POST',
        body: JSON.stringify({ alert_type: alertType, asin: asin || 'DEMO_ASIN', location, notify }),
      })
      if (data.detail || data.error) { setStatus('error'); setMsg(data.detail || data.error); return }
      setStatus('ok')
      setMsg(
        data.message +
        (data.notified_to?.length ? ` · 📱 WhatsApp sent to ${data.notified_to.join(', ')}` : '')
      )
      onSimulated?.()
    } catch (e) { setStatus('error'); setMsg(e.message) }
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <SectionLabel>Simulate Alert</SectionLabel>
        <span style={{ fontSize: 8, padding: '2px 6px', background: '#D4A017', color: '#fff',
          fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', borderRadius: 2 }}>
          DEMO
        </span>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <div style={labelStyle}>Alert Type</div>
          <Select value={alertType} onChange={e => setAlertType(e.target.value)}>
            {SIM_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
        <div>
          <div style={labelStyle}>ASIN (optional)</div>
          <Select value={asin} onChange={e => setAsin(e.target.value)}>
            <option value="">DEMO_ASIN</option>
            {asins.map(a => <option key={a.asin} value={a.asin}>{a.model} · {a.asin}</option>)}
          </Select>
        </div>
        <div>
          <div style={labelStyle}>Location</div>
          <Select value={location} onChange={e => setLocation(e.target.value)}>
            {LOCATIONS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </Select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 2 }}>
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)}
            style={{ accentColor: '#1A7A4A', width: 13, height: 13 }} />
          <span style={{ fontSize: 11, color: '#4A4845', fontFamily: "'IBM Plex Mono', monospace" }}>
            Send to {user?.phone_number}
          </span>
        </label>
        <BtnSecondary onClick={handleSimulate} disabled={status === 'loading'}>
          {status === 'loading' ? '⟳ Firing...' : '⚡ Fire Demo Alert'}
        </BtnSecondary>
      </div>
      {msg && (
        <div style={{ marginTop: 10, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
          color: status === 'ok' ? '#1A7A4A' : '#D84A1B' }}>
          {status === 'ok' ? '✓ ' : '✗ '}{msg}
        </div>
      )}
    </Card>
  )
}

// ── Rules list ────────────────────────────────────────────────────────────────
function RulesList({ rules, onDelete }) {
  if (!rules.length) return (
    <div style={{ color: '#8A8780', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: '12px 0' }}>
      No active rules. Create one above to start receiving alerts.
    </div>
  )
  return (
    <div>
      <SectionLabel>Your Active Rules ({rules.length})</SectionLabel>
      <div style={{ border: '1px solid rgba(26,25,23,0.12)' }}>
        {rules.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', background: '#EDEAE2',
            borderBottom: i < rules.length - 1 ? '1px solid rgba(26,25,23,0.08)' : 'none',
          }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#8A8780' }}>#{r.id}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#1A1917' }}>{r.asin}</span>
              <span style={{ fontSize: 10, color: '#4A4845' }}>{r.alert_type?.replace(/_/g, ' ')}</span>
              {r.location && <span style={{ fontSize: 10, color: '#8A8780' }}>{r.location.toUpperCase()}</span>}
              {r.threshold && <span style={{ fontSize: 10, color: '#8A8780' }}>≥{r.threshold}% drop</span>}
              <span style={{ fontSize: 10, color: '#1A7A4A', fontFamily: "'IBM Plex Mono', monospace" }}>📱 {r.mobile}</span>
            </div>
            <button onClick={() => onDelete(r.id)} style={{
              fontSize: 9, padding: '3px 8px', background: 'transparent',
              border: '1px solid rgba(216,74,27,0.3)', color: '#D84A1B',
              cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
            }}>REMOVE</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Alerts() {
  const { alerts, fetchAlerts, asins, fetchAsins } = useStore()
  const { user } = useAuth()
  const [filter, setFilter] = useState('ALL')
  const [rules, setRules]   = useState([])

  usePolling(fetchAlerts, 10000, [])
  useEffect(() => { fetchAsins(); fetchRules() }, [])

  const fetchRules = async () => {
    try {
      const data = await authFetch(`${API}/alerts/rules`)
      setRules((data.rules || []).filter(r => r.active != 0))
    } catch {}
  }

  const deleteRule = async (id) => {
    await authFetch(`${API}/alerts/rules/${id}`, { method: 'DELETE' })
    fetchRules()
  }

  const grouped  = alerts.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc }, {})
  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.type === filter)

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

      <div className="flex items-start justify-between">
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
            ALERT FEED
          </div>
          {user && (
            <div style={{ fontSize: 11, color: '#8A8780', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Notifications → {user.phone_number} · <Link to="/profile" style={{ color: '#1B6BD8', textDecoration: 'none' }}>change</Link>
            </div>
          )}
        </div>
        <BtnSecondary onClick={fetchAlerts}>↻ Refresh</BtnSecondary>
      </div>

      <CreateRulePanel asins={asins} user={user} onCreated={fetchRules} />
      <SimulatePanel asins={asins} user={user} onSimulated={fetchAlerts} />
      <RulesList rules={rules} onDelete={deleteRule} />

      {/* Type filter */}
      <div className="flex gap-0 border border-[rgba(26,25,23,0.12)] overflow-x-auto">
        {[{ type: 'ALL', count: alerts.length }, ...ALERT_TYPES.map(t => ({ type: t, count: grouped[t] || 0 }))].map((item, i, arr) => (
          <button key={item.type} onClick={() => setFilter(item.type)} style={{
            flex: 1, minWidth: 100, padding: '12px 16px',
            background: filter === item.type ? '#1A1917' : '#EDEAE2',
            color: filter === item.type ? '#F5F3EE' : '#4A4845',
            border: 'none', borderRight: i < arr.length - 1 ? '1px solid rgba(26,25,23,0.12)' : 'none',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left',
          }}>
            <div>{item.type.replace(/_/g, ' ')}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, marginTop: 4,
              color: filter === item.type ? '#F5F3EE' : item.count > 0 ? '#D84A1B' : '#8A8780' }}>
              {item.count}
            </div>
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div>
        <SectionLabel>{filtered.length} alerts {filter !== 'ALL' ? `· ${filter.replace(/_/g, ' ')}` : ''}</SectionLabel>
        <Card className="p-0">
          {filtered.length === 0 && (
            <div className="p-4" style={{ color: '#8A8780', fontSize: 11 }}>No alerts yet. Run the scraper or fire a demo alert above.</div>
          )}
          {filtered.map((a, i) => (
            <div key={a.id} className="px-4 py-4" style={{
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none',
              borderLeft: `3px solid ${
                a.type === 'PRICE_DROP' || a.type === 'PRICE_WAR' ? '#D84A1B'
                : a.type === 'BUYBOX_CHANGE' ? '#C47A10'
                : a.type === 'STOCKOUT_SIGNAL' ? '#1B6BD8'
                : '#1A7A4A'
              }`,
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Badge type={a.type} />
                <span style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.06em' }}>
                  {a.model} · {a.location?.toUpperCase()} · {toIST(a.fired_at)}
                </span>
                {a.whatsapp_sent && (
                  <span style={{ fontSize: 9, color: '#1A7A4A', letterSpacing: '0.06em' }}>📱 SENT</span>
                )}
              </div>

              {/* Descriptive message */}
              <div style={{ fontSize: 12, color: '#1A1917', lineHeight: 1.7, marginBottom: 8 }}>{a.message}</div>

              {/* Price drop visual */}
              {a.type === 'PRICE_DROP' && a.old_price && (
                <div className="flex items-center gap-3 mt-1">
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: '#8A8780', textDecoration: 'line-through' }}>
                    ₹{a.old_price?.toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: '#8A8780' }}>→</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#D84A1B' }}>
                    ₹{a.new_price?.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: 10, color: '#D84A1B', fontFamily: "'IBM Plex Mono', monospace" }}>
                    ▼ {Math.abs(a.delta_percent).toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Buy box change visual */}
              {a.type === 'BUYBOX_CHANGE' && a.old_seller && (
                <div className="flex items-center gap-3 mt-1">
                  <span style={{ fontSize: 11, color: '#8A8780' }}>{a.old_seller}</span>
                  <span style={{ color: '#C47A10' }}>→</span>
                  <span style={{ fontSize: 11, color: '#C47A10', fontWeight: 500 }}>{a.new_seller}</span>
                </div>
              )}

              {a.type === 'PRICE_WAR' && (
                <div style={{ marginTop: 4, fontSize: 10, color: '#D84A1B', fontFamily: "'IBM Plex Mono', monospace" }}>
                  ⚑ {a.drop_count} drops in 6h window
                </div>
              )}
              {a.type === 'STOCKOUT_SIGNAL' && (
                <div style={{ marginTop: 4, fontSize: 10, color: '#1B6BD8', fontFamily: "'IBM Plex Mono', monospace" }}>
                  ◈ +{a.spike_percent?.toFixed(0)}% price spike — inventory opportunity
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
