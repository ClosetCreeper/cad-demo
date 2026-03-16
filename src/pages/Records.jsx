import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../lib/AuthContext'

const FLAGS = ['WANTED', 'ARMED', 'DANGEROUS', 'STOLEN', 'NO LICENSE', 'SUSPENDED', 'GANG AFFILIATED', 'CAUTION']
const FLAG_COLORS = {
  WANTED: 'var(--red)', ARMED: 'var(--red)', DANGEROUS: 'var(--red)',
  STOLEN: 'var(--yellow)', 'GANG AFFILIATED': 'var(--yellow)', CAUTION: 'var(--yellow)',
  'NO LICENSE': 'var(--accent)', SUSPENDED: 'var(--accent)'
}

function RecordModal({ record, onClose, onSaved, isNew }) {
  const [form, setForm] = useState(record || { type: 'person', identifier: '', name: '', dob: '', address: '', notes: '', flags: [] })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleFlag = (f) => set('flags', form.flags.includes(f) ? form.flags.filter(x => x !== f) : [...form.flags, f])

  const handleSave = async () => {
    if (!form.identifier.trim()) return
    setLoading(true)
    try {
      if (isNew) {
        const res = await axios.post('/api/records', form, { withCredentials: true })
        onSaved({ ...form, id: res.data.id })
      } else {
        await axios.put(`/api/records/${form.id}`, form, { withCredentials: true })
        onSaved(form)
      }
      onClose()
    } catch (e) {}
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{isNew ? 'New Record' : 'Edit Record'}</div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)} disabled={!isNew}>
            <option value="person">Person</option>
            <option value="vehicle">Vehicle</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{form.type === 'person' ? 'Full Name / Username' : 'License Plate'} *</label>
          <input className="input" value={form.identifier} onChange={e => set('identifier', e.target.value)} placeholder={form.type === 'person' ? 'John_Doe' : 'ABC-1234'} />
        </div>

        {form.type === 'person' ? (
          <>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label className="form-label">Owner / Description</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Owner name, make, model, color" />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Address</label>
          <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
        </div>

        <div className="form-group">
          <label className="form-label">Flags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FLAGS.map(f => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                className="btn btn-sm"
                style={form.flags.includes(f) ? { borderColor: FLAG_COLORS[f], color: FLAG_COLORS[f], background: `${FLAG_COLORS[f]}22` } : {}}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes / Incidents</label>
          <textarea className="input" rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Known associates, prior incidents, warnings..." style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'SAVING...' : '✓ SAVE RECORD'}</button>
        </div>
      </div>
    </div>
  )
}

function RecordCard({ record, onClick }) {
  const flags = typeof record.flags === 'string' ? JSON.parse(record.flags) : (record.flags || [])
  const isHot = flags.some(f => ['WANTED', 'ARMED', 'STOLEN'].includes(f))

  return (
    <div
      className="card"
      onClick={() => onClick(record)}
      style={{ cursor: 'pointer', borderColor: isHot ? 'var(--red)' : 'var(--border)', transition: 'border-color 0.15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: isHot ? 'var(--red)' : 'var(--accent)', marginBottom: 4 }}>
            {record.identifier}
          </div>
          {record.name && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{record.name}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {flags.map(f => (
              <span key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 6px', borderRadius: 2, background: `${FLAG_COLORS[f]}22`, color: FLAG_COLORS[f], border: `1px solid ${FLAG_COLORS[f]}` }}>
                {f}
              </span>
            ))}
          </div>
        </div>
        <span className="badge" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 9 }}>
          {record.type.toUpperCase()}
        </span>
      </div>
      {record.notes && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', borderTop: '1px solid var(--bg-2)', paddingTop: 8 }}>
          {record.notes.slice(0, 80)}{record.notes.length > 80 ? '...' : ''}
        </div>
      )}
    </div>
  )
}

export default function Records() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | { record, isNew }

  const fetchRecords = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (typeFilter) params.set('type', typeFilter)
    const res = await axios.get(`/api/records?${params}`)
    setRecords(res.data)
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [typeFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchRecords()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return
    await axios.delete(`/api/records/${id}`, { withCredentials: true })
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Records Database</h1>
        <button className="btn btn-primary" onClick={() => setModal({ record: null, isNew: true })}>+ NEW RECORD</button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Search by name, plate, username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">All Types</option>
          <option value="person">Person</option>
          <option value="vehicle">Vehicle</option>
        </select>
        <button className="btn btn-primary" type="submit">SEARCH</button>
      </form>

      {/* Results */}
      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 2 }}>SEARCHING...</div>
      ) : records.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 2, padding: '24px 0' }}>
          {search ? 'NO RECORDS FOUND' : 'DATABASE EMPTY — ADD YOUR FIRST RECORD'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {records.map(r => (
            <div key={r.id} style={{ position: 'relative' }}>
              <RecordCard record={r} onClick={(rec) => setModal({ record: rec, isNew: false })} />
              {user?.isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <RecordModal
          record={modal.record}
          isNew={modal.isNew}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            if (modal.isNew) setRecords(prev => [saved, ...prev])
            else setRecords(prev => prev.map(r => r.id === saved.id ? saved : r))
            setModal(null)
          }}
        />
      )}
    </div>
  )
}
