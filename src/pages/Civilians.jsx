import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Civilians() {
  const [civs, setCivs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('civilians')
      .select('id,first_name,last_name,dob,license_plate,vehicle_make,vehicle_model,vehicle_color,license_status,flags,arrest_log,citation_log,owner_username')
      .order('last_name')
    setCivs(data || [])
    setLoading(false)
  }

  const filtered = civs.filter(c => {
    const q = search.toLowerCase()
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.license_plate || '').toLowerCase().includes(q) ||
      (c.owner_username || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">Civilians</div>
          <div className="page-sub">{civs.length} registered characters</div>
        </div>
        <input
          className="input"
          style={{ width: 240 }}
          placeholder="Search name, plate..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Player</th>
              <th>DOB</th>
              <th>Plate</th>
              <th>Vehicle</th>
              <th>License</th>
              <th>Arrests</th>
              <th>Citations</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>LOADING...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>NO CIVILIANS FOUND</td></tr>
            )}
            {filtered.map(c => {
              const flags = c.flags || []
              const isHot = flags.some(f => ['WANTED', 'ARMED', 'STOLEN'].includes(f))
              const arrests = (c.arrest_log || []).length
              const citations = (c.citation_log || []).length
              return (
                <tr key={c.id} style={isHot ? { background: 'rgba(255,59,92,.04)' } : {}}>
                  <td style={{ color: isHot ? 'var(--red)' : 'var(--text-1)', fontWeight: isHot ? 700 : 400 }}>
                    {isHot && '⚠ '}{c.first_name} {c.last_name}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>{c.owner_username}</td>
                  <td className="mono">{c.dob || '—'}</td>
                  <td className="mono" style={{ color: c.license_plate ? 'var(--cyan)' : 'var(--text-3)', fontWeight: 700 }}>
                    {c.license_plate || '—'}
                  </td>
                  <td className="mono">{[c.vehicle_color, c.vehicle_make, c.vehicle_model].filter(Boolean).join(' ') || '—'}</td>
                  <td>{c.license_plate ? <span className={`badge badge-${c.license_status}`}>{c.license_status}</span> : '—'}</td>
                  <td className="mono" style={{ color: arrests > 0 ? 'var(--red)' : 'var(--text-3)' }}>{arrests || '—'}</td>
                  <td className="mono" style={{ color: citations > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{citations || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {flags.map(f => (
                        <span key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px', borderRadius: 2, background: 'rgba(255,59,92,.15)', color: 'var(--red)', border: '1px solid rgba(255,59,92,.3)' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
