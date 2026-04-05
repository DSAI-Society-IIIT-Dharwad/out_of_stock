import { useState } from 'react'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { toIST } from '../utils/time'
import { usePolling } from '../hooks/usePolling'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const LOCATIONS = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'kolkata']
const PALETTE = ['#1A1917', '#D84A1B', '#1B6BD8', '#1A7A4A', '#C47A10', '#4A4845']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1A1917', border: '1px solid rgba(245,243,238,0.15)', padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ fontSize: 11, color: '#F5F3EE', fontWeight: 500 }}>{d.seller}</div>
      <div style={{ fontSize: 10, color: 'rgba(245,243,238,0.6)', marginTop: 2 }}>₹{d.price?.toLocaleString('en-IN')}</div>
      <div style={{ fontSize: 10, color: 'rgba(245,243,238,0.5)', marginTop: 2 }}>{d.mins} min held</div>
    </div>
  )
}

export default function BuyBox() {
  const { asins, buybox, fetchAsins, fetchBuybox } = useStore()
  const [asin, setAsin] = useState('')
  const [location, setLocation] = useState('chennai')

  usePolling(fetchAsins, 60000, [])
  usePolling(() => { if (asin) fetchBuybox(asin, location) }, 15000, [asin, location])

  const key = `${asin}_${location}`
  const data = buybox[key]

  const chartData = data?.history?.map((h, i) => {
    const from = new Date(h.held_from)
    const to = h.held_until ? new Date(h.held_until) : new Date()
    const mins = Math.max(1, Math.round((to - from) / 60000))
    return { seller: h.seller, mins, price: h.price, color: PALETTE[i % PALETTE.length] }
  }) || []

  const current = data?.history?.find(h => !h.held_until)

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
        BUY BOX TIMELINE
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Select value={asin} onChange={e => setAsin(e.target.value)}>
          <option value="">— Select ASIN —</option>
          {asins.map(a => <option key={a.asin} value={a.asin}>{a.model} · {a.asin}</option>)}
        </Select>
        <Select value={location} onChange={e => setLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </Select>
      </div>

      {!asin && <div style={{ color: '#8A8780', fontSize: 11 }}>Select an ASIN to view Buy Box history.</div>}

      {current && (
        <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)', padding: '16px 20px', borderLeft: '4px solid #1A7A4A' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>Current Buy Box Holder</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: '#1A1917', marginTop: 4 }}>
            {current.seller}
          </div>
          <div style={{ fontSize: 11, color: '#4A4845', marginTop: 2 }}>
            ₹{current.price?.toLocaleString('en-IN')} · since {toIST(current.held_from)}
          </div>
          <div style={{ display: 'inline-block', width: 8, height: 8, background: '#1A7A4A', marginTop: 6 }} />
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <Card>
            <SectionLabel>Hold Duration by Seller (minutes)</SectionLabel>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                <XAxis
                  dataKey="seller"
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(26,25,23,0.15)' }}
                />
                <YAxis
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}m`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                <Bar dataKey="mins" radius={0}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div>
            <SectionLabel>Full History</SectionLabel>
            <Card className="p-0">
              {data.history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{
                    borderBottom: i < data.history.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none',
                    background: !h.held_until ? 'rgba(26,122,74,0.04)' : 'transparent',
                  }}
                >
                  <div style={{ width: 8, height: 8, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, color: '#1A1917', fontWeight: 500 }}>{h.seller}</span>
                    <span style={{ fontSize: 10, color: '#4A4845', marginLeft: 8 }}>₹{h.price?.toLocaleString('en-IN')}</span>
                    {!h.held_until && (
                      <span style={{ fontSize: 9, color: '#1A7A4A', marginLeft: 8, letterSpacing: '0.06em' }}>● CURRENT</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 10, color: '#8A8780' }}>
                    <div>{toIST(h.held_from)}</div>
                    <div>{h.held_until ? toIST(h.held_until) : 'now'}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {data?.error && <div style={{ color: '#D84A1B', fontSize: 11 }}>{data.message}</div>}
    </div>
  )
}
