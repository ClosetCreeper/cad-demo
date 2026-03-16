import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../lib/SocketContext'
import axios from 'axios'
import L from 'leaflet'

// ERLC Blaine County approximate bounds — adjust if your map differs
const MAP_CENTER = [51.505, -0.09]
const MAP_ZOOM = 13

function createIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      border:2px solid rgba(255,255,255,0.8);
      border-radius:50%;
      width:10px;height:10px;
      box-shadow:0 0 6px ${color};
      position:relative;
    "><div style="
      position:absolute;
      top:-18px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.7);
      color:#fff;font-size:9px;
      padding:1px 4px;white-space:nowrap;
      font-family:monospace;border-radius:2px;
    ">${label}</div></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  })
}

const teamColors = {
  Police: '#00d4ff',
  Fire: '#ff6600',
  'Sheriff': '#ffd700',
  EMS: '#00ff88',
  Civilian: '#aaaaaa',
  Criminal: '#ff3355',
}

function getTeamColor(team = '') {
  for (const [key, color] of Object.entries(teamColors)) {
    if (team.toLowerCase().includes(key.toLowerCase())) return color
  }
  return '#ffffff'
}

export default function LiveMap() {
  const socket = useSocket()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance.current)

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)
  }, [])

  const updateMarkers = (players) => {
    if (!mapInstance.current) return

    const seen = new Set()
    players.forEach(p => {
      const id = p.Player || p.Username || p.Name || Math.random().toString()
      const x = p.x ?? p.X ?? null
      const z = p.z ?? p.Z ?? null
      if (x === null || z === null) return

      seen.add(id)
      const color = getTeamColor(p.Team || p.Permission || '')
      const icon = createIcon(color, p.Player || p.Username || '?')

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([z, x])
      } else {
        const marker = L.marker([z, x], { icon })
          .addTo(mapInstance.current)
          .on('click', () => setSelected(p))
        markersRef.current[id] = marker
      }
    })

    // Remove departed players
    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })
  }

  useEffect(() => {
    axios.get('/api/erlc/live').then(r => {
      if (r.data?.players) { setPlayers(r.data.players); updateMarkers(r.data.players) }
    })
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('erlc:update', data => {
      if (data?.players) { setPlayers(data.players); updateMarkers(data.players) }
    })
    return () => socket.off('erlc:update')
  }, [socket])

  const teamCounts = players.reduce((acc, p) => {
    const team = p.Team || p.Permission || 'Unknown'
    acc[team] = (acc[team] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Live Map</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {Object.entries(teamCounts).map(([team, count]) => (
            <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: getTeamColor(team), display: 'inline-block', boxShadow: `0 0 4px ${getTeamColor(team)}` }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{team}: {count}</span>
            </div>
          ))}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>{players.length} total</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Map */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {players.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,10,15,0.8)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: 2, pointerEvents: 'none' }}>
              AWAITING PLAYER DATA
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="card" style={{ overflowY: 'auto' }}>
          <div className="card-header"><span className="card-title">Players</span></div>
          {players.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>No data</div>
          ) : (
            players.map((p, i) => {
              const name = p.Player || p.Username || 'Unknown'
              const team = p.Team || p.Permission || '?'
              const color = getTeamColor(team)
              return (
                <div
                  key={i}
                  onClick={() => setSelected(selected?.Player === p.Player ? null : p)}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--bg-2)',
                    cursor: 'pointer',
                    background: selected?.Player === p.Player ? 'var(--bg-3)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', flex: 1 }}>{name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 12, fontFamily: 'var(--font-mono)' }}>{team}</div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Selected player panel */}
      {selected && (
        <div className="card" style={{ flexShrink: 0, borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
                {selected.Player || selected.Username}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {Object.entries(selected).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: 2, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-sm" onClick={() => setSelected(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
