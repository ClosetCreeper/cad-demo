import { useEffect, useState } from 'react'
import { useSocket } from '../lib/SocketContext'
import axios from 'axios'

const PRIORITIES = ['low', 'medium', 'high', 'emergency']

function NewIncidentModal({ onClose, onCreated, units }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'low', location: '', units: [] })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    const res = await axios.post('/api/incidents', form, { withCredentials: true })
    onCreated(res.data)
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Incident</div>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Traffic stop, suspicious person..." />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Palm Ave & 3rd St" />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." style={{ resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Assign Units</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {units.map(u => (
              <button
                key={u.discord_id}
                onClick={() => set('units', form.units.includes(u.callsign) ? form.units.filter(x => x !== u.callsign) : [...form.units, u.callsign])}
                className={`btn btn-sm ${form.units.includes(u.callsign) ? 'btn-primary' : ''}`}
              >
                {u.callsign || u.username}
              </button>
            ))}
            {units.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>No units on duty</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'CREATING...' : '✓ CREATE CALL'}</button>
        </div>
      </div>
    </div>
  )
}

function IncidentCard({ incident, units, onUpdate }) {
  const priorityBorder = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--red)', emergency: 'var(--purple)' }
  const assignedUnits = JSON.parse(incident.units || '[]')

  return (
    <div className="card" style={{ borderLeft: `3px solid ${priorityBorder[incident.priority]}`, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className={`badge badge-${incident.priority}`}>{incident.priority}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{incident.title}</span>
          </div>
          {incident.location && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>📍 {incident.location}</div>
          )}
          {incident.description && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{incident.description}</div>
          )}
          {assignedUnits.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {assignedUnits.map(u => (
                <span key={u} style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 2 }}>{u}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            #{incident.id} · {new Date(incident.created_at).toLocaleTimeString()}
          </span>
          <span className={`badge badge-${incident.status}`}>{incident.status}</span>
          {incident.status === 'open' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" onClick={() => onUpdate(incident.id, { status: 'pending' })}>PENDING</button>
              <button className="btn btn-sm btn-success" onClick={() => onUpdate(incident.id, { status: 'closed' })}>CLOSE</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dispatch() {
  const socket = useSocket()
  const [incidents, setIncidents] = useState([])
  const [units, setUnits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    axios.get(`/api/incidents${filter !== 'all' ? `?status=${filter}` : ''}`).then(r => setIncidents(r.data))
    axios.get('/api/units').then(r => setUnits(r.data))
  }, [filter])

  useEffect(() => {
    if (!socket) return
    socket.on('incident:new', i => setIncidents(prev => [i, ...prev]))
    socket.on('incident:update', i => setIncidents(prev => prev.map(x => x.id === i.id ? i : x)))
    socket.on('unit:update', u => setUnits(prev => {
      const idx = prev.findIndex(x => x.discord_id === u.discord_id)
      if (idx >= 0) { const n = [...prev]; n[idx] = u; return n }
      return [...prev, u]
    }))
    return () => { socket.off('incident:new'); socket.off('incident:update'); socket.off('unit:update') }
  }, [socket])

  const handleUpdate = async (id, patch) => {
    const res = await axios.patch(`/api/incidents/${id}`, patch, { withCredentials: true })
    setIncidents(prev => prev.map(i => i.id === id ? res.data : i))
  }

  const filtered = incidents.filter(i => filter === 'all' || i.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Dispatch Board</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ NEW CALL</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['open', 'pending', 'closed', 'all'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`} onClick={() => setFilter(f)}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Incident list */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '24px 0' }}>No {filter} incidents</div>
          ) : (
            filtered.map(i => <IncidentCard key={i.id} incident={i} units={units} onUpdate={handleUpdate} />)
          )}
        </div>

        {/* Unit status sidebar */}
        <div>
          <div className="card">
            <div className="card-header"><span className="card-title">Units On Duty</span></div>
            {units.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>No units on duty</div>
            ) : (
              units.map(u => (
                <div key={u.discord_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bg-2)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 12 }}>{u.callsign || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{u.username}</div>
                  </div>
                  <span className={`badge badge-${u.status}`}>{u.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && <NewIncidentModal onClose={() => setShowModal(false)} onCreated={i => setIncidents(prev => [i, ...prev])} units={units} />}
    </div>
  )
}
