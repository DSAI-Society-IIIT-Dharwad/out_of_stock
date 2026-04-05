import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'
import { useStore } from '../store/useStore'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { BtnSecondary } from '../components/ui/Btn'
import { usePolling } from '../hooks/usePolling'
import { toIST } from '../utils/time'

// India states GeoJSON — bundled in /public/india-map.json (NAME_1 property)
const INDIA_GEO = '/india-map.json'

// Map GeoJSON NAME_1 → our location key
const STATE_TO_LOC = {
  'Andhra Pradesh':        'visakhapatnam',
  'Arunachal Pradesh':     'itanagar',
  'Assam':                 'guwahati',
  'Bihar':                 'patna',
  'Chandigarh':            'chandigarh',
  'Chhattisgarh':          'raipur',
  'Dadra and Nagar Haveli':'daman',
  'Daman and Diu':         'daman',
  'Delhi':                 'delhi',
  'Goa':                   'panaji',
  'Gujarat':               'ahmedabad',
  'Haryana':               'haryana_gurugram',
  'Himachal Pradesh':      'shimla',
  'Jammu and Kashmir':     'srinagar',
  'Jharkhand':             'ranchi',
  'Karnataka':             'bangalore',
  'Kerala':                'thiruvananthapuram',
  'Lakshadweep':           'kavaratti',
  'Madhya Pradesh':        'bhopal',
  'Maharashtra':           'mumbai',
  'Manipur':               'imphal',
  'Meghalaya':             'shillong',
  'Mizoram':               'aizawl',
  'Nagaland':              'kohima',
  'Orissa':                'bhubaneswar',   // older name in this dataset
  'Odisha':                'bhubaneswar',
  'Puducherry':            'puducherry',
  'Punjab':                'chandigarh',
  'Rajasthan':             'jaipur',
  'Sikkim':                'gangtok',
  'Tamil Nadu':            'chennai',
  'Telangana':             'hyderabad',
  'Tripura':               'agartala',
  'Uttar Pradesh':         'lucknow',
  'Uttaranchal':           'dehradun',      // older name in this dataset
  'Uttarakhand':           'dehradun',
  'West Bengal':           'kolkata',
  'Andaman and Nicobar':   'port_blair',
}

// City marker coordinates [lng, lat]
const CITY_COORDS = {
  mumbai: [72.88, 19.08], delhi: [77.21, 28.63], bangalore: [77.59, 12.97],
  hyderabad: [78.47, 17.38], chennai: [80.27, 13.08], kolkata: [88.36, 22.57],
  ahmedabad: [72.57, 23.02], jaipur: [75.79, 26.91], lucknow: [80.95, 26.85],
  bhopal: [77.41, 23.26], patna: [85.14, 25.59], chandigarh: [76.78, 30.73],
  bhubaneswar: [85.83, 20.30], guwahati: [91.74, 26.14], ranchi: [85.33, 23.35],
  raipur: [81.63, 21.25], dehradun: [78.03, 30.32], shimla: [77.17, 31.10],
  srinagar: [74.80, 34.08], jammu: [74.86, 32.73], thiruvananthapuram: [76.94, 8.52],
  visakhapatnam: [83.30, 17.69], agartala: [91.28, 23.83], aizawl: [92.72, 23.73],
  kohima: [94.11, 25.67], imphal: [93.95, 24.82], shillong: [91.88, 25.57],
  gangtok: [88.61, 27.33], itanagar: [93.62, 27.08], panaji: [73.83, 15.49],
  haryana_gurugram: [77.03, 28.46], puducherry: [79.83, 11.93],
}

const API = '/api/v1'

