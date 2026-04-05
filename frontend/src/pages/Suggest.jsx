import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'

const LOCATIONS = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'kolkata',
  'ahmedabad', 'jaipur', 'lucknow', 'bhopal', 'patna', 'chandigarh']
const API = '/api/v1'
const POLL_MS = 30_000   // re-fetch every 30 s

export default function Suggest() {
  const { asins, fetchAsins } = useStore()
  const [asin, setAsin]             = useState('')
  const [location, setLocation]     = useState('chennai')
  const [marginFloor, setMarginFloor] = useState('')
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => { fetchAsins() }, [])

  const fetchSuggestion = useCallback(async (a, loc, floor) => {
    if (!a) return
    // cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    try {
      const params = new URLSearchParams({ location: loc })
      if (floor) params.set('margin_floor', floor)
      const res = await fetch(`${API}/suggest/${a}?${params}`, { signal: abortRef.current.signal })
      const data = await res.json()
      setResult(data)
      setLastFetched(new Date())
    } catch (e) {
      if (e.name !== 'AbortError') setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  // Run immediately whenever inputs change, then poll every 30 s
  useEffect(() => {
    clearInterval(timerRef.current)
    fetchSuggestion(asin, location, marginFloor)
    if (asin) {
      timerRef.current = setInterval(() => fetchSuggestion(asin, location, marginFloor), POLL_MS)
    }
    return () => clearInterval(timerRef.current)
  }, [asin, location, marginFloor, fetchSuggestion])

  const delta = result?.current_buybox_price && result?.suggested_price
    ? result.current_buybox_price - result.suggested_price
    : null

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
            OPTIMAL PRICE
          </div>
          <div style={{ fontSize: 11, color: '#8A8780', marginTop: 6 }}>
            Updates live as you change inputs — refreshes every 30 s.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading && (
            <span style={{ fontSize: 10, color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace" }}>⟳</span>
          )}
          {lastFetched && !loading && (
            <span style={{ fontSize: 9, color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
              {lastFetched.toLocaleTimeString()}
            </span>
          )}
          {/* live pulse */}
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: loading ? '#D4A017' : asin ? '#1A7A4A' : 'rgba(26,25,23,0.2)',
            display: 'inline-block', transition: 'background 0.3s',
          }} />
        </div>
      </div>

      {/* Controls — no button */}
      <Card>
        <SectionLabel>Configure</SectionLabel>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>ASIN</div>
            <Select value={asin} onChange={e => setAsin(e.target.value)}>
              <option value="">— Select ASIN —</option>
              {asins.map(a => <option key={a.asin} value={a.asin}>{a.model} · {a.asin}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Location</div>
            <Select value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Margin Floor (₹)</div>
            <input
              type="number"
              value={marginFloor}
              onChange={e => setMarginFloor(e.target.value)}
              placeholder="e.g. 1100"
              style={{
                background: '#F5F3EE', border: '1px solid rgba(26,25,23,0.3)',
                color: '#1A1917', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, padding: '8px 12px', outline: 'none', borderRadius: 0, width: 140,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Skeleton while loading with no prior result */}
      {loading && !result && (
        <div style={{ height: 120, background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>
            LOADING...
          </span>
        </div>
      )}

      {/* Result */}
      {result && !result.error && (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <SectionLabel>Suggestion · {result.model} · {(result.location || location).toUpperCase()}</SectionLabel>

          {/* Main card */}
          <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)',
            padding: '24px 28px', borderLeft: '4px solid #1A7A4A' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>
              Suggested Price
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 8 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 48, color: '#1A7A4A', lineHeight: 1 }}>
                ₹{result.suggested_price?.toLocaleString('en-IN')}
              </div>
              {delta != null && (
                <div style={{ fontSize: 13, color: '#1A7A4A', fontFamily: "'IBM Plex Mono', monospace" }}>
                  −₹{delta.toLocaleString('en-IN')} vs buybox
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#4A4845', marginTop: 8, lineHeight: 1.6 }}>
              {result.reasoning}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[rgba(26,25,23,0.12)] mt-0"
            style={{ borderTop: 'none' }}>
            {[
              { label: 'Current Buy Box', value: `₹${result.current_buybox_price?.toLocaleString('en-IN')}`, sub: result.current_buybox_seller },
              { label: 'Your Price',      value: `₹${result.suggested_price?.toLocaleString('en-IN')}`,      sub: 'suggested', color: '#1A7A4A' },
              { label: 'Margin Floor',    value: result.margin_floor ? `₹${Number(result.margin_floor).toLocaleString('en-IN')}` : '—', sub: 'minimum' },
              { label: 'Margin at Price', value: result.margin_at_suggested != null ? `₹${result.margin_at_suggested?.toLocaleString('en-IN')}` : '—', sub: 'above floor', color: '#1A7A4A' },
            ].map((s, i) => (
              <div key={s.label} className="p-4 bg-[#EDEAE2]"
                style={{ borderRight: i < 3 ? '1px solid rgba(26,25,23,0.12)' : 'none' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>{s.label}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: s.color || '#1A1917', marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#8A8780', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{ color: '#D84A1B', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          {result.error} {result.message ? `· ${result.message}` : ''}
        </div>
      )}
    </div>
  )
}
