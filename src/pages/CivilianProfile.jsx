import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUnit } from '../hooks/useUnit'

const FLAGS = ['WANTED','ARMED','DANGEROUS','STOLEN','NO LICENSE','SUSPENDED','GANG AFFIL.','CAUTION']

export default function CivilianProfile() {
  const { unit } = useUnit()
  const [profiles, setProfiles] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadProfiles() }, [unit])

  async function loadProfiles() {
    if (!unit) return
    const { data } = await supabase
      .from('civilians')
      .select('*')
      .eq('owner_username', unit.username)
      .order('created_at')
    setProfiles(data || [])
  }

  const blank = {
    owner_username: unit?.username,
    first_name: '', last_name: '', dob: '', image_url: '',
    license_plate: '', vehicle_make: '', vehicle_model: '',
    vehicle_color: '', license_status: 'valid', flags: []
  }

  function startNew() { setEditing({ ...blank, _new: true }) }
  function startEdit(p) { setEditing({ ...p }) }

  async function save() {
    if (!editing.first_name.trim() || !editing.last_name.trim()) return
    setLoading(true)
    const payload = { ...editing }
    delete payload._new
    delete payload.id
    delete payload.created_at
    delete payload.arrest_log
    delete payload.citation_log

    if (editing._new || !editing.id) {
      await supabase.from('civilians').insert({ ...payload, owner_username: unit.username })
    } else {
      await supabase.from('civilians').update(payload).eq('id', editing.id)
    }
    setEditing(null)
    setLoading(false)
    loadProfiles()
  }

  async function deleteProfile(id) {
    if (!confirm('Delete this character?')) return
    await supabase.from('civilians').delete().eq('id', id)
    loadProfiles()
  }

  const set = (k, v) => setEditing(f => ({ ...f, [k]: v }))
  const toggleFlag = (f) => set('flags', (editing.flags || []).includes(f)
    ? (editing.flags || []).filter(x => x !== f)
    : [...(editing.flags || []), f]
  )

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">My Characters</div>
          <div className="page-sub">Civilian Profile Manager</div>
        </div>
        <button className="btn btn-cyan" onClick={startNew}>+ New Character</button>
      </div>

      {profiles.length === 0 && !editing && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: 11, letterSpacing: 3, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>
            No characters yet
          </div>
          <button className="btn btn-cyan" onClick={startNew}>Create Your First Character</button>
        </div>
      )}

      {/* Profile cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {profiles.map(p => {
          const arrests = (p.arrest_log || []).length
          const citations = (p.citation_log || []).length
          return (
            <div key={p.id} className="card glow-cyan">
              <div className="card-hdr">
                <span className="card-title">{p.first_name} {p.last_name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-xs" onClick={() => startEdit(p)}>Edit</button>
                  <button className="btn btn-xs btn-red" onClick={() => deleteProfile(p.id)}>Delete</button>
                </div>
              </div>
              <div className="card-body">
                {p.image_url && (
                  <img src={p.image_url} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 4, marginBottom: 12 }} onError={e => e.target.style.display='none'} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {p.dob && <div><span style={{ color: 'var(--text-3)' }}>DOB: </span>{p.dob}</div>}
                  {p.license_plate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-3)' }}>Plate: </span>
                      <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{p.license_plate}</span>
                      <span className={`badge badge-${p.license_status}`}>{p.license_status}</span>
                    </div>
                  )}
                  {p.vehicle_make && <div><span style={{ color: 'var(--text-3)' }}>Vehicle: </span>{[p.vehicle_color, p.vehicle_make, p.vehicle_model].filter(Boolean).join(' ')}</div>}
                  {(arrests > 0 || citations > 0) && (
                    <div style={{ marginTop: 4 }}>
                      {arrests > 0 && <span style={{ color: 'var(--red)', marginRight: 10 }}>🚔 {arrests} arrest{arrests !== 1 ? 's' : ''}</span>}
                      {citations > 0 && <span style={{ color: 'var(--amber)' }}>📋 {citations} citation{citations !== 1 ? 's' : ''}</span>}
                    </div>
                  )}
                </div>
                {(p.flags || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                    {p.flags.map(f => (
                      <span key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'rgba(255,59,92,.15)', color: 'var(--red)', border: '1px solid rgba(255,59,92,.4)' }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal" style={{ width: 600 }}>
            <div className="modal-title">{editing._new ? 'New Character' : 'Edit Character'}</div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-lbl">First Name *</label>
                <input className="input" value={editing.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-lbl">Last Name *</label>
                <input className="input" value={editing.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-lbl">Date of Birth</label>
                <input className="input" placeholder="MM/DD/YYYY" value={editing.dob} onChange={e => set('dob', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-lbl">Profile Image URL (optional)</label>
                <input className="input" placeholder="https://..." value={editing.image_url} onChange={e => set('image_url', e.target.value)} />
              </div>
            </div>

            <div className="divider" />
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: 9, letterSpacing: 2, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase' }}>Vehicle Information</div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-lbl">License Plate</label>
                <input className="input" placeholder="ABC-1234" value={editing.license_plate} onChange={e => set('license_plate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-lbl">License Status</label>
                <select className="input" value={editing.license_status} onChange={e => set('license_status', e.target.value)}>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-lbl">Make</label>
                <input className="input" placeholder="Toyota" value={editing.vehicle_make} onChange={e => set('vehicle_make', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-lbl">Model</label>
                <input className="input" placeholder="Camry" value={editing.vehicle_model} onChange={e => set('vehicle_model', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-lbl">Color</label>
                <input className="input" placeholder="Black" value={editing.vehicle_color} onChange={e => set('vehicle_color', e.target.value)} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-cyan" onClick={save} disabled={loading || !editing.first_name || !editing.last_name}>
                {loading ? 'Saving...' : '✓ Save Character'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
