import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { toIST } from '../utils/time'
import { usePolling } from '../hooks/usePolling'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const LOCATIONS = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'kolkata']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1A1917', border: '1px solid rgba(245,243,238,0.15)', padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ fontSize: 9, color: 'rgba(245,243,238,0.5)', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#F5F3EE' }}>₹{payload[0].value?.toLocaleString('en-IN')}</div>
      <div style={{ fontSize: 10, color: 'rgba(245,243,238,0.6)', marginTop: 2 }}>{d.seller}</div>
    </div>
  )
}

export default function Prices() {
  const [params] = useSearchParams()
  const { asins, prices, fetchAsins, fetchPrices } = useStore()
  const [asin, setAsin] = useState(params.get('asin') || '')
  const [location, setLocation] = useState('chennai')

  usePolling(fetchAsins, 60000, [])
  // Re-poll price data every 15s when an ASIN is selected
  usePolling(() => { if (asin) fetchPrices(asin, location) }, 15000, [asin, location])

  const key = `${asin}_${location}`
  const data = prices[key]

  const chartData = data?.records
    ? [...data.records].reverse().map(r => ({
        time: toIST(r.scraped_at),
        price: r.buybox_price,
        seller: r.buybox_seller,
      }))
    : []

  const prices_arr = chartData.map(d => d.price).filter(Boolean)
  const minPrice = prices_arr.length ? Math.min(...prices_arr) : 0
  const maxPrice = prices_arr.length ? Math.max(...prices_arr) : 0
  const avgPrice = prices_arr.length ? prices_arr.reduce((a, b) => a + b, 0) / prices_arr.length : 0

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
        PRICE HISTORY
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={asin} onChange={e => setAsin(e.target.value)}>
          <option value="">— Select ASIN —</option>
          {asins.map(a => (
            <option key={a.asin} value={a.asin}>{a.model} · {a.asin}</option>
          ))}
        </Select>
        <Select value={location} onChange={e => setLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </Select>
        {data?.total && (
          <span style={{ fontSize: 10, color: '#8A8780', letterSpacing: '0.06em' }}>
            {data.total} RECORDS
          </span>
        )}
      </div>

      {!asin && (
        <div style={{ color: '#8A8780', fontSize: 11 }}>Select an ASIN to view price history.</div>
      )}

      {data && !data.error && chartData.length > 0 && (
        <>
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-0 border border-[rgba(26,25,23,0.12)]">
            {[
              { label: 'Min Price', value: `₹${minPrice.toLocaleString('en-IN')}`, color: '#D84A1B' },
              { label: 'Avg Price', value: `₹${Math.round(avgPrice).toLocaleString('en-IN')}`, color: '#1A1917' },
              { label: 'Max Price', value: `₹${maxPrice.toLocaleString('en-IN')}`, color: '#1A7A4A' },
            ].map((s, i) => (
              <div key={s.label} className="p-4 bg-[#EDEAE2]" style={{ borderRight: i < 2 ? '1px solid rgba(26,25,23,0.12)' : 'none' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>{s.label}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <Card>
            <SectionLabel>{data.model} · {location.toUpperCase()} · Buy Box Price Trend</SectionLabel>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(26,25,23,0.15)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `₹${v.toLocaleString('en-IN')}`}
                  width={72}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={avgPrice} stroke="rgba(26,25,23,0.2)" strokeDasharray="4 4" />
                <Line
                  type="stepAfter"
                  dataKey="price"
                  stroke="#1A1917"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#D84A1B', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Records table */}
          <div>
            <SectionLabel>All Records</SectionLabel>
            <Card className="p-0 overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(26,25,23,0.12)' }}>
                    {['#', 'Timestamp (IST)', 'Buy Box Seller', 'Price', 'Δ vs Prev'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8780', fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r, i) => {
                    const prev = data.records[i + 1]
                    const delta = prev?.buybox_price && r.buybox_price
                      ? ((r.buybox_price - prev.buybox_price) / prev.buybox_price * 100)
                      : null
                    return (
                      <tr key={r.id} style={{ borderBottom: i < data.records.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none' }}>
                        <td style={{ padding: '8px 12px', color: '#8A8780', fontSize: 10 }}>{r.id}</td>
                        <td style={{ padding: '8px 12px', color: '#4A4845', fontSize: 10 }}>{toIST(r.scraped_at)}</td>
                        <td style={{ padding: '8px 12px', color: '#1A1917' }}>{r.buybox_seller || '—'}</td>
                        <td style={{ padding: '8px 12px', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1A1917' }}>
                          ₹{r.buybox_price?.toLocaleString('en-IN') || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 10, color: delta === null ? '#8A8780' : delta < 0 ? '#D84A1B' : '#1A7A4A' }}>
                          {delta === null ? '—' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}

      {data?.error && (
        <div style={{ color: '#D84A1B', fontSize: 11 }}>{data.message}</div>
      )}
    </div>
  )
}
