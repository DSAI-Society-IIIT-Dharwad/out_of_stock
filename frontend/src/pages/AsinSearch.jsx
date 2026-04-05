import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Card from '../components/ui/Card'
import SectionLabel from '../components/ui/SectionLabel'
import { BtnPrimary, BtnSecondary } from '../components/ui/Btn'
import { toIST } from '../utils/time'

export default function AsinSearch() {
  const { searchAsins, scrapeAsin } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState({}) // asin → msg
  const inputRef = useRef()

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    const res = await searchAsins(query.trim())
    setResults(res)
    setSearching(false)
  }

  const handleScrapeAsin = async (asin, model) => {
    setScrapeStatus(s => ({ ...s, [asin]: 'triggering...' }))
    try {
      const res = await scrapeAsin(asin, null, model || '')
      setScrapeStatus(s => ({ ...s, [asin]: res.message || 'accepted' }))
    } catch (e) {
      setScrapeStatus(s => ({ ...s, [asin]: `error: ${e.message}` }))
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">

      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: '#1A1917' }}>
          ASIN SEARCH
        </div>
        <div style={{ fontSize: 11, color: '#8A8780', marginTop: 6 }}>
          Search tracked ASINs by model number, ASIN, or title — then trigger a targeted scrape across all 36 locations.
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-0">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search ASIN, model (e.g. 6205), or title..."
          style={{
            flex: 1,
            background: '#F5F3EE',
            border: '1px solid rgba(26,25,23,0.3)',
            borderRight: 'none',
            color: '#1A1917',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            padding: '10px 16px',
            outline: 'none',
            borderRadius: 0,
          }}
        />
        <BtnPrimary onClick={handleSearch} disabled={searching}>
          {searching ? '⟳' : 'SEARCH'}
        </BtnPrimary>
      </form>

      {/* Quick model shortcuts */}
      <div className="flex gap-2 flex-wrap">
        <span style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>Quick:</span>
        {['6205', '6206', '6207', '6208', '6209', '6210', 'NU205', '7205'].map(m => (
          <button
            key={m}
            onClick={() => { setQuery(m); setTimeout(() => handleSearch(), 50) }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(26,25,23,0.2)',
              color: '#4A4845',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              padding: '3px 10px',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <SectionLabel>{results.length} results for "{query}"</SectionLabel>
          <Card className="p-0">
            {results.map((r, i) => (
              <div
                key={r.asin}
                className="px-4 py-4"
                style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(26,25,23,0.06)' : 'none' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* ASIN + model */}
                    <div className="flex items-center gap-3 mb-1">
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#1B6BD8' }}>
                        {r.asin}
                      </span>
                      <span style={{ fontSize: 9, background: 'rgba(26,25,23,0.08)', padding: '2px 6px', color: '#4A4845', letterSpacing: '0.06em' }}>
                        {r.model}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 12, color: '#1A1917', marginBottom: 6, lineHeight: 1.4 }}>
                      {r.title || '—'}
                    </div>

                    {/* Locations + last scraped */}
                    <div style={{ fontSize: 9, color: '#8A8780', letterSpacing: '0.04em' }}>
                      {r.locations_tracked?.length} location{r.locations_tracked?.length !== 1 ? 's' : ''} tracked
                      {r.locations_tracked?.length > 0 && (
                        <span style={{ marginLeft: 8 }}>
                          {r.locations_tracked.slice(0, 5).join(', ')}
                          {r.locations_tracked.length > 5 && ` +${r.locations_tracked.length - 5} more`}
                        </span>
                      )}
                      <span style={{ marginLeft: 12 }}>Last: {toIST(r.last_scraped)}</span>
                    </div>

                    {/* Scrape status */}
                    {scrapeStatus[r.asin] && (
                      <div style={{ fontSize: 10, color: '#1A7A4A', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                        ✓ {scrapeStatus[r.asin]}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <BtnPrimary
                      onClick={() => handleScrapeAsin(r.asin, r.model)}
                      disabled={scrapeStatus[r.asin] === 'triggering...'}
                    >
                      ▶ Scrape All 36
                    </BtnPrimary>
                    <div className="flex gap-2">
                      <Link
                        to={`/prices?asin=${r.asin}`}
                        style={{ fontSize: 10, color: '#1B6BD8', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.04em' }}
                      >
                        PRICES →
                      </Link>
                      <span style={{ color: '#8A8780' }}>·</span>
                      <Link
                        to={`/geo?asin=${r.asin}`}
                        style={{ fontSize: 10, color: '#1B6BD8', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.04em' }}
                      >
                        GEO MAP →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {results.length === 0 && query && !searching && (
        <div style={{ color: '#8A8780', fontSize: 11 }}>
          No tracked ASINs match "{query}". Run a scrape first to populate data.
        </div>
      )}

      {/* Scrape new ASIN directly */}
      <div>
        <SectionLabel>Scrape a new ASIN directly</SectionLabel>
        <Card>
          <div style={{ fontSize: 11, color: '#4A4845', marginBottom: 12, lineHeight: 1.6 }}>
            Have an ASIN not yet in the system? Enter it below to scrape it across all 36 states immediately.
          </div>
          <DirectAsinScrape scrapeAsin={scrapeAsin} />
        </Card>
      </div>
    </div>
  )
}

function DirectAsinScrape({ scrapeAsin }) {
  const [asin, setAsin] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    const clean = asin.trim().toUpperCase()
    if (!clean || clean.length < 8) return
    setLoading(true)
    setStatus('')
    try {
      const res = await scrapeAsin(clean, null)
      setStatus(res.message || 'Scrape accepted')
      setAsin('')
    } catch (e) {
      setStatus(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-0 items-center">
      <input
        value={asin}
        onChange={e => setAsin(e.target.value.toUpperCase())}
        placeholder="e.g. B07X9JKZQP"
        maxLength={12}
        style={{
          background: '#F5F3EE',
          border: '1px solid rgba(26,25,23,0.3)',
          borderRight: 'none',
          color: '#1A1917',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          padding: '8px 14px',
          outline: 'none',
          borderRadius: 0,
          width: 200,
          letterSpacing: '0.06em',
        }}
      />
      <BtnPrimary onClick={handle} disabled={loading || asin.length < 8}>
        {loading ? '⟳' : '▶ Scrape 36 States'}
      </BtnPrimary>
      {status && (
        <span style={{ marginLeft: 12, fontSize: 10, color: '#1A7A4A', fontFamily: "'IBM Plex Mono', monospace" }}>
          ✓ {status}
        </span>
      )}
    </div>
  )
}
