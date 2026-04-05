import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { BtnPrimary } from '../components/ui/Btn'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts'

const API = '/api/v1'
const PALETTE = ['#1A1917', '#D84A1B', '#1B6BD8', '#1A7A4A', '#C47A10', '#7C3AED', '#0891B2', '#BE185D', '#059669', '#DC2626']

async function apiFetch(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1917', border: '1px solid rgba(245,243,238,0.15)', padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
      <div style={{ color: 'rgba(245,243,238,0.5)', marginBottom: 4, fontSize: 10 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#F5F3EE' }}>{p.name}: ₹{Number(p.value).toLocaleString('en-IN')}</div>
      ))}
    </div>
  )
}

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1917', border: '1px solid rgba(245,243,238,0.15)', padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
      <div style={{ color: 'rgba(245,243,238,0.5)', marginBottom: 4, fontSize: 10 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#F5F3EE' }}>{p.name}: {Number(p.value).toLocaleString('en-IN')}</div>
      ))}
    </div>
  )
}

// ── Custom SVG Donut (replaces recharts PieChart — always renders) ─────────────
function DonutChart({ data, size = 180 }) {
  if (!data?.length) return (
    <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8780', fontSize: 11 }}>No data</div>
  )
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  const cx = size / 2, cy = size / 2
  const r = size * 0.36, ri = size * 0.22
  let angle = -Math.PI / 2
  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const xi1 = cx + ri * Math.cos(angle - sweep), yi1 = cy + ri * Math.sin(angle - sweep)
    const xi2 = cx + ri * Math.cos(angle), yi2 = cy + ri * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { ...d, path: `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${ri},${ri} 0 ${large},0 ${xi1},${yi1} Z` }
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1A1917" fontSize={13} fontFamily="'Syne', sans-serif" fontWeight={800}>{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#8A8780" fontSize={9} fontFamily="'IBM Plex Mono', monospace">TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, background: d.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: '#1A1917', fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontSize: 10, color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace" }}>
                {d.value} · {Math.round(d.value / total * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function StatBox({ label, value, color = '#1A1917', sub, border }) {
  return (
    <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)', borderLeft: border ? `4px solid ${border}` : undefined, padding: '20px 24px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8780' }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color, lineHeight: 1, marginTop: 8 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 10, color: '#8A8780', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ h = 200 }) {
  return <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8780', fontSize: 11 }}>No data yet — run the scraper first.</div>
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 18px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: active ? '#1A1917' : 'transparent',
      color: active ? '#F5F3EE' : '#8A8780',
      border: 'none', borderBottom: active ? '2px solid #D84A1B' : '2px solid transparent',
      cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      <span>{icon}</span>{label}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Overview
// ══════════════════════════════════════════════════════════════════════════════
function PageOverview({ regionData, locationData, fbaData, trendData, model }) {
  const totalRecords = regionData.reduce((s, r) => s + (r.data_points || 0), 0)
  const globalMin = regionData.length ? Math.min(...regionData.map(r => r.min_price).filter(Boolean)) : null
  const globalMax = regionData.length ? Math.max(...regionData.map(r => r.max_price).filter(Boolean)) : null
  const totalSellers = [...new Set(fbaData.map(r => r.buybox_seller))].length

  const fbaChartData = fbaData.map(r => ({
    name: r.buybox_is_fba ? 'FBA' : 'Non-FBA',
    value: r.wins,
    color: r.buybox_is_fba ? '#1A7A4A' : '#D84A1B',
  }))

  // Trend: group by date
  const byDay = {}
  trendData.forEach(r => {
    const day = r.scraped_at?.slice(0, 10) || ''
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(r.buybox_price)
  })
  const trendChart = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, prices]) => ({
      day: day.slice(5),
      avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
    }))

  const regionBarData = regionData.map(r => ({ region: r.region, avg: r.avg_price, min: r.min_price, max: r.max_price }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[rgba(26,25,23,0.12)]">
        <StatBox label="Price Records" value={totalRecords.toLocaleString('en-IN')} color="#1B6BD8" sub={`${regionData.length} regions`} />
        <StatBox label="Market Low" value={globalMin ? `₹${globalMin.toLocaleString('en-IN')}` : '—'} color="#1A7A4A" sub="lowest avg buy box" border="#1A7A4A" />
        <StatBox label="Market High" value={globalMax ? `₹${globalMax.toLocaleString('en-IN')}` : '—'} color="#D84A1B" sub="highest avg buy box" border="#D84A1B" />
        <StatBox label="Locations" value={locationData.length} color="#C47A10" sub="cities tracked" />
      </div>

      {/* Trend + FBA side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionLabel>Buy Box Price Trend</SectionLabel>
          <Card>
            {trendChart.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendChart} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip content={<DarkTooltip />} />
                    <Line type="monotone" dataKey="avg" stroke="#1B6BD8" strokeWidth={2} dot={false} name="Avg" />
                    <Line type="monotone" dataKey="min" stroke="#1A7A4A" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Min" />
                    <Line type="monotone" dataKey="max" stroke="#D84A1B" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Max" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2" style={{ fontSize: 10, color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span style={{ color: '#1B6BD8' }}>— avg</span>
                  <span style={{ color: '#1A7A4A' }}>- - min</span>
                  <span style={{ color: '#D84A1B' }}>- - max</span>
                </div>
              </>
            ) : <Empty h={220} />}
          </Card>
        </div>
        <div>
          <SectionLabel>FBA vs Non-FBA Wins</SectionLabel>
          <Card style={{ minHeight: 260 }}>
            <DonutChart data={fbaChartData} size={160} />
          </Card>
        </div>
      </div>

      {/* Region bar */}
      <div>
        <SectionLabel>Avg Buy Box Price by Region</SectionLabel>
        <Card>
          {regionBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={regionBarData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} />
                <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                <Bar dataKey="avg" fill="#1B6BD8" radius={0} name="Avg" />
                <Bar dataKey="min" fill="#1A7A4A" radius={0} name="Min" />
                <Bar dataKey="max" fill="#D84A1B" radius={0} name="Max" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty h={240} />}
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — Geo Prices
// ══════════════════════════════════════════════════════════════════════════════
function PageGeo({ locationData, regionData }) {
  const locationBarData = [...locationData]
    .sort((a, b) => a.avg_price - b.avg_price)
    .slice(0, 14)
    .map(r => ({ location: r.location?.toUpperCase(), avg: r.avg_price, min: r.min_price }))

  // Price spread per region (max - min)
  const spreadData = regionData.map(r => ({
    region: r.region,
    spread: Math.round((r.max_price || 0) - (r.min_price || 0)),
    avg: r.avg_price,
  })).sort((a, b) => b.spread - a.spread)

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border border-[rgba(26,25,23,0.12)]">
        <StatBox label="Locations Tracked" value={locationData.length} color="#1B6BD8" />
        <StatBox label="Regions" value={regionData.length} color="#C47A10" />
        <StatBox label="Cheapest City" value={locationBarData[0]?.location || '—'} color="#1A7A4A"
          sub={locationBarData[0] ? `₹${locationBarData[0].avg?.toLocaleString('en-IN')} avg` : ''} />
      </div>

      {/* Location horizontal bar */}
      <div>
        <SectionLabel>Avg Price by Location — sorted cheapest first</SectionLabel>
        <Card>
          {locationBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(260, locationBarData.length * 26)}>
              <BarChart data={locationBarData} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 70 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <YAxis type="category" dataKey="location" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} width={64} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                <Bar dataKey="avg" fill="#C47A10" radius={0} name="Avg">
                  {locationBarData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty h={260} />}
        </Card>
      </div>

      {/* Price spread */}
      <div>
        <SectionLabel>Price Spread by Region (max − min)</SectionLabel>
        <Card>
          {spreadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={spreadData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} />
                <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                <Bar dataKey="spread" fill="#D84A1B" radius={0} name="Spread" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty h={220} />}
        </Card>
      </div>

      {/* Full table */}
      <div>
        <SectionLabel>Full Location Breakdown</SectionLabel>
        <Card className="p-0 overflow-x-auto">
          {locationData.length === 0 ? <div className="p-4" style={{ color: '#8A8780', fontSize: 11 }}>No data.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(26,25,23,0.12)' }}>
                  {['Location', 'Region', 'Model', 'Avg ₹', 'Min ₹', 'Points'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8780', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locationData.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < locationData.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none' }}>
                    <td style={{ padding: '8px 12px', color: '#1A1917', fontWeight: 500 }}>{r.location?.toUpperCase()}</td>
                    <td style={{ padding: '8px 12px', color: '#4A4845' }}>{r.region}</td>
                    <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#1B6BD8' }}>{r.model}</td>
                    <td style={{ padding: '8px 12px', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1A1917' }}>₹{r.avg_price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 12px', color: '#1A7A4A' }}>₹{r.min_price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 12px', color: '#8A8780' }}>{r.data_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — Sellers
// ══════════════════════════════════════════════════════════════════════════════
function PageSellers({ sellerData, fbaData }) {
  const top10 = sellerData.slice(0, 10)
  const winsBar = top10.map(s => ({ seller: s.buybox_seller?.split(' ')[0], wins: s.wins, fba: s.fba_wins }))
  const priceBar = top10.map(s => ({ seller: s.buybox_seller?.split(' ')[0], avg: s.avg_price, min: s.min_price, max: s.max_price }))

  const fbaWins = fbaData.find(r => r.buybox_is_fba)?.wins || 0
  const nonFbaWins = fbaData.find(r => !r.buybox_is_fba)?.wins || 0
  const fbaDonut = [
    { name: 'FBA', value: fbaWins, color: '#1A7A4A' },
    { name: 'Non-FBA', value: nonFbaWins, color: '#D84A1B' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[rgba(26,25,23,0.12)]">
        <StatBox label="Total Sellers" value={sellerData.length} color="#1B6BD8" />
        <StatBox label="Top Seller" value={sellerData[0]?.buybox_seller?.split(' ')[0] || '—'} color="#C47A10"
          sub={sellerData[0] ? `${sellerData[0].wins} wins` : ''} />
        <StatBox label="FBA Wins" value={fbaWins.toLocaleString('en-IN')} color="#1A7A4A" border="#1A7A4A" />
        <StatBox label="Non-FBA Wins" value={nonFbaWins.toLocaleString('en-IN')} color="#D84A1B" border="#D84A1B" />
      </div>

      {/* Wins bar + FBA donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionLabel>Top 10 Sellers — Buy Box Wins</SectionLabel>
          <Card>
            {winsBar.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={winsBar} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                  <XAxis dataKey="seller" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780', angle: -30, textAnchor: 'end' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} interval={0} />
                  <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                  <Bar dataKey="wins" fill="#1A1917" radius={0} name="Total Wins">
                    {winsBar.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                  <Bar dataKey="fba" fill="#1A7A4A" radius={0} name="FBA Wins" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty h={240} />}
          </Card>
        </div>
        <div>
          <SectionLabel>FBA Split</SectionLabel>
          <Card style={{ minHeight: 260 }}>
            <DonutChart data={fbaDonut} size={160} />
          </Card>
        </div>
      </div>

      {/* Price range bar */}
      <div>
        <SectionLabel>Price Range per Seller (top 10)</SectionLabel>
        <Card>
          {priceBar.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={priceBar} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                <XAxis dataKey="seller" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780', angle: -30, textAnchor: 'end' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} interval={0} />
                <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                <Bar dataKey="avg" fill="#1B6BD8" radius={0} name="Avg" />
                <Bar dataKey="min" fill="#1A7A4A" radius={0} name="Min" />
                <Bar dataKey="max" fill="#D84A1B" radius={0} name="Max" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty h={240} />}
        </Card>
      </div>

      {/* Leaderboard table */}
      <div>
        <SectionLabel>Full Leaderboard</SectionLabel>
        <Card className="p-0 overflow-x-auto">
          {sellerData.length === 0 ? <div className="p-4" style={{ color: '#8A8780', fontSize: 11 }}>No data.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(26,25,23,0.12)' }}>
                  {['#', 'Seller', 'Wins', 'FBA Wins', 'Avg ₹', 'Min ₹', 'Max ₹', 'Locations', 'Models'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8780', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sellerData.map((s, i) => (
                  <tr key={i} style={{ borderBottom: i < sellerData.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none', background: i === 0 ? 'rgba(26,122,74,0.04)' : 'transparent' }}>
                    <td style={{ padding: '9px 12px', color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#1A1917', fontWeight: i < 3 ? 600 : 400 }}>
                      {i === 0 && <span style={{ display: 'inline-block', width: 6, height: 6, background: '#1A7A4A', marginRight: 6 }} />}
                      {s.buybox_seller}
                    </td>
                    <td style={{ padding: '9px 12px', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1A1917' }}>{s.wins}</td>
                    <td style={{ padding: '9px 12px', color: s.fba_wins > 0 ? '#1A7A4A' : '#8A8780' }}>{s.fba_wins}</td>
                    <td style={{ padding: '9px 12px', color: '#1A1917' }}>₹{s.avg_price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '9px 12px', color: '#1A7A4A' }}>₹{s.min_price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '9px 12px', color: '#D84A1B' }}>₹{s.max_price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '9px 12px', color: '#4A4845' }}>{s.locations}</td>
                    <td style={{ padding: '9px 12px', color: '#4A4845' }}>{s.models}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — Trend Deep Dive
// ══════════════════════════════════════════════════════════════════════════════
function PageTrend({ trendData }) {
  // Group by location
  const byLocation = {}
  trendData.forEach(r => {
    const loc = r.location || 'unknown'
    if (!byLocation[loc]) byLocation[loc] = []
    byLocation[loc].push(r)
  })

  // Build per-day avg per location
  const allDays = [...new Set(trendData.map(r => r.scraped_at?.slice(0, 10)).filter(Boolean))].sort()
  const locationLines = Object.entries(byLocation).slice(0, 6).map(([loc, rows], i) => {
    const dayMap = {}
    rows.forEach(r => {
      const d = r.scraped_at?.slice(0, 10)
      if (!dayMap[d]) dayMap[d] = []
      dayMap[d].push(r.buybox_price)
    })
    return { loc, dayMap, color: PALETTE[i] }
  })

  const multiLineData = allDays.map(day => {
    const point = { day: day.slice(5) }
    locationLines.forEach(({ loc, dayMap }) => {
      const prices = dayMap[day]
      point[loc] = prices ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null
    })
    return point
  })

  // Volume by day
  const volumeByDay = {}
  trendData.forEach(r => {
    const d = r.scraped_at?.slice(0, 10) || ''
    volumeByDay[d] = (volumeByDay[d] || 0) + 1
  })
  const volumeData = Object.entries(volumeByDay).sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day: day.slice(5), count }))

  // Model distribution donut
  const modelCounts = {}
  trendData.forEach(r => { if (r.model) modelCounts[r.model] = (modelCounts[r.model] || 0) + 1 })
  const modelDonut = Object.entries(modelCounts).map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border border-[rgba(26,25,23,0.12)]">
        <StatBox label="Data Points" value={trendData.length.toLocaleString('en-IN')} color="#1B6BD8" />
        <StatBox label="Days Covered" value={allDays.length} color="#C47A10" />
        <StatBox label="Models" value={Object.keys(modelCounts).length} color="#1A7A4A" />
      </div>

      {/* Multi-location trend */}
      <div>
        <SectionLabel>Price Trend by Location (up to 6 cities)</SectionLabel>
        <Card>
          {multiLineData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={multiLineData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} />
                  <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip content={<DarkTooltip />} />
                  {locationLines.map(({ loc, color }) => (
                    <Line key={loc} type="monotone" dataKey={loc} stroke={color} strokeWidth={2} dot={false} name={loc.toUpperCase()} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 flex-wrap">
                {locationLines.map(({ loc, color }) => (
                  <span key={loc} style={{ fontSize: 10, color, fontFamily: "'IBM Plex Mono', monospace" }}>— {loc.toUpperCase()}</span>
                ))}
              </div>
            </>
          ) : <Empty h={260} />}
        </Card>
      </div>

      {/* Volume + model split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionLabel>Scrape Volume by Day</SectionLabel>
          <Card>
            {volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,25,23,0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={{ stroke: 'rgba(26,25,23,0.15)' }} />
                  <YAxis tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: '#8A8780' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(26,25,23,0.04)' }} />
                  <Bar dataKey="count" fill="#1B6BD8" radius={0} name="Records" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty h={200} />}
          </Card>
        </div>
        <div>
          <SectionLabel>Records by Model</SectionLabel>
          <Card style={{ minHeight: 220 }}>
            <DonutChart data={modelDonut} size={160} />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — Analytics with Power BI-style tab navigation
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview', label: 'Overview',   icon: '◈' },
  { id: 'geo',      label: 'Geo Prices', icon: '⊕' },
  { id: 'sellers',  label: 'Sellers',    icon: '▣' },
  { id: 'trend',    label: 'Trend',      icon: '↗' },
]

export default function Analytics() {
  const [tab, setTab] = useState('overview')
  const [models, setModels] = useState([])
  const [model, setModel] = useState('')
  const [days, setDays] = useState('30')

  const [regionData, setRegionData] = useState([])
  const [locationData, setLocationData] = useState([])
  const [sellerData, setSellerData] = useState([])
  const [fbaData, setFbaData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastLoaded, setLastLoaded] = useState(null)

  useEffect(() => {
    apiFetch(`${API}/analytics/models`).then(setModels).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const q = model ? `?model=${encodeURIComponent(model)}` : ''
    const tq = `?days=${days}${model ? `&model=${encodeURIComponent(model)}` : ''}`
    try {
      const [reg, loc, sel, fba, trend] = await Promise.all([
        apiFetch(`${API}/analytics/price_by_region${q}`),
        apiFetch(`${API}/analytics/price_by_location${q}`),
        apiFetch(`${API}/analytics/top_sellers${q}`),
        apiFetch(`${API}/analytics/fba_stats${q}`),
        apiFetch(`${API}/analytics/price_trend${tq}`),
      ])
      setRegionData(reg)
      setLocationData(loc)
      setSellerData(sel)
      setFbaData(fba)
      setTrendData(trend)
      setLastLoaded(new Date().toLocaleTimeString('en-IN'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [model, days])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 64px' }}>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[rgba(26,25,23,0.12)] pb-5 flex-wrap gap-4 mb-0">
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
            ANALYTICS
          </div>
          <div style={{ fontSize: 11, color: '#8A8780', marginTop: 4, letterSpacing: '0.04em' }}>
            Price intelligence · {lastLoaded ? `updated ${lastLoaded}` : 'loading…'}
          </div>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <Select value={model} onChange={e => setModel(e.target.value)}>
            <option value="">All Models</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={days} onChange={e => setDays(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <BtnPrimary onClick={load} disabled={loading}>
            {loading ? '⟳ Loading…' : '↻ Refresh'}
          </BtnPrimary>
        </div>
      </div>

      {/* Power BI-style tab bar */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid rgba(26,25,23,0.12)',
        background: '#F5F3EE', marginBottom: 28, overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <Tab key={t.id} label={t.label} icon={t.icon} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
        {/* Page indicator — Power BI style */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 16, gap: 6 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: tab === t.id ? '#D84A1B' : 'rgba(26,25,23,0.2)',
              border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* Page content */}
      {tab === 'overview' && <PageOverview regionData={regionData} locationData={locationData} fbaData={fbaData} trendData={trendData} model={model} />}
      {tab === 'geo'      && <PageGeo locationData={locationData} regionData={regionData} />}
      {tab === 'sellers'  && <PageSellers sellerData={sellerData} fbaData={fbaData} />}
      {tab === 'trend'    && <PageTrend trendData={trendData} />}
    </div>
  )
}
