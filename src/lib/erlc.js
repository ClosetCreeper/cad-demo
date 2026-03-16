// All ERLC calls go through the Vercel proxy at /api/erlc
// to avoid CORS and keep the server key secret.

const BASE = '/api/erlc'

async function erlcFetch(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(`ERLC ${res.status}`)
  return res.json()
}

export async function getServer(opts = {}) {
  return erlcFetch({ path: '/v2/server', ...opts })
}

export async function getPlayers() {
  return erlcFetch({ path: '/v2/server', Players: 'true' })
}

export async function getVehicles() {
  return erlcFetch({ path: '/v2/server', Vehicles: 'true' })
}

export async function getFullServer() {
  return erlcFetch({ path: '/v2/server', Players: 'true', Vehicles: 'true', KillLogs: 'true', CommandLogs: 'true' })
}
