import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useSocket } from '../lib/SocketContext'
import { useEffect, useState } from 'react'
import axios from 'axios'

const navItems = [
  { to: '/', icon: '⬡', label: 'Dashboard' },
  { to: '/dispatch', icon: '📡', label: 'Dispatch' },
  { to: '/map', icon: '◈', label: 'Live Map' },
  { to: '/records', icon: '⊞', label: 'Records' },
]

export default function Layout({ children }) {
  const { user } = useAuth()
  const socket = useSocket()
  const navigate = useNavigate()
  const [myUnit, setMyUnit] = useState(null)
  const [callsignInput, setCallsignInput] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [panic, setPanic] = useState(false)
  const [panicAlert, setPanicAlert] = useState(null)
  const [serverInfo, setServerInfo] = useState(null)

  useEffect(() => {
    axios.get('/api/erlc/server').then(r => setServerInfo(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('panic:alert', (data) => {
      setPanicAlert(data)
      setTimeout(() => setPanicAlert(null), 8000)
    })
    return () => socket.off('panic:alert')
  }, [socket])

  const handleSignIn = async () => {
    if (!callsignInput.trim()) return
    setSigningIn(true)
    try {
      const res = await axios.post('/api/units/signin', { callsign: callsignInput }, { withCredentials: true })
      setMyUnit(res.data)
    } catch (e) {}
    setSigningIn(false)
  }

  const handleSignOut = async () => {
    await axios.post('/api/units/signout', {}, { withCredentials: true })
    setMyUnit(null)
    setCallsignInput('')
    setPanic(false)
  }

  const handleStatusChange = async (status) => {
    const res = await axios.patch('/api/units/status', { status }, { withCredentials: true })
    setMyUnit(res.data)
  }

  const handlePanic = () => {
    if (!socket || !myUnit) return
    setPanic(true)
    socket.emit('panic', { username: user.username, callsign: myUnit.callsign, discord_id: user.id })
    setTimeout(() => setPanic(false), 10000)
  }

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`
    : `https://cdn.discordapp.com/embed/avatars/0.png`

  return (
    <div className="layout">
      {/* Panic alert banner */}
      {panicAlert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'var(--red)', color: '#fff', padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: 2, animation: 'pulse 0.5s infinite' }}>
          🚨 PANIC — {panicAlert.username} ({panicAlert.callsign})
        </div>
      )}

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-logo">CAD <span>// Dispatch</span></div>
        {serverInfo && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>
            {serverInfo.Name} · <span style={{ color: 'var(--green)' }}>{serverInfo.CurrentPlayers}/{serverInfo.MaxPlayers}</span>
          </div>
        )}
        <div className="topbar-status">
          <span className="live-dot" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>LIVE</span>
          <img src={avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>{user?.username}</span>
          <a href="/auth/logout" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textDecoration: 'none', letterSpacing: 1 }}>LOGOUT</a>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar">
        <nav>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <hr className="divider" style={{ margin: '12px 0' }} />

        {/* Unit signin panel */}
        <div style={{ padding: '0 12px', flex: 1 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>My Unit</div>
          {!myUnit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="input"
                placeholder="Callsign (e.g. 1-Adam-12)"
                value={callsignInput}
                onChange={e => setCallsignInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                style={{ fontSize: 12 }}
              />
              <button className="btn btn-success btn-sm" onClick={handleSignIn} disabled={signingIn} style={{ width: '100%' }}>
                {signingIn ? 'SIGNING IN...' : '▶ GO ON DUTY'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)' }}>{myUnit.callsign}</div>
              <span className={`badge badge-${myUnit.status}`}>{myUnit.status}</span>
              <select
                className="input"
                style={{ fontSize: 11 }}
                value={myUnit.status}
                onChange={e => handleStatusChange(e.target.value)}
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="break">On Break</option>
              </select>
              <button className="btn btn-danger btn-sm" onClick={handleSignOut} style={{ width: '100%' }}>■ GO OFF DUTY</button>
              <button
                onClick={handlePanic}
                disabled={panic}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: panic ? 'var(--red-dim)' : 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: panic ? 'default' : 'pointer',
                  borderRadius: 3,
                  animation: panic ? 'pulse 0.5s infinite' : 'none',
                  marginTop: 4
                }}
              >
                🚨 PANIC
              </button>
            </div>
          )}
        </div>

        {user?.isAdmin && (
          <div style={{ padding: '12px', marginTop: 'auto' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'var(--accent)', background: 'rgba(0,212,255,0.1)', padding: '2px 8px', borderRadius: 2 }}>ADMIN</span>
          </div>
        )}
      </aside>

      {/* Page content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
