import { useState } from 'react'
import { useUnit } from '../hooks/useUnit'
import { TEAMS } from '../lib/constants'

export default function Login() {
  const { login } = useUnit()
  const [username, setUsername] = useState('')
  const [team, setTeam] = useState('')
  const [callsign, setCallsign] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const needsCallsign = team && team !== 'civilian'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !team) return
    setLoading(true)
    setError('')
    try {
      await login(username.trim(), team, callsign.trim())
    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">NEXUS</div>
        <div className="login-sub">Computer Aided Dispatch System</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label className="form-lbl">Username</label>
            <input
              className="input"
              placeholder="Enter your Roblox username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-lbl">Select Team</label>
            <div className="team-grid">
              {Object.entries(TEAMS).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  className={`team-btn ${team === key ? `sel-${key}` : ''}`}
                  onClick={() => setTeam(key)}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                  <div>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {needsCallsign && (
            <div className="form-group mb-4">
              <label className="form-lbl">Callsign</label>
              <input
                className="input"
                placeholder={team === 'dispatch' ? 'e.g. DISP-1' : 'e.g. 1-Adam-12'}
                value={callsign}
                onChange={e => setCallsign(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(255,59,92,.1)', border: '1px solid rgba(255,59,92,.4)', borderRadius: 4, padding: '8px 12px', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-cyan w-full"
            style={{ justifyContent: 'center', padding: '12px', fontSize: 14, letterSpacing: 1 }}
            disabled={loading || !username.trim() || !team}
          >
            {loading ? 'LOGGING IN...' : '▶  SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  )
}