export default function GeoIntel() {
  const [urlParams] = useSearchParams()
  const { asins, fetchAsins } = useStore()
  const [asin, setAsin] = useState(urlParams.get('asin') || '')
  const [geoData, setGeoData] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [tooltip, setTooltip] = useState(null) // { x, y, data }
  const [selected, setSelected] = useState(null)

  usePolling(fetchAsins, 60000, [])

  const fetchGeo = useCallback(async () => {
    if (!asin) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/geo/${asin}`)
      const data = await res.json()
      if (!data.error) {
        setGeoData(data.locations || {})
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [asin])

  usePolling(fetchGeo, 30000, [asin])

  const prices = Object.values(geoData).map(r => r.buybox_price).filter(p => p > 0)
  const minP = prices.length ? Math.min(...prices) : 0
  const maxP = prices.length ? Math.max(...prices) : 0
  const avgP = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

  // Color scale: green (cheap) → amber → red (expensive)
  const colorScale = scaleLinear()
    .domain([minP, (minP + maxP) / 2, maxP])
    .range(['#1A7A4A', '#C47A10', '#D84A1B'])
    .clamp(true)

  const getLocData = (stateName) => {
    const loc = STATE_TO_LOC[stateName]
    return loc ? geoData[loc] : null
  }

  const getFill = (stateName) => {
    const d = getLocData(stateName)
    if (!d || !d.buybox_price) return '#EDEAE2'
    return colorScale(d.buybox_price)
  }

  const buyboxWinners = {}
  Object.values(geoData).forEach(r => {
    if (r.buybox_seller) buyboxWinners[r.buybox_seller] = (buyboxWinners[r.buybox_seller] || 0) + 1
  })
  const topSeller = Object.entries(buyboxWinners).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[rgba(26,25,23,0.12)] pb-6">
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
            GEO INTELLIGENCE
          </div>
          <div style={{ fontSize: 11, color: '#8A8780', marginTop: 6 }}>
            Buy Box price across India · PIN code level · {Object.keys(geoData).length}/36 states covered
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span style={{ fontSize: 9, color: '#8A8780', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
              {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          )}
          <BtnSecondary onClick={fetchGeo} disabled={!asin || loading}>
            {loading ? '⟳' : '↻ Refresh'}
          </BtnSecondary>
        </div>
      </div>

      {/* ASIN selector */}
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={asin} onChange={e => { setAsin(e.target.value); setGeoData({}); setSelected(null) }}>
          <option value="">— Select ASIN —</option>
          {asins.map(a => <option key={a.asin} value={a.asin}>{a.model} · {a.asin}</option>)}
        </Select>
        {!asin && <span style={{ fontSize: 11, color: '#8A8780' }}>Select an ASIN to see price distribution across India.</span>}
      </div>

      {asin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Map — takes 2/3 width */}
          <div className="lg:col-span-2">
            <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)', position: 'relative' }}>
              {loading && Object.keys(geoData).length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'rgba(237,234,226,0.8)', fontSize: 11, color: '#8A8780' }}>
                  ⟳ Loading map data...
                </div>
              )}

              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ center: [82, 22], scale: 1000 }}
                style={{ width: '100%', height: 520 }}
              >
                <ZoomableGroup>
                  <Geographies geography={INDIA_GEO}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const stateName = geo.properties.NAME_1 || ''
                        const locData = getLocData(stateName)
                        const fill = getFill(stateName)
                        const isSelected = selected === stateName

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isSelected ? '#1A1917' : fill}
                            stroke="#F5F3EE"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none', cursor: locData ? 'pointer' : 'default' },
                              hover: { fill: locData ? '#1A1917' : '#D5D2CA', outline: 'none', cursor: locData ? 'pointer' : 'default' },
                              pressed: { outline: 'none' },
                            }}
                            onMouseEnter={(e) => {
                              if (locData) {
                                setTooltip({
                                  x: e.clientX, y: e.clientY,
                                  stateName, locData,
                                })
                              }
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => {
                              if (locData) setSelected(isSelected ? null : stateName)
                            }}
                          />
                        )
                      })
                    }
                  </Geographies>

                  {/* City markers for locations with data */}
                  {Object.entries(geoData).map(([loc, d]) => {
                    const coords = CITY_COORDS[loc]
                    if (!coords || !d.buybox_price) return null
                    return (
                      <Marker key={loc} coordinates={coords}>
                        <circle r={3} fill="#1A1917" stroke="#F5F3EE" strokeWidth={1} />
                      </Marker>
                    )
                  })}
                </ZoomableGroup>
              </ComposableMap>

              {/* Legend */}
              <div className="flex items-center gap-4 px-4 pb-3">
                <span style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Price:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 80, height: 8, background: 'linear-gradient(to right, #1A7A4A, #C47A10, #D84A1B)' }} />
                  <span style={{ fontSize: 9, color: '#8A8780' }}>Low → High</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.2)' }} />
                  <span style={{ fontSize: 9, color: '#8A8780' }}>No data</span>
                </div>
                {minP > 0 && (
                  <>
                    <span style={{ fontSize: 9, color: '#1A7A4A', fontFamily: "'IBM Plex Mono', monospace" }}>
                      MIN ₹{minP.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: 9, color: '#D84A1B', fontFamily: "'IBM Plex Mono', monospace" }}>
                      MAX ₹{maxP.toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right panel — stats + selected state detail */}
          <div className="space-y-4">

            {/* Summary stats */}
            {prices.length > 0 && (
              <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)' }}>
                {[
                  { label: 'Min Price', value: `₹${minP.toLocaleString('en-IN')}`, color: '#1A7A4A',
                    sub: Object.entries(geoData).find(([,r]) => r.buybox_price === minP)?.[0] },
                  { label: 'Max Price', value: `₹${maxP.toLocaleString('en-IN')}`, color: '#D84A1B',
                    sub: Object.entries(geoData).find(([,r]) => r.buybox_price === maxP)?.[0] },
                  { label: 'Avg Price', value: `₹${Math.round(avgP).toLocaleString('en-IN')}`, color: '#1A1917',
                    sub: `${prices.length} locations` },
                  { label: 'Top Buy Box', value: topSeller?.[0] || '—', color: '#1B6BD8',
                    sub: topSeller ? `${topSeller[1]} states` : '' },
                ].map((s, i) => (
                  <div key={s.label} className="px-4 py-3" style={{ borderBottom: i < 3 ? '1px solid rgba(26,25,23,0.08)' : 'none' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>{s.label}</div>
                    <div style={{
                      fontFamily: s.label === 'Top Buy Box' ? "'IBM Plex Mono', monospace" : "'Syne', sans-serif",
                      fontWeight: 800, fontSize: s.label === 'Top Buy Box' ? 12 : 20,
                      color: s.color, marginTop: 2, lineHeight: 1.2,
                    }}>
                      {s.value}
                    </div>
                    {s.sub && <div style={{ fontSize: 9, color: '#8A8780', marginTop: 2 }}>{s.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Selected state detail */}
            {selected && (() => {
              const loc = STATE_TO_LOC[selected]
              const d = loc ? geoData[loc] : null
              return (
                <div style={{ background: '#1A1917', padding: '16px', borderTop: '3px solid #D84A1B' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div style={{ fontSize: 9, color: 'rgba(245,243,238,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {selected}
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(245,243,238,0.4)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                  {d ? (
                    <>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: '#F5F3EE', lineHeight: 1 }}>
                        ₹{d.buybox_price?.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(245,243,238,0.7)', marginTop: 6 }}>{d.buybox_seller}</div>
                      <div style={{ fontSize: 9, color: 'rgba(245,243,238,0.4)', marginTop: 4 }}>PIN {d.pin_code}</div>
                      <div style={{ fontSize: 9, color: 'rgba(245,243,238,0.4)', marginTop: 2 }}>{toIST(d.scraped_at)}</div>
                      {avgP > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                          <span style={{ color: d.buybox_price < avgP ? '#1A7A4A' : '#D84A1B' }}>
                            {d.buybox_price < avgP ? '▼' : '▲'} ₹{Math.abs(d.buybox_price - avgP).toLocaleString('en-IN')} vs avg
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'rgba(245,243,238,0.4)', fontSize: 11 }}>No data for this state yet.</div>
                  )}
                </div>
              )
            })()}

            {/* All locations list */}
            {Object.keys(geoData).length > 0 && (
              <div>
                <SectionLabel>All Covered Locations</SectionLabel>
                <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)', maxHeight: 280, overflowY: 'auto' }}>
                  {Object.entries(geoData)
                    .filter(([, d]) => d.buybox_price > 0)
                    .sort((a, b) => a[1].buybox_price - b[1].buybox_price)
                    .map(([loc, d], i, arr) => (
                      <div
                        key={loc}
                        className="flex items-center justify-between px-3 py-2"
                        style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none' }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: '#1A1917' }}>{d.state || loc}</div>
                          <div style={{ fontSize: 9, color: '#8A8780' }}>{d.buybox_seller}</div>
                        </div>
                        <div style={{
                          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14,
                          color: d.buybox_price === minP ? '#1A7A4A' : d.buybox_price === maxP ? '#D84A1B' : '#1A1917',
                        }}>
                          ₹{d.buybox_price?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 10,
          background: '#1A1917',
          border: '1px solid rgba(245,243,238,0.15)',
          padding: '8px 12px',
          fontFamily: "'IBM Plex Mono', monospace",
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          <div style={{ fontSize: 9, color: 'rgba(245,243,238,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tooltip.stateName}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#F5F3EE', marginTop: 2 }}>
            ₹{tooltip.locData.buybox_price?.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(245,243,238,0.6)', marginTop: 2 }}>{tooltip.locData.buybox_seller}</div>
        </div>
      )}
    </div>
  )
}
