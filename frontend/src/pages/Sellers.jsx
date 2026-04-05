import { useState } from 'react'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import Select from '../components/ui/Select'
import { toIST } from '../utils/time'
import { usePolling } from '../hooks/usePolling'

const LOCATIONS = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'kolkata']

export default function Sellers() {
  const { asins, sellers, fetchAsins, fetchSellers } = useStore()
  const [asin, setAsin] = useState('')
  const [location, setLocation] = useState('chennai')

  usePolling(fetchAsins, 60000, [])
  usePolling(() => { if (asin) fetchSellers(asin, location) }, 15000, [asin, location])

  const key = `${asin}_${location}`
  const data = sellers[key]

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
        SELLER COMPARISON
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

      {!asin && <div style={{ color: '#8A8780', fontSize: 11 }}>Select an ASIN to view seller data.</div>}

      {data && !data.error && (
        <>
          {/* Buy Box summary card */}
          <div style={{ background: '#EDEAE2', border: '1px solid rgba(26,25,23,0.12)', padding: '20px 24px' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>ASIN</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#1A1917', marginTop: 4 }}>{asin}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>Buy Box Winner</div>
                <div style={{ fontSize: 13, color: '#1A1917', fontWeight: 500, marginTop: 4 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: '#1A7A4A', marginRight: 6 }} />
                  {data.buybox_seller || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>Buy Box Price</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#1A1917', marginTop: 4 }}>
                  ₹{data.buybox_price?.toLocaleString('en-IN') || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8780' }}>PIN Code · Scraped</div>
                <div style={{ fontSize: 11, color: '#4A4845', marginTop: 4 }}>{data.pin_code}</div>
                <div style={{ fontSize: 10, color: '#8A8780' }}>{toIST(data.scraped_at)}</div>
              </div>
            </div>
          </div>

          {/* Seller table */}
          <div>
            <SectionLabel>All Sellers · {location.toUpperCase()}</SectionLabel>
            <Card className="p-0 overflow-x-auto">
              {(!data.sellers || data.sellers.length === 0) ? (
                <div className="p-4" style={{ color: '#8A8780', fontSize: 11 }}>
                  No offer listing data yet — the spider needs to scrape the offer page for this ASIN.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(26,25,23,0.12)' }}>
                      {['Seller', 'Price', 'FBA', 'Rating', 'Buy Box'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8780', fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sellers.map((s, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: i < data.sellers.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none',
                          background: s.is_buybox_winner ? 'rgba(26,122,74,0.04)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px 12px', color: '#1A1917', fontWeight: s.is_buybox_winner ? 500 : 400 }}>
                          {s.is_buybox_winner && <span style={{ display: 'inline-block', width: 6, height: 6, background: '#1A7A4A', marginRight: 6 }} />}
                          {s.name}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1A1917' }}>
                          ₹{s.price?.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 12px', color: s.is_fba ? '#1A7A4A' : '#8A8780', fontSize: 10 }}>
                          {s.is_fba ? 'FBA ✓' : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#4A4845', fontSize: 10 }}>{s.rating || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {s.is_buybox_winner
                            ? <span style={{ fontSize: 9, color: '#1A7A4A', letterSpacing: '0.06em' }}>● ACTIVE</span>
                            : <span style={{ color: '#8A8780' }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}

      {data?.error && <div style={{ color: '#D84A1B', fontSize: 11 }}>{data.message}</div>}
    </div>
  )
}
