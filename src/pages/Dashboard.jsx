import { useEffect, useState } from 'react'
import { useSocket } from '../lib/SocketContext'
import axios from 'axios'

export default function Dashboard() {
  const socket = useSocket()
  const [erlcData, setErlcData] = useState(null)
  const [units, setUnits] = useState([])
  const [incidents, setIncidents] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    axios.get('/api/units').then(r => setUnits(r.data))
    axios.get('/api/incidents?status=open').then(r => setIncidents(r.data))
    axios.get('/api/erlc/live').then(r => { setErlcData(r.data); setLastUpdate(Date.now()) })
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('erlc:update', data => { setErlcData(data); setLastUpdate(Date.now()) })
    socket.on('unit:update', unit => setUnits(prev => {
      const idx = prev.findIndex(u => u.discord_id === unit.discord_id)
      if (idx >= 0) { const n = [...prev]; n[idx] = unit; return n; }
      return [...prev, unit]
    }))
    socket.on('unit:signout', ({ discord_id }) => setUnits(prev => prev.filter(u => u.discord_id !== discord_id)))
    socket.on('incident:new', i => setIncidents(prev => [i, ...prev]))
    socket.on('incident:update', i => setIncidents(prev => prev.map(x => x.id === i.id ? i : x).filter(x => x.status === 'open')))
    return () => { socket.off('erlc:update'); socket.off('unit:update'); socket.off('unit:signout'); socket.off('incident:new'); socket.off('incident:update') }
  }, [socket])

  const playerCount = erlcData?.players?.length || 0
  const activeUnits = units.filter(u => u.status !== 'off-duty').length
  const openIncidents = incidents.filter(i => i.status === 'open').length
  const emergencies = incidents.filter(i => i.priority === 'emergency' && i.status === 'open').length

  const timeAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate) / 1000) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-primary)' }}>Dashboard</h1>
        {timeAgo !== null && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>
            updated {timeAgo}s ago
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'In Server', value: playerCount, color: 'var(--accent)' },
          { label: 'Active Units', value: activeUnits, color: 'var(--green)' },
          { label: 'Open Calls', value: openIncidents, color: 'var(--yellow)' },
          { label: 'Emergencies', value: emergencies, color: 'var(--red)', pulse: emergencies > 0 },
        ].map(stat => (
          <div className="card" key={stat.label} style={{ borderColor: stat.pulse ? 'var(--red)' : 'var(--border)', animation: stat.pulse ? 'pulse 1s infinite' : 'none' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Active Units */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Units</span>
            <span className="badge badge-available">{activeUnits} on duty</span>
          </div>
          {units.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '12px 0' }}>No units on duty</div>
          ) : (
            <table className="table">
              <thead><tr><th>Callsign</th><th>Officer</th><th>Status</th></tr></thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.discord_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{u.callsign || '—'}</td>
                    <td>{u.username}</td>
                    <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Open Incidents */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Incidents</span>
            <span className="badge badge-open">{openIncidents} open</span>
          </div>
          {incidents.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '12px 0' }}>No active incidents</div>
          ) : (
            <table className="table">
              <thead><tr><th>Title</th><th>Priority</th><th>Location</th></tr></thead>
              <tbody>
                {incidents.slice(0, 8).map(i => (
                  <tr key={i.id}>
                    <td style={{ color: 'var(--text-primary)' }}>{i.title}</td>
                    <td><span className={`badge badge-${i.priority}`}>{i.priority}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ERLC Players */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title">In-Game Players</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{playerCount} online</span>
          </div>
          {!erlcData?.players?.length ? (
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '12px 0' }}>No players or API key not configured</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {erlcData.players.map((p, i) => (
                <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {p.Player || p.Username || p.Name || 'Unknown'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
