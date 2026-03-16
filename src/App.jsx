import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { SocketProvider } from './lib/SocketContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dispatch from './pages/Dispatch'
import LiveMap from './pages/LiveMap'
import Records from './pages/Records'

function ProtectedRoutes() {
  const { user } = useAuth()
  if (user === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Share Tech Mono, monospace', color: '#00d4ff', fontSize: 12, letterSpacing: 3 }}>
      INITIALIZING...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return (
    <SocketProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/records" element={<Records />} />
        </Routes>
      </Layout>
    </SocketProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="scanlines">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
