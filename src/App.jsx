import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UnitProvider, useUnit } from './hooks/useUnit'
import Login from './components/Login'
import Shell from './components/Shell'
import Dashboard from './pages/Dashboard'
import Dispatch from './pages/Dispatch'
import LiveMap from './pages/LiveMap'
import Records from './pages/Records'
import Bodycam from './pages/Bodycam'
import CivilianProfile from './pages/CivilianProfile'
import Civilians from './pages/Civilians'

function Protected({ children }) {
  const { unit, loading } = useUnit()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-0)', fontFamily: 'var(--font-hud)',
        fontSize: 11, color: 'var(--cyan)', letterSpacing: 4
      }}>
        INITIALIZING...
      </div>
    )
  }

  if (!unit) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AppRoutes() {
  const { unit } = useUnit()
  const isCivilian = unit?.team === 'civilian'

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/*" element={
        <Protected>
          <Shell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dispatch" element={isCivilian ? <Navigate to="/" /> : <Dispatch />} />
              <Route path="/map" element={<LiveMap />} />
              <Route path="/records" element={isCivilian ? <Navigate to="/" /> : <Records />} />
              <Route path="/bodycam" element={isCivilian ? <Navigate to="/" /> : <Bodycam />} />
              <Route path="/civilian" element={isCivilian ? <CivilianProfile /> : <Navigate to="/" />} />
              <Route path="/civilians" element={isCivilian ? <Navigate to="/" /> : <Civilians />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Shell>
        </Protected>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <UnitProvider>
      <AppRoutes />
    </UnitProvider>
  )
}
