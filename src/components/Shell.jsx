import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUnit } from '../hooks/useUnit'
import { useUnits } from '../hooks/useUnits'
import { useCalls } from '../hooks/useCalls'
import { useErlc } from '../hooks/useErlc'
import { TEAMS, STATUSES } from '../lib/constants'
import Radio from './Radio'

const STATUS_ORDER = ['available','unavailable','busy','enroute','on_scene']

function getTeamColor(team) {
  return TEAMS[team]?.color || '#888'
}

function initials(name) {
  return name?.slice(0, 2).toUpperCase() || '??'
}

export default function Shell({ children }) {
  const { unit, logout, updateStatus, updateBodycam } = useUnit()
  const { units, setUnitStatus } = useUnits()
  const { calls } = useCalls()
  const { data: erlcData } = useErlc()
  const navigate = useNavigate()

  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showBodycamModal, setShowBodycamModal] = useState(false)
  const [bodycamUrl, setBodycamUrl] = useState(unit?.bodycam_url || '')
  const [radioOpen, setRadioOpen] = useState(true)

  const openCalls = calls.filter(c => c.status !== 'closed').length
  const isResponder = ['police','fire','ems'].includes(unit?.team)
  const isDispatch = unit?.team === 'dispatch'
  const isCivilian = unit?.team === 'civilian'

  const myActiveCalls = calls.filter(c =>
    c.status !== 'closed' &&
    (c.assigned_units || []).includes(unit?.callsign || unit?.username)
  )

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '⬡', show: true },
    { to: '/dispatch', label: 'Dispatch', icon: '📡', show: !isCivilian, badge: openCalls || null },
    { to: '/map', label: 'Live Map', icon: '◈', show: true },
    { to: '/records', label: 'Records', icon: '⊟', show: !isCivilian },
    { to: '/bodycam', label: 'Body Cams', icon: '📹', show: isDispatch || isResponder },
    { to: '/civilian', label: 'My Profile', icon: '👤', show: isCivilian },
    { to: '/civilians', label: 'Civilians', icon: '⊕', show: !isCivilian },
  ]

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div>
          <div className="logo">NEXUS</div>
          <div className="logo-sub">CAD SYSTEM</div>
        </div>

        {erlcData && (
          <div className="server-pill">
            <span className="live-dot" />
            <span>{erlcData.Name}</span>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              {erlcData.CurrentPlayers}/{erlcData.MaxPlayers}
            </span>
          </div>
        )}

        {/* Active call banner in topbar */}
        {myActiveCalls.length > 0 && (
          <div style={{
            background: 'rgba(255,59,92,.1)', border: '1px solid rgba(255,59,92,.4)',
            borderRadius: 'var(--r)', padding: '4px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 8, animation: 'emerg 1s infinite'
          }}>
            🚨 ATTACHED TO CALL — {myActiveCalls[0].title}
          </div>
        )}

        <div className="topbar-right">
          {/* Status changer for responders */}
          {isResponder && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-sm"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                onClick={() => setShowStatusMenu(s => !s)}
              >
                <span className={`badge badge-${unit?.status}`}>{unit?.status?.replace('_',' ')}</span>
                ▾
              </button>
              {showStatusMenu && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 300,
                  background: 'var(--bg-3)', border: '1px solid var(--border-bright)',
                  borderRadius: 'var(--r)', padding: 6, minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,.6)'
                }}>
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      className="btn btn-sm w-full"
                      style={{ justifyContent: 'flex-start', marginBottom: 3, fontFamily: 'var(--font-mono)', fontSize: 11 }}
                      onClick={() => { updateStatus(s.value); setShowStatusMenu(false) }}
                    >
                      <span style={{ color: s.color }}>●</span> {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bodycam toggle for police */}
          {unit?.team === 'police' && (
            <button
              className={`btn btn-sm ${unit?.bodycam_on ? 'btn-red' : ''}`}
              onClick={() => {
                if (unit?.bodycam_on) {
                  updateBodycam(false, '')
                } else {
                  setShowBodycamModal(true)
                }
              }}
            >
              {unit?.bodycam_on ? '🔴 CAM ON' : '📷 Start Bodycam'}
            </button>
          )}

          {/* Me chip */}
          <div className="me-chip">
            <div
              className="me-avatar"
              style={{ background: getTeamColor(unit?.team) + '22', color: getTeamColor(unit?.team) }}
            >
              {initials(unit?.username)}
            </div>
            <div>
              <div className="me-name">{unit?.username}</div>
              <div className="me-team">{unit?.callsign || TEAMS[unit?.team]?.label}</div>
            </div>
          </div>

          <button className="btn btn-sm btn-red" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <nav className="sidebar">
        <div className="nav-sep">Navigation</div>
        {navLinks.filter(l => l.show).map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
            {link.badge ? <span className="nav-badge">{link.badge}</span> : null}
          </NavLink>
        ))}

        <div className="nav-sep" style={{ marginTop: 'auto' }}>On Duty</div>
        <div style={{ padding: '0 4px', flex: 1, overflow: 'hidden' }}>
          {units.slice(0, 12).map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 6px', borderRadius: 4, marginBottom: 2,
              fontSize: 11
            }}>
              <span style={{ color: getTeamColor(u.team), fontSize: 12 }}>●</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
                {u.callsign || u.username}
              </span>
              <span className={`badge badge-${u.status}`} style={{ fontSize: 8, padding: '1px 4px' }}>
                {u.status?.replace('_',' ')}
              </span>
            </div>
          ))}
          {units.length === 0 && <div className="empty-state" style={{ padding: '8px 0', fontSize: 9 }}>No units on duty</div>}
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="main">
        {/* Active call info tab for responders */}
        {isResponder && myActiveCalls.length > 0 && (
          <div style={{ padding: '14px 24px 0' }}>
            {myActiveCalls.map(call => (
              <div key={call.id} className="call-banner">
                <div className="call-banner-title">🚨 ACTIVE CALL — #{call.call_number}</div>
                <div className="call-banner-row">
                  <div className="call-banner-field">
                    <div className="call-banner-lbl">Type</div>
                    <div className="call-banner-val">{call.title}</div>
                  </div>
                  <div className="call-banner-field">
                    <div className="call-banner-lbl">Location</div>
                    <div className="call-banner-val">{call.location || 'Unknown'}</div>
                  </div>
                  <div className="call-banner-field">
                    <div className="call-banner-lbl">Priority</div>
                    <div className="call-banner-val">
                      <span className={`badge badge-${call.priority}`}>{call.priority}</span>
                    </div>
                  </div>
                  <div className="call-banner-field">
                    <div className="call-banner-lbl">Called</div>
                    <div className="call-banner-val">{new Date(call.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div className="call-banner-field">
                    <div className="call-banner-lbl">Units</div>
                    <div className="call-banner-val">{(call.assigned_units || []).join(', ') || '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {children}
      </main>

      {/* ── Radio ── */}
      {unit?.team !== 'civilian' && (
        <Radio open={radioOpen} onToggle={() => setRadioOpen(o => !o)} />
      )}

      {/* ── Bodycam URL modal ── */}
      {showBodycamModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowBodycamModal(false)}>
          <div className="modal" style={{ width: 420 }}>
            <div className="modal-title">Start Body Camera</div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              Share your screen using a service like <strong style={{ color: 'var(--cyan)' }}>Streamyard</strong>, <strong style={{ color: 'var(--cyan)' }}>OBS + Restream</strong>, or any screen-share-to-URL tool. Paste the embed URL below.
            </p>
            <div className="form-group">
              <label className="form-lbl">Embed URL</label>
              <input className="input" placeholder="https://..." value={bodycamUrl} onChange={e => setBodycamUrl(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowBodycamModal(false)}>Cancel</button>
              <button className="btn btn-red" onClick={() => { updateBodycam(true, bodycamUrl); setShowBodycamModal(false) }}>
                🔴 Go Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
