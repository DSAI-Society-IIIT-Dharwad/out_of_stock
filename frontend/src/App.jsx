import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import RequireAuth from './components/RequireAuth'
import { useAuth } from './store/useAuth'

import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Prices from './pages/Prices'
import BuyBox from './pages/BuyBox'
import Sellers from './pages/Sellers'
import Alerts from './pages/Alerts'
import Suggest from './pages/Suggest'
import GeoIntel from './pages/GeoIntel'
import AsinSearch from './pages/AsinSearch'
import Predict from './pages/Predict'
import Analytics from './pages/Analytics'

function AppInner() {
  const { init, token } = useAuth()
  useEffect(() => { if (token) init() }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/landing"  element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — all other routes */}
        <Route path="/*" element={
          <RequireAuth>
            <div style={{ minHeight: '100vh', background: '#F5F3EE' }}>
              <Navbar />
              <main>
                <Routes>
                  <Route path="/"          element={<Dashboard />} />
                  <Route path="/search"    element={<AsinSearch />} />
                  <Route path="/geo"       element={<GeoIntel />} />
                  <Route path="/prices"    element={<Prices />} />
                  <Route path="/buybox"    element={<BuyBox />} />
                  <Route path="/sellers"   element={<Sellers />} />
                  <Route path="/alerts"    element={<Alerts />} />
                  <Route path="/suggest"   element={<Suggest />} />
                  <Route path="/predict"   element={<Predict />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile"   element={<Profile />} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppInner />
}
