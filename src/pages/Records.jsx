import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUnit } from '../hooks/useUnit'

const FLAGS = ['WANTED','ARMED','DANGEROUS','STOLEN','NO LICENSE','SUSPENDED','GANG AFFIL.','CAUTION']
const FLAG_COLORS = {
  WANTED:'var(--red)', ARMED:'var(--red)', DANGEROUS:'var(--red)',
  STOLEN:'var(--amber)', 'GANG AFFIL.':'var(--amber)', CAUTION:'var(--amber)',
  'NO LICENSE':'var(--cyan)', SUSPENDED:'var(--cyan)'
}

function LogModal({ civ, type, onClose, onSaved }) {
  const { unit } = useUnit()
  const [form, setForm] = useState({ description: '', charges: '', officer: unit?.callsign || unit?.username, date: new Date().toLocaleDateString() })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    const entry = { ...form, id: Date.now(), type, timestamp: new Date().toISOString() }
    const field = type === 'arrest' ? 'arrest_log' : 'citation_log'
    const current = civ[field] || []
    await supabase.from('civilians').update({ [field]: [...current, entry] }).eq('id', civ.id)
    onSaved()
    onClose()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-title">Log {type === 'arrest' ? 'Arrest' : 'Citation'}</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-lbl">Officer</label>
            <input className="input" value={form.officer} onChange={e => set('officer', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-lbl">Charges</label>
            <input className="input" placeholder="Speeding, Assault, Robbery..." value={form.charges} onChange={e => set('charges', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-lbl">Description</label>
            <textarea className="input" placeholder="Details of the incident..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-cyan">✓ Log {type}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CivDetail({ civ, onClose, onRefresh }) {
  const { unit } = useUnit()
  const [logModal, setLogModal] = useState(null)
  const isPolice = unit?.team === 'police'

  const flags = civ.flags || []
  const arrests = civ.arrest_log || []
  const citations = civ.citation_log || []

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 4 }}>
              {civ.first_name} {civ.last_name}
            </div>
            {civ.dob && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>DOB: {civ.dob}</div>}
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }} onClick={onClose}>✕</button>
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {flags.map(f => (
              <span key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 9px', borderRadius: 3, background: `${FLAG_COLORS[f] || '#888'}22`, color: FLAG_COLORS[f] || '#888', border: `1px solid ${FLAG_COLORS[f] || '#888'}66`, fontWeight: 600, letterSpacing: 1 }}>
                ⚠ {f}
              </span>
            ))}
          </div>
        )}

        {/* Vehicle */}
        {civ.license_plate && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-hdr"><span className="card-title">Vehicle</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div className="form-lbl">Plate</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--cyan)', fontWeight: 700 }}>{civ.license_plate}</div>
                </div>
                {civ.vehicle_make && <div><div className="form-lbl">Make/Model</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{civ.vehicle_make} {civ.vehicle_model}</div></div>}
                {civ.vehicle_color && <div><div className="form-lbl">Color</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{civ.vehicle_color}</div></div>}
                <div><div className="form-lbl">License Status</div><span className={`badge badge-${civ.license_status}`}>{civ.license_status}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        {isPolice && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-sm btn-red" onClick={() => setLogModal('arrest')}>🚔 Log Arrest</button>
            <button className="btn btn-sm btn-amber" onClick={() => setLogModal('citation')}>📋 Log Citation</button>
          </div>
        )}

        {arrests.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-hdr"><span className="card-title">Arrest History ({arrests.length})</span></div>
            {arrests.map(a => (
              <div key={a.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>ARRESTED</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{a.date} · {a.officer}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--amber)' }}>Charges: {a.charges}</div>
                {a.description && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>{a.description}</div>}
              </div>
            ))}
          </div>
        )}

        {citations.length > 0 && (
          <div className="card">
            <div className="card-hdr"><span className="card-title">Citation History ({citations.length})</span></div>
            {citations.map(c => (
              <div key={c.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)' }}>CITATION</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{c.date} · {c.officer}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--amber)' }}>Charges: {c.charges}</div>
                {c.description && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>{c.description}</div>}
              </div>
            ))}
          </div>
        )}

        {logModal && (
          <LogModal civ={civ} type={logModal} onClose={() => setLogModal(null)} onSaved={onRefresh} />
        )}
      </div>
    </div>
  )
}

export default function Records() {
  const { unit } = useUnit()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('plate')

  const canSearch = ['police', 'dispatch'].includes(unit?.team)

  async function doSearch() {
    if (!search.trim()) return
    setLoading(true)
    const q = supabase.from('civilians').select('*')
    if (tab === 'plate') {
      q.ilike('license_plate', `%${search.trim()}%`)
    } else {
      q.or(`first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%`)
    }
    const { data } = await q.order('last_name')
    setResults(data || [])
    setLoading(false)
  }

  async function refreshSelected() {
    if (!selected) return
    const { data } = await supabase.from('civilians').select('*').eq('id', selected.id).single()
    if (data) setSelected(data)
    doSearch()
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">Records</div>
          <div className="page-sub">Civilian & Vehicle Database</div>
        </div>
      </div>

      {!canSearch ? (
        <div className="empty-state">Records lookup is only available to Police and Dispatch</div>
      ) : (
        <>
          {/* Search */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[['plate', '🚗 Plate'], ['name', '👤 Name']].map(([t, l]) => (
                <button
                  key={t}
                  className={`btn btn-sm ${tab === t ? 'btn-cyan' : ''}`}
                  style={{ borderRadius: t === 'plate' ? '5px 0 0 5px' : '0 5px 5px 0' }}
                  onClick={() => setTab(t)}
                >{l}</button>
              ))}
            </div>
            <input
              className="input"
              style={{ flex: 1, maxWidth: 360 }}
              placeholder={tab === 'plate' ? 'Enter license plate...' : 'Enter name...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            <button className="btn btn-cyan" onClick={doSearch} disabled={loading}>
              {loading ? 'Searching...' : '🔍 Run Lookup'}
            </button>
          </div>

          {/* Results */}
          {results.length === 0 && search && !loading && (
            <div className="empty-state">No records found</div>
          )}

          {results.length > 0 && (
            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>DOB</th>
                    <th>Plate</th>
                    <th>Vehicle</th>
                    <th>License</th>
                    <th>Flags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(c => {
                    const flags = c.flags || []
                    const isHot = flags.some(f => ['WANTED','ARMED','STOLEN'].includes(f))
                    return (
                      <tr key={c.id} style={isHot ? { background: 'rgba(255,59,92,.04)' } : {}}>
                        <td style={{ color: isHot ? 'var(--red)' : 'var(--text-1)', fontWeight: isHot ? 600 : 400 }}>
                          {c.first_name} {c.last_name}
                        </td>
                        <td className="mono">{c.dob || '—'}</td>
                        <td className="mono" style={{ color: 'var(--cyan)' }}>{c.license_plate || '—'}</td>
                        <td className="mono">{[c.vehicle_color, c.vehicle_make, c.vehicle_model].filter(Boolean).join(' ') || '—'}</td>
                        <td>{c.license_plate ? <span className={`badge badge-${c.license_status}`}>{c.license_status}</span> : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {flags.map(f => (
                              <span key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 5px', borderRadius: 2, background: `${FLAG_COLORS[f] || '#888'}22`, color: FLAG_COLORS[f] || '#888', border: `1px solid ${FLAG_COLORS[f] || '#888'}44` }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-xs btn-cyan" onClick={() => setSelected(c)}>View</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <CivDetail civ={selected} onClose={() => setSelected(null)} onRefresh={refreshSelected} />
      )}
    </div>
  )
}
