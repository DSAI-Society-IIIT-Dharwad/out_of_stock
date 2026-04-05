import { create } from 'zustand'

const API = 'https://out-of-stock-d1kw.onrender.com/api/v1'
const TOKEN_KEY = 'ps_token'

async function apiFetch(url, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`)
  return data
}

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  loading: false,
  error: null,

  // Restore session on app load
  init: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    try {
      const user = await apiFetch(`${API}/auth/me`)
      set({ user, token })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      set({ user: null, token: null })
    }
  },

  register: async ({ full_name, email, password, phone_number, city, state, company_name, business_type }) => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch(`${API}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password, phone_number, city, state, company_name, business_type }),
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      set({ user: data.user, token: data.token, loading: false })
      return data
    } catch (e) {
      set({ error: e.message, loading: false })
      throw e
    }
  },

  login: async ({ email, password }) => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch(`${API}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      set({ user: data.user, token: data.token, loading: false })
      return data
    } catch (e) {
      set({ error: e.message, loading: false })
      throw e
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null, error: null })
  },

  updateProfile: async (body) => {
    set({ loading: true, error: null })
    try {
      const user = await apiFetch(`${API}/auth/me`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      set({ user, loading: false })
      return user
    } catch (e) {
      set({ error: e.message, loading: false })
      throw e
    }
  },

  clearError: () => set({ error: null }),
}))

// Attach token to all store API calls
export function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}
