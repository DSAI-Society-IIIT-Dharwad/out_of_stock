import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { BtnPrimary } from '../components/ui/Btn'

const API = '/api/v1'
const LOCATIONS = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'kolkata',
  'ahmedabad', 'jaipur', 'lucknow', 'bhopal', 'patna', 'chandigarh']

function ProbBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 70 ? '#1A7A4A' : pct >= 40 ? '#D4A017' : '#D84A1B'
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: '#8A8780', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.06em' }}>WIN PROBABILITY</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'IBM Plex Mono',monospace" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: 'rgba(26,25,23,0.1)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function StatChip({ label, value }) {
  return (
    <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.1)', padding: '8px 12px' }}>
      <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#1A1917', marginTop: 2 }}>{value ?? '—'}</div>
    </div>
  )
}

export default function Predict() {
  const { asins, fetchAsins } = useStore()
  const [asin, setAsin]           = useState('')
  const [location, setLocation]   = useState('chennai')
  const [seller, setSeller]       = useState('')
  const [ctx, setCtx]             = useState(null)   // fetched context
  const [ctxLoading, setCtxLoading] = useState(false)

  // Minimal user inputs
  const [myPrice, setMyPrice]         = useState('')
  const [costPrice, setCostPrice]     = useState('')   // from amazon_bearing_monitor
  const [isFba, setIsFba]             = useState(true)
  const [freeDelivery, setFreeDelivery] = useState(true)
  const [fastDelivery, setFastDelivery] = useState(false)

  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [mlStatus, setMlStatus] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => { fetchAsins() }, [])
  useEffect(() => {
    fetch(`${API}/ml/status`).then(r => r.json()).then(setMlStatus).catch(() => {})
  }, [])

  // Load context whenever ASIN or location changes
  useEffect(() => {
    if (!asin) return
    setCtx(null); setResult(null); setSeller('')
    setCtxLoading(true)
    fetch(`${API}/ml/context?asin=${asin}&location=${location}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setCtx(data)
          setSeller(data.buybox_seller || '')
          setMyPrice(data.buybox_price ? String(Math.round(data.buybox_price)) : '')
          setIsFba(!!data.ships_from?.toLowerCase().includes('amazon'))
          setFreeDelivery(!!data.is_free_delivery)
          setFastDelivery(!!data.is_fast_delivery)
        }
      })
      .catch(() => {})
      .finally(() => setCtxLoading(false))
  }, [asin, location])

  const handlePredict = async () => {
    if (!asin || !myPrice || !ctx) return
    setLoading(true); setResult(null)

    const price = parseFloat(myPrice)
    const wins  = ctx.win_map?.[seller] || 0
    const rate  = ctx.total_wins ? wins / ctx.total_wins : 0.05
    const logW  = Math.log1p(wins)

    const minP  = ctx.min_price || price
    const avgP  = ctx.avg_price || price

    const body = {
      simulated_price:       price,
      price_rank:            minP ? Math.round((price - minP) / (avgP - minP + 1) + 1) : 1,
      price_diff_from_min:   Math.max(0, price - minP),
      price_vs_group_avg:    avgP ? +(price / avgP).toFixed(4) : 1.0,
      product_rating:        4.2,
      review_count:          50,
      seller_win_rate:       +rate.toFixed(4),
      seller_total_wins_log: +logW.toFixed(4),
      buybox_is_fba:         isFba ? 1 : 0,
      fba_ratio:             ctx.fba_ratio ?? 0.5,
      seller_count:          ctx.seller_count ?? 3,
      is_free_delivery:      freeDelivery ? 1 : 0,
      is_fast_delivery:      fastDelivery ? 1 : 0,
      hour:                  new Date().getHours(),
      day_of_week:           new Date().getDay(),
      cost_price:            costPrice ? parseFloat(costPrice) : 0,  // from amazon_bearing_monitor
    }

    try {
      const res = await fetch(`${API}/ml/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setResult(await res.json())
    } catch (e) {
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleTrain = async () => {
    await fetch(`${API}/ml/train`, { method: 'POST' })
    setMlStatus(s => ({ ...s, status: 'training' }))
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const s = await fetch(`${API}/ml/status`).then(r => r.json())
      setMlStatus(s)
      if (s.status !== 'training') clearInterval(pollRef.current)
    }, 3000)
  }

  const statusColor = { ok: '#1A7A4A', training: '#D4A017', error: '#D84A1B', idle: '#8A8780', skipped: '#8A8780' }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
            ML PREDICT
          </div>
          <div style={{ fontSize: 11, color: '#8A8780', marginTop: 4 }}>
            Select an ASIN and seller — we fill the rest from your scraped data.
          </div>
        </div>
        {mlStatus && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Model</div>
            <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: statusColor[mlStatus.status] || '#8A8780', marginTop: 2 }}>
              {mlStatus.status?.toUpperCase()}
              {mlStatus.last_metrics && ` · acc ${(mlStatus.last_metrics.accuracy * 100).toFixed(1)}%`}
            </div>
            <button onClick={handleTrain} disabled={mlStatus.status === 'training'}
              style={{ marginTop: 4, fontSize: 9, padding: '3px 8px', background: 'transparent',
                border: '1px solid rgba(26,25,23,0.25)', color: '#1A1917', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.06em', textTransform: 'uppercase',
                opacity: mlStatus.status === 'training' ? 0.5 : 1 }}>
              {mlStatus.status === 'training' ? '⟳ Training...' : 'Retrain'}
            </button>
          </div>
        )}
      </div>

      {/* Step 1 — ASIN + Location */}
      <Card>
        <SectionLabel>1 · Select Product</SectionLabel>
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
          {ctxLoading && (
            <div style={{ fontSize: 10, color: '#8A8780', fontFamily: "'IBM Plex Mono',monospace" }}>⟳ loading...</div>
          )}
        </div>
      </Card>

      {/* Context snapshot */}
      {ctx && (
        <div>
          <SectionLabel>Live Snapshot · {asin} · {location.toUpperCase()}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            <StatChip label="Buy Box Seller"  value={ctx.buybox_seller} />
            <StatChip label="Buy Box Price"   value={ctx.buybox_price ? `₹${ctx.buybox_price.toLocaleString('en-IN')}` : '—'} />
            <StatChip label="Competing Sellers" value={ctx.seller_count} />
            <StatChip label="FBA Ratio"       value={`${Math.round((ctx.fba_ratio || 0) * 100)}%`} />
            <StatChip label="Min Price"       value={ctx.min_price ? `₹${ctx.min_price.toLocaleString('en-IN')}` : '—'} />
            <StatChip label="Avg Price"       value={ctx.avg_price ? `₹${ctx.avg_price.toLocaleString('en-IN')}` : '—'} />
            <StatChip label="Free Delivery"   value={ctx.is_free_delivery ? 'Yes' : 'No'} />
            <StatChip label="Scraped At"      value={ctx.scraped_at ? new Date(ctx.scraped_at).toLocaleString() : '—'} />
          </div>
        </div>
      )}

      {/* Step 2 — Seller + minimal inputs */}
      {ctx && (
        <Card>
          <SectionLabel>2 · Your Listing Details</SectionLabel>
          <div className="flex flex-wrap gap-3 items-end">

            {/* Seller picker */}
            <div>
              <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Seller</div>
              <Select value={seller} onChange={e => setSeller(e.target.value)}>
                <option value="">— Select Seller —</option>
                {(ctx.seller_names || []).map(s => (
                  <option key={s} value={s}>
                    {s}{s === ctx.buybox_seller ? ' ★' : ''}
                    {ctx.win_map?.[s] ? ` (${ctx.win_map[s]} wins)` : ''}
                  </option>
                ))}
                <option value="__new__">+ New / My Seller</option>
              </Select>
            </div>

            {/* Price */}
            <div>
              <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Your Price (₹)</div>
              <input
                type="number" value={myPrice} onChange={e => setMyPrice(e.target.value)}
                placeholder={ctx.buybox_price ? String(Math.round(ctx.buybox_price)) : '1200'}
                style={{ width: 120, background: '#F5F3EE', border: '1px solid rgba(26,25,23,0.3)',
                  color: '#1A1917', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
                  padding: '8px 10px', outline: 'none', borderRadius: 0 }}
              />
            </div>

            {/* Cost Price — from amazon_bearing_monitor */}
            <div>
              <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Cost Price (₹)</div>
              <input
                type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)}
                placeholder="0 = skip margin"
                style={{ width: 130, background: '#F5F3EE', border: '1px solid rgba(26,25,23,0.3)',
                  color: '#1A1917', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
                  padding: '8px 10px', outline: 'none', borderRadius: 0 }}
              />
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'FBA',           val: isFba,        set: setIsFba },
                { label: 'Free Delivery', val: freeDelivery, set: setFreeDelivery },
                { label: 'Fast Delivery', val: fastDelivery, set: setFastDelivery },
              ].map(f => (
                <label key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.val} onChange={e => f.set(e.target.checked)}
                    style={{ accentColor: '#1A7A4A', width: 13, height: 13 }} />
                  <span style={{ fontSize: 11, color: '#4A4845', fontFamily: "'IBM Plex Mono',monospace" }}>{f.label}</span>
                </label>
              ))}
            </div>

            <BtnPrimary onClick={handlePredict} disabled={!myPrice || loading}>
              {loading ? '⟳ Predicting...' : 'Predict'}
            </BtnPrimary>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && !result.error && (
        <div className="space-y-4">

          {/* Strategy signal — from amazon_bearing_monitor */}
          {result.strategy && result.strategy !== 'unknown' && (
            <div style={{
              padding: '12px 18px',
              background: result.strategy === 'compete' ? 'rgba(26,122,74,0.08)' : result.strategy === 'caution' ? 'rgba(212,160,23,0.08)' : 'rgba(216,74,27,0.08)',
              border: `1px solid ${result.strategy === 'compete' ? '#1A7A4A' : result.strategy === 'caution' ? '#D4A017' : '#D84A1B'}`,
              color: result.strategy === 'compete' ? '#1A7A4A' : result.strategy === 'caution' ? '#D4A017' : '#D84A1B',
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
            }}>
              {result.strategy === 'compete' ? '✓ COMPETE — healthy margin, go for the Buy Box' :
               result.strategy === 'caution' ? '⚠ CAUTION — thin margin, proceed carefully' :
               '✗ AVOID — margin too low at optimal price'}
              {result.optimal_margin_pct != null && (
                <span style={{ fontWeight: 400, marginLeft: 12 }}>
                  margin {result.optimal_margin_pct}% · ₹{result.optimal_margin?.toLocaleString('en-IN')} per unit
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid rgba(26,25,23,0.12)' }}>
            <div style={{ padding: '20px 24px', background: '#EDEAE2', borderRight: '1px solid rgba(26,25,23,0.12)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>Your Price</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 42, color: '#1A1917', lineHeight: 1, marginTop: 6 }}>
                ₹{result.input_price?.toLocaleString('en-IN')}
              </div>
              <ProbBar value={result.current_win_probability} />
            </div>
            <div style={{ padding: '20px 24px', background: '#EDEAE2', borderLeft: '4px solid #1A7A4A' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>Optimal Price</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 42, color: '#1A7A4A', lineHeight: 1, marginTop: 6 }}>
                ₹{result.optimal_price?.toLocaleString('en-IN')}
              </div>
              <ProbBar value={result.optimal_win_probability} />
            </div>
          </div>

          {/* Sweep */}
          <div>
            <SectionLabel>Price Sweep</SectionLabel>
            <div style={{ border: '1px solid rgba(26,25,23,0.12)' }}>
              {result.price_sweep?.map((row, i) => {
                const isOpt = row.price === result.optimal_price
                const isCur = row.price === result.input_price
                const pct   = Math.round(row.win_probability * 100)
                const col   = pct >= 70 ? '#1A7A4A' : pct >= 40 ? '#D4A017' : '#D84A1B'
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '130px 55px 1fr' + (row.margin != null ? ' 90px' : ''),
                    alignItems: 'center', gap: 14, padding: '9px 14px',
                    background: isOpt ? 'rgba(26,122,74,0.06)' : 'transparent',
                    borderBottom: i < result.price_sweep.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none',
                  }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: isOpt ? '#1A7A4A' : '#1A1917', fontWeight: isOpt ? 700 : 400 }}>
                      ₹{row.price?.toLocaleString('en-IN')}
                      {isOpt && <span style={{ fontSize: 8, marginLeft: 5, color: '#1A7A4A' }}>OPTIMAL</span>}
                      {isCur && !isOpt && <span style={{ fontSize: 8, marginLeft: 5, color: '#8A8780' }}>YOURS</span>}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: col, textAlign: 'right' }}>{pct}%</div>
                    <div style={{ height: 4, background: 'rgba(26,25,23,0.08)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                    </div>
                    {row.margin != null && (
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: row.margin >= 0 ? '#1A7A4A' : '#D84A1B', textAlign: 'right' }}>
                        ₹{row.margin?.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{ color: '#D84A1B', fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>
          {result.error}: {result.message || ''}
        </div>
      )}
    </div>
  )
}
