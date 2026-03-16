import { useState } from 'react'
import { useCalls } from '../hooks/useCalls'
import { useUnits } from '../hooks/useUnits'
import { useUnit } from '../hooks/useUnit'
import { TEAMS, PRIORITIES } from '../lib/constants'

function getTeamColor(t) { return TEAMS[t]?.color || '#888' }

const PRIORITY_ORDER = { emergency: 0, high: 1, medium: 2, low: 3 }

function NewCallModal({ onClose, onCreate, units }) {
  const { unit } = useUnit()
  const [form, setForm] = useState({
    title: '', description: '', location: '', priority: 'low',
    assigned_units: [], notes: ''
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleUnit = (cs) => set('assigned_units',
    form.assigned_units.includes(cs)
      ? form.assigned_units.filter(u => u !== cs)
      : [...form.assigned_units, cs]
  )

  // Dispatch can assign police/fire/ems; responders assign only themselves (self-dispatch)
  const isDispatch = unit?.team === 'dispatch'
  const assignableUnits = isDispatch
    ? units.filter(u => ['police', 'fire', 'ems'].includes(u.team))
    : units.filter(u => u.id === unit?.id)

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onCreate({
        ...form,
        status: 'active',
        created_by: unit?.callsign || unit?.username
      })
      onClose()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Create New Call</div>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-lbl">Call Type *</label>
              <input className="input" placeholder="Traffic stop, Robbery..." value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-lbl">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-lbl">Location</label>
            <input className="input" placeholder="Street address, postal code..." value={form.location} onChange={e => set('location', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-lbl">Description</label>
            <textarea className="input" placeholder="Additional details..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-lbl">Assign Units {!isDispatch && '(Self-Dispatch)'}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {assignableUnits.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No units available</span>
              )}
              {assignableUnits.map(u => {
                const id = u.callsign || u.username
                const sel = form.assigned_units.includes(id)
                return (
                  <button
                    key={u.id} type="button"
                    className={`btn btn-sm ${sel ? 'btn-cyan' : ''}`}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                    onClick={() => toggleUnit(id)}
                  >
                    <span style={{ color: getTeamColor(u.team) }}>●</span> {id}
                    {!isDispatch && ' (me)'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-lbl">Notes</label>
            <input className="input" placeholder="Suspect description, etc..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-cyan" disabled={saving || !form.title.trim()}>
              {saving ? 'Creating...' : '✓ Create Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CallCard({ call, units, isDispatch, myCallsign, onUpdate, onClose, onAttachSelf }) {
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(null)

  const assigned = call.assigned_units || []
  const priorityBorders = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)', emergency: 'var(--red)' }
  const border = priorityBorders[call.priority] || 'var(--border-dim)'

  const assignableUnits = units.filter(u =>
    ['police','fire','ems'].includes(u.team) && !assigned.includes(u.callsign || u.username)
  )

  const imAssigned = myCallsign && assigned.includes(myCallsign)

  return (
    <div className="card" style={{ borderLeft: `3px solid ${border}`, marginBottom: 12 }}>
      <div
        style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
              #{call.call_number}
            </span>
            <span className={`badge badge-${call.priority}`}>{call.priority}</span>
            <span className={`badge badge-${call.status}`}>{call.status}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              {call.title}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {call.location && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)' }}>📍 {call.location}</span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
              {new Date(call.created_at).toLocaleTimeString()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
              By: {call.created_by}
            </span>
          </div>
        </div>

        {/* Assigned units */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220, justifyContent: 'flex-end' }}>
          {assigned.map(u => (
            <span key={u} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px', background: 'var(--cyan-dim, rgba(0,210,255,.1))', color: 'var(--cyan)', borderRadius: 3, border: '1px solid rgba(0,210,255,.3)' }}>
              {u}
              {isDispatch && (
                <span
                  style={{ marginLeft: 4, cursor: 'pointer', color: 'var(--red)', fontWeight: 700 }}
                  onClick={ev => { ev.stopPropagation(); onUpdate(call.id, { assigned_units: assigned.filter(x => x !== u) }) }}
                >×</span>
              )}
            </span>
          ))}
          {assigned.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No units</span>}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-dim)' }}>
          {call.description && (
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '12px 0 8px' }}>{call.description}</p>
          )}
          {call.notes && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
              Note: {call.notes}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Dispatch: attach any unit */}
            {isDispatch && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="input"
                  style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }}
                  value={adding || ''}
                  onChange={e => setAdding(e.target.value)}
                >
                  <option value="">Attach unit...</option>
                  {assignableUnits.map(u => (
                    <option key={u.id} value={u.callsign || u.username}>
                      {u.callsign || u.username} ({TEAMS[u.team]?.label})
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-cyan"
                  disabled={!adding}
                  onClick={() => { onUpdate(call.id, { assigned_units: [...assigned, adding] }); setAdding(null) }}
                >
                  Attach
                </button>
              </div>
            )}

            {/* Responder self-attach */}
            {!isDispatch && myCallsign && !imAssigned && (
              <button className="btn btn-sm btn-green" onClick={() => onAttachSelf(call.id)}>
                + Attach Myself
              </button>
            )}

            {!isDispatch && imAssigned && (
              <button className="btn btn-sm btn-red" onClick={() => onUpdate(call.id, { assigned_units: assigned.filter(u => u !== myCallsign) })}>
                Detach Myself
              </button>
            )}

            {/* Status changes */}
            {call.status === 'pending' && (
              <button className="btn btn-sm btn-cyan" onClick={() => onUpdate(call.id, { status: 'active' })}>
                Mark Active
              </button>
            )}
            {call.status !== 'closed' && (isDispatch || imAssigned) && (
              <button className="btn btn-sm btn-red" onClick={() => onClose(call.id)}>
                Close Call
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dispatch() {
  const { unit } = useUnit()
  const { calls, loading, createCall, updateCall, closeCall, attachUnit } = useCalls()
  const { units } = useUnits()
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')

  const isDispatch = unit?.team === 'dispatch'
  const isResponder = ['police','fire','ems'].includes(unit?.team)
  const myCallsign = unit?.callsign || unit?.username

  const filtered = calls
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.location?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const canCreateCall = isDispatch || isResponder

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">Dispatch Board</div>
          <div className="page-sub">{calls.filter(c => c.status !== 'closed').length} ACTIVE CALLS</div>
        </div>
        {canCreateCall && (
          <button className="btn btn-cyan" onClick={() => setShowNew(true)}>
            {isDispatch ? '+ New Call' : '⚡ Self-Dispatch'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['active','pending','closed','all'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-cyan' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <input
          className="input"
          style={{ width: 200, padding: '5px 12px', fontSize: 12 }}
          placeholder="Search calls..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Call list */}
        <div>
          {loading && <div className="empty-state">Loading calls...</div>}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">No {filter} calls</div>
          )}
          {filtered.map(call => (
            <CallCard
              key={call.id}
              call={call}
              units={units}
              isDispatch={isDispatch}
              myCallsign={myCallsign}
              onUpdate={(id, patch) => updateCall(id, patch)}
              onClose={closeCall}
              onAttachSelf={(id) => attachUnit(id, myCallsign)}
            />
          ))}
        </div>

        {/* Units sidebar */}
        <div>
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Units On Duty</span>
            </div>
            {units.length === 0 && (
              <div className="empty-state" style={{ padding: '16px' }}>No units</div>
            )}
            {['police','fire','ems','dispatch'].map(team => {
              const teamUnits = units.filter(u => u.team === team)
              if (!teamUnits.length) return null
              return (
                <div key={team}>
                  <div style={{
                    padding: '6px 14px',
                    background: 'var(--bg-3)',
                    borderBottom: '1px solid var(--border-dim)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: 8,
                    letterSpacing: 2,
                    color: getTeamColor(team),
                    textTransform: 'uppercase'
                  }}>
                    {TEAMS[team]?.icon} {TEAMS[team]?.label}
                  </div>
                  {teamUnits.map(u => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderBottom: '1px solid rgba(255,255,255,.02)'
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: getTeamColor(u.team) }}>
                          {u.callsign || u.username}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.username}</div>
                      </div>
                      {isDispatch ? (
                        <select
                          className="input"
                          style={{ width: 'auto', fontSize: 10, padding: '3px 8px' }}
                          value={u.status}
                          onChange={e => {
                            const { setUnitStatus } = useUnits()
                          }}
                        >
                          {/* Handled below via component */}
                          <option value={u.status}>{u.status?.replace('_',' ')}</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${u.status}`}>{u.status?.replace('_',' ')}</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showNew && (
        <NewCallModal
          onClose={() => setShowNew(false)}
          onCreate={createCall}
          units={units}
        />
      )}
    </div>
  )
}
