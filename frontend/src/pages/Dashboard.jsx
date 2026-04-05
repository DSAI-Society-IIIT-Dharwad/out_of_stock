import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionLabel from '../components/ui/SectionLabel'
import { BtnPrimary } from '../components/ui/Btn'
import { toIST } from '../utils/time'
import { usePolling } from '../hooks/usePolling'

export default function Dashboard() {
  const { asins, alerts, fetchAsins, fetchAlerts, loading, triggerScrape } = useStore()
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')

  // Poll ASINs every 30s, alerts every 15s
  usePolling(fetchAsins, 30000, [])
  usePolling(fetchAlerts, 15000, [])

  const handleScrape = async () => {
    setScraping(true)
    setScrapeMsg('')
    try {
      const res = await triggerScrape(
        ['6205', '6206', '6207', '6208', '6209', '6210'],
        ['chennai', 'bangalore', 'mumbai']
      )
      setScrapeMsg(res.message || `Job ${res.job_id} accepted`)
    } catch (e) {
      setScrapeMsg('Failed to trigger scrape')
    } finally {
      setScraping(false)
    }
  }

  const priceDrop = alerts.filter(a => a.type === 'PRICE_DROP').length
  const buyboxChange = alerts.filter(a => a.type === 'BUYBOX_CHANGE').length
  const priceWar = alerts.filter(a => a.type === 'PRICE_WAR').length
  const stockout = alerts.filter(a => a.type === 'STOCKOUT_SIGNAL').length

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[rgba(26,25,23,0.12)] pb-6">
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em', lineHeight: 1, color: '#1A1917' }}>
            GENERAL<br />
          </div>
          <div style={{ fontSize: 11, color: '#8A8780', marginTop: 8, letterSpacing: '0.04em' }}>
            Real-time Amazon bearing price intelligence · Indian distributors
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* <BtnPrimary onClick={handleScrape} disabled={scraping}>
            {scraping ? '⟳ Running...' : '▶ Run Scraper'}
          </BtnPrimary> */}
          {scrapeMsg && (
            <div style={{ fontSize: 10, color: '#1A7A4A', fontFamily: "'IBM Plex Mono', monospace" }}>
              ✓ {scrapeMsg}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[rgba(26,25,23,0.12)]">
        {[
          { label: 'Tracked ASINs', value: asins.length, color: '#1A1917' },
          { label: 'Price Drops', value: priceDrop, color: '#D84A1B' },
          { label: 'Buy Box Changes', value: buyboxChange, color: '#C47A10' },
          { label: 'Price Wars', value: priceWar, color: '#D84A1B' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="p-6"
            style={{
              borderRight: i < 3 ? '1px solid rgba(26,25,23,0.12)' : 'none',
              background: '#EDEAE2',
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8780' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 40, color: s.color, lineHeight: 1, marginTop: 8 }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Alert feed + ASIN list side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Alerts */}
        <div>
          <SectionLabel>Recent Alerts</SectionLabel>
          <Card className="p-0">
            {alerts.length === 0 && (
              <div className="p-4" style={{ color: '#8A8780', fontSize: 11 }}>No alerts fired yet. Run the scraper to start.</div>
            )}
            {alerts.slice(0, 12).map((a, i) => (
              <div
                key={a.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{
                  borderBottom: i < Math.min(alerts.length, 12) - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none',
                  borderLeft: `3px solid ${a.type === 'PRICE_DROP' || a.type === 'PRICE_WAR' ? '#D84A1B' : a.type === 'BUYBOX_CHANGE' ? '#C47A10' : '#1B6BD8'}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge type={a.type} />
                    {a.whatsapp_sent && (
                      <span style={{ fontSize: 9, color: '#1A7A4A', letterSpacing: '0.06em' }}>📱 SENT</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#1A1917', lineHeight: 1.5 }}>{a.message}</div>
                  <div style={{ fontSize: 9, color: '#8A8780', marginTop: 4, letterSpacing: '0.04em' }}>
                    {a.model} · {a.location?.toUpperCase()} · {toIST(a.fired_at)}
                  </div>
                </div>
              </div>
            ))}
          </Card>
          {alerts.length > 0 && (
            <div className="mt-2">
              <Link to="/alerts" style={{ fontSize: 10, color: '#1B6BD8', letterSpacing: '0.06em', textDecoration: 'none' }}>
                VIEW ALL {alerts.length} ALERTS →
              </Link>
            </div>
          )}
        </div>

        {/* ASIN Table */}
        <div>
          <SectionLabel>Tracked ASINs</SectionLabel>
          <Card className="p-0 overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(26,25,23,0.12)' }}>
                  {['ASIN', 'Model', 'Locations', 'Last Scraped'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8780', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asins.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px 12px', color: '#8A8780', fontSize: 11 }}>
                      No data yet — run the scraper first.
                    </td>
                  </tr>
                )}
                {asins.map((a, i) => (
                  <tr
                    key={a.asin}
                    style={{ borderBottom: i < asins.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none' }}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <Link
                        to={`/prices?asin=${a.asin}`}
                        style={{ color: '#1B6BD8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textDecoration: 'none' }}
                      >
                        {a.asin}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#1A1917', fontWeight: 500 }}>{a.model}</td>
                    <td style={{ padding: '8px 12px', color: '#4A4845', fontSize: 10 }}>
                      {a.locations_tracked?.join(', ')}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#8A8780', fontSize: 10 }}>
                      {toIST(a.last_scraped)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* Signal summary */}
      {(priceWar > 0 || stockout > 0) && (
        <div>
          <SectionLabel>Active Signals</SectionLabel>
          <div className="flex gap-4 flex-wrap">
            {priceWar > 0 && (
              <div style={{ background: 'rgba(216,74,27,0.08)', border: '1px solid #D84A1B', padding: '12px 16px' }}>
                <div style={{ fontSize: 9, color: '#D84A1B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚑ Price War Active</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#D84A1B' }}>{priceWar}</div>
              </div>
            )}
            {stockout > 0 && (
              <div style={{ background: 'rgba(27,107,216,0.08)', border: '1px solid #1B6BD8', padding: '12px 16px' }}>
                <div style={{ fontSize: 9, color: '#1B6BD8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>◈ Stockout Signals</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#1B6BD8' }}>{stockout}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
