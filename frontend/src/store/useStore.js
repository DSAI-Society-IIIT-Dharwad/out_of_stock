import { create } from 'zustand'
import { authHeaders } from './useAuth'

const API = 'https://out-of-stock-d1kw.onrender.com/api/v1'

async function apiFetch(url) {
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const useStore = create((set, get) => ({
  asins: [],
  prices: {},
  alerts: [],
  buybox: {},
  sellers: {},
  status: null,
  loading: false,
  error: null,

  fetchAsins: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch(`${API}/asins`)
      set({ asins: data.asins || [], loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  fetchPrices: async (asin, location) => {
    const key = `${asin}_${location}`
    try {
      const params = new URLSearchParams({ limit: 100 })
      if (location) params.set('location', location)
      const data = await apiFetch(`${API}/prices/${asin}?${params}`)
      set(s => ({ prices: { ...s.prices, [key]: data } }))
    } catch (e) {
      set({ error: e.message })
    }
  },

  fetchAlerts: async () => {
    try {
      const data = await apiFetch(`${API}/alerts?limit=100`)
      set({ alerts: data.alerts || [] })
    } catch (e) {
      set({ error: e.message })
    }
  },

  fetchBuybox: async (asin, location) => {
    const key = `${asin}_${location}`
    try {
      const params = location ? `?location=${location}` : ''
      const data = await apiFetch(`${API}/buybox/${asin}${params}`)
      set(s => ({ buybox: { ...s.buybox, [key]: data } }))
    } catch (e) {
      set({ error: e.message })
    }
  },

  fetchSellers: async (asin, location) => {
    const key = `${asin}_${location}`
    try {
      const params = location ? `?location=${location}` : ''
      const data = await apiFetch(`${API}/sellers/${asin}${params}`)
      set(s => ({ sellers: { ...s.sellers, [key]: data } }))
    } catch (e) {
      set({ error: e.message })
    }
  },

  fetchStatus: async () => {
    try {
      const data = await apiFetch(`${API}/status`)
      set({ status: data })
    } catch (e) {
      set({ status: null })
    }
  },

  searchAsins: async (q) => {
    try {
      const data = await apiFetch(`${API}/asins/search?q=${encodeURIComponent(q)}`)
      return data.results || []
    } catch (e) {
      return []
    }
  },

  scrapeAsin: async (asin, locations, model = '') => {
    const res = await fetch(`${API}/scrape/asin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ asin, model, locations: locations || null }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },

  triggerScrape: async (models, locations) => {
    const res = await fetch(`${API}/scrape/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ models, locations }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
}))
