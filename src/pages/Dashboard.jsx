import { useErlc } from '../hooks/useErlc'
import { useUnits } from '../hooks/useUnits'
import { useCalls } from '../hooks/useCalls'
import { useUnit } from '../hooks/useUnit'
import { TEAMS, STATUSES } from '../lib/constants'

function getTeamColor(team) { return TEAMS[team]?.color || '#888' }

function StatCard({ value, label, color }) {
  const cls = { 'var(--cyan)': 'c-cyan', 'var(--green)': 'c-green', 'var(--red)': 'c-red', 'var(--amber)': 'c-amber', 'var(--purple)': 'c-purple', 'var(--orange)': 'c-orange' }
  const c = Object.entries(cls).find(([k]) => k === color)?.[1] || 'c-cyan'
  return (
    <div className={`stat-card ${c}`}>
      <div className="stat-val" style={{ color }}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { data: erlc, loading: erlcLoading } = useErlc()
  const { units } = useUnits()
  const { calls } = useCalls()
  const { unit } = useUnit()

  const openCalls = calls.filter(c => c.status !== 'closed')
  const emergencies = openCalls.filter(c => c.priority === 'emergency')
  const byTeam = Object.keys(TEAMS).reduce((acc, t) => {
    acc[t] = units.filter(u => u.team === t)
    return acc
  }, {})

  // Group ERLC players by team
  const erlcByTeam = {}
  ;(erlc?.Players || []).forEach(p => {
    const t = p.Team || 'Unknown'
    erlcByTeam[t] = (erlcByTeam[t] || [])
    erlcByTeam[t].push(p)
  })

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">LIVE OVERVIEW · {new Date().toLocaleString()}</div>
        </div>
        {erlc && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: 11, color: 'var(--cyan)', letterSpacing: 2 }}>
              {erlc.Name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
              Join: {erlc.JoinKey}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4 mb-4">
        <StatCard value={erlc?.CurrentPlayers ?? '—'} label="In Server" color="var(--cyan)" />
        <StatCard value={units.length} label="Units On Duty" color="var(--green)" />
        <StatCard value={openCalls.length} label="Active Calls" color="var(--amber)" />
        <StatCard value={emergencies.length} label="Emergencies" color="var(--red)" />
      </div>

      <div className="grid-2 gap-4">
        {/* Units by team */}
        <div className="card glow-cyan">
          <div className="card-hdr">
            <span className="card-title">Units On Duty</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{units.length} total</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Team</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>NO UNITS ON DUTY</td></tr>
              )}
              {units.map(u => (
                <tr key={u.id}>
                  <td className="mono" style={{ color: getTeamColor(u.team) }}>
                    {u.callsign || u.username}
                    {u.bodycam_on && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--red)' }}>🔴 LIVE</span>}
                  </td>
                  <td>
                    <span className="badge" style={{ color: getTeamColor(u.team), background: getTeamColor(u.team) + '18', borderColor: getTeamColor(u.team) + '55' }}>
                      {TEAMS[u.team]?.icon} {TEAMS[u.team]?.label}
                    </span>
                  </td>
                  <td><span className={`badge badge-${u.status}`}>{u.status?.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Active calls */}
        <div className="card glow-amber">
          <div className="card-hdr">
            <span className="card-title">Active Calls</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{openCalls.length} open</span>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>#</th><th>Call</th><th>Priority</th><th>Units</th></tr>
            </thead>
            <tbody>
              {openCalls.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>NO ACTIVE CALLS</td></tr>
              )}
              {openCalls.slice(0, 8).map(c => (
                <tr key={c.id}>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>#{c.call_number}</td>
                  <td style={{ color: 'var(--text-1)' }}>
                    <div>{c.title}</div>
                    {c.location && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>📍 {c.location}</div>}
                  </td>
                  <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                  <td className="mono" style={{ fontSize: 11 }}>{(c.assigned_units || []).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ERLC in-game players */}
        <div className="card glow-purple" style={{ gridColumn: '1/-1' }}>
          <div className="card-hdr">
            <span className="card-title">In-Game Players</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
              {erlcLoading ? 'loading...' : `${erlc?.CurrentPlayers ?? 0} online`}
            </span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {!erlc?.Players?.length ? (
              <div className="empty-state">No ERLC data — check your API key</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {erlc.Players.map((p, i) => {
                  const name = p.Player?.split(':')[0] || 'Unknown'
                  const teamKey = Object.keys(TEAMS).find(k =>
                    TEAMS[k].erlcTeams?.some(et => p.Team?.toLowerCase().includes(et.toLowerCase()))
                  )
                  const color = teamKey ? getTeamColor(teamKey) : '#888'
                  return (
                    <div key={i} style={{
                      background: 'var(--bg-3)', border: `1px solid ${color}33`,
                      borderRadius: 4, padding: '3px 10px',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: color, display: 'flex', alignItems: 'center', gap: 5
                    }}>
                      <span style={{ fontSize: 9 }}>●</span> {name}
                      {p.Callsign && <span style={{ color: 'var(--text-3)', fontSize: 9 }}>[{p.Callsign}]</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
