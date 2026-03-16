import { useUnits } from '../hooks/useUnits'
import { useUnit } from '../hooks/useUnit'

export default function Bodycam() {
  const { units } = useUnits()
  const { unit } = useUnit()

  const liveFeeds = units.filter(u => u.team === 'police' && u.bodycam_on && u.bodycam_url)
  const policeOnDuty = units.filter(u => u.team === 'police')

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">Body Cameras</div>
          <div className="page-sub">{liveFeeds.length} LIVE FEEDS</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {liveFeeds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>
              <span style={{ width: 7, height: 7, background: 'var(--red)', borderRadius: '50%', animation: 'blink 1s infinite' }} />
              LIVE
            </div>
          )}
        </div>
      </div>

      {/* Officer list */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-hdr"><span className="card-title">Police Officers On Duty</span></div>
        <table className="tbl">
          <thead><tr><th>Officer</th><th>Callsign</th><th>Status</th><th>Body Camera</th></tr></thead>
          <tbody>
            {policeOnDuty.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>NO OFFICERS ON DUTY</td></tr>
            )}
            {policeOnDuty.map(u => (
              <tr key={u.id}>
                <td style={{ color: 'var(--text-1)' }}>{u.username}</td>
                <td className="mono" style={{ color: 'var(--police)' }}>{u.callsign || '—'}</td>
                <td><span className={`badge badge-${u.status}`}>{u.status?.replace('_', ' ')}</span></td>
                <td>
                  {u.bodycam_on ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>
                      <span style={{ width: 6, height: 6, background: 'var(--red)', borderRadius: '50%', animation: 'blink 1s infinite' }} />
                      LIVE
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>OFF</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live feeds */}
      {liveFeeds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: 11, letterSpacing: 3, color: 'var(--text-3)', textTransform: 'uppercase' }}>
            No live feeds active
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            Officers can start their body camera from the top bar
          </div>
        </div>
      ) : (
        <div className="bodycam-grid">
          {liveFeeds.map(u => (
            <div key={u.id}>
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--police)' }}>
                  {u.callsign || u.username}
                </span>
                <span className={`badge badge-${u.status}`}>{u.status?.replace('_', ' ')}</span>
              </div>
              <div className="bodycam-feed">
                <iframe
                  src={u.bodycam_url}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={`${u.username} bodycam`}
                />
                <div className="bodycam-overlay">
                  <span className="bodycam-rec" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#fff', letterSpacing: 1 }}>
                    {u.callsign || u.username}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
