import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useErlc } from '../hooks/useErlc'
import { TEAMS } from '../lib/constants'

function teamColorForErlc(team = '') {
  const t = team.toLowerCase()
  if (t.includes('police') || t.includes('sheriff')) return TEAMS.police.color
  if (t.includes('fire')) return TEAMS.fire.color
  if (t.includes('ems') || t.includes('medical')) return TEAMS.ems.color
  if (t.includes('civilian')) return TEAMS.civilian.color
  return '#aaa'
}

function makeIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative">
      <div style="
        width:10px;height:10px;
        background:${color};
        border:2px solid rgba(255,255,255,0.8);
        border-radius:50%;
        box-shadow:0 0 8px ${color};
      "></div>
      <div style="
        position:absolute;
        top:-18px;left:50%;transform:translateX(-50%);
        background:rgba(2,5,9,0.85);
        color:${color};
        font-family:'JetBrains Mono',monospace;
        font-size:9px;
        padding:1px 5px;
        border-radius:3px;
        white-space:nowrap;
        border:1px solid ${color}44;
      ">${label}</div>
    </div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

export default function LiveMap() {
  const { data: erlc, loading, error } = useErlc(5000)
  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const markers = useRef({})
  const [selected, setSelected] = useState(null)

  // Init map once
  useEffect(() => {
    if (mapInst.current) return
    mapInst.current = L.map(mapRef.current, {
      center: [0, 0], zoom: 2, zoomControl: false,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInst.current)
    L.control.zoom({ position: 'bottomright' }).addTo(mapInst.current)
  }, [])

  // Update markers when ERLC data changes
  useEffect(() => {
    if (!mapInst.current || !erlc?.Players) return
    const seen = new Set()

    erlc.Players.forEach(p => {
      const loc = p.Location
      if (!loc) return
      const x = loc.LocationX
      const z = loc.LocationZ
      if (x == null || z == null) return

      const name = p.Player?.split(':')[0] || 'Unknown'
      const color = teamColorForErlc(p.Team)
      const label = p.Callsign || name
      const key = p.Player || name

      seen.add(key)

      if (markers.current[key]) {
        markers.current[key].setLatLng([z, x])
      } else {
        const m = L.marker([z, x], { icon: makeIcon(color, label) })
          .addTo(mapInst.current)
          .on('click', () => setSelected(p))
        markers.current[key] = m
      }
    })

    // Remove old markers
    Object.keys(markers.current).forEach(k => {
      if (!seen.has(k)) {
        markers.current[k].remove()
        delete markers.current[k]
      }
    })

    // Auto-fit if first load
    if (erlc.Players.length && Object.keys(markers.current).length > 0) {
      const latlngs = erlc.Players
        .filter(p => p.Location?.LocationX != null)
        .map(p => [p.Location.LocationZ, p.Location.LocationX])
      if (latlngs.length) {
        mapInst.current.fitBounds(latlngs, { padding: [40, 40], maxZoom: 16 })
      }
    }
  }, [erlc])

  const players = erlc?.Players || []
  const byTeam = players.reduce((acc, p) => {
    const t = p.Team || 'Unknown'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)', paddingBottom: 0 }}>
      <div className="page-hdr" style={{ flexShrink: 0 }}>
        <div>
          <div className="page-title">Live Map</div>
          <div className="page-sub">{players.length} players tracked · updates every 5s</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(byTeam).map(([team, count]) => (
            <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: teamColorForErlc(team), boxShadow: `0 0 5px ${teamColorForErlc(team)}`, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
                {team}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, minHeight: 0, padding: '0 24px 20px' }}>
        {/* Map */}
        <div className="map-container" style={{ position: 'relative', minHeight: 0 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {loading && !erlc && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(2,5,9,.7)', fontFamily: 'var(--font-hud)', fontSize: 11, color: 'var(--cyan)', letterSpacing: 3,
              pointerEvents: 'none'
            }}>
              ACQUIRING SIGNAL...
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16,
              background: 'rgba(255,59,92,.1)', border: '1px solid rgba(255,59,92,.4)',
              borderRadius: 4, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)'
            }}>
              ERLC API error — check your key
            </div>
          )}
        </div>

        {/* Player list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="card-hdr">
              <span className="card-title">Players</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{players.length}</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {players.length === 0 && (
                <div className="empty-state">No data</div>
              )}
              {players.map((p, i) => {
                const name = p.Player?.split(':')[0] || 'Unknown'
                const color = teamColorForErlc(p.Team)
                return (
                  <div
                    key={i}
                    onClick={() => setSelected(selected?.Player === p.Player ? null : p)}
                    style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid rgba(255,255,255,.02)',
                      cursor: 'pointer',
                      background: selected?.Player === p.Player ? 'var(--bg-4)' : 'transparent',
                      transition: 'background var(--trans)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      {p.Callsign && (
                        <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.Callsign}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: 12 }}>{p.Team}</div>
                    {p.Location?.PostalCode && (
                      <div style={{ fontSize: 9, color: color, fontFamily: 'var(--font-mono)', marginLeft: 12 }}>
                        📍 {p.Location.PostalCode} {p.Location.StreetName}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected player detail */}
          {selected && (
            <div className="card glow-cyan" style={{ flexShrink: 0 }}>
              <div className="card-hdr">
                <span className="card-title">Player Detail</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="card-body" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {[
                  ['Name', selected.Player?.split(':')[0]],
                  ['Team', selected.Team],
                  ['Callsign', selected.Callsign],
                  ['Postal', selected.Location?.PostalCode],
                  ['Street', selected.Location?.StreetName],
                  ['Wanted ⭐', selected.WantedStars],
                  ['Permission', selected.Permission],
                ].map(([label, val]) => val != null && (
                  <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-3)', width: 70, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: 'var(--text-1)' }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
