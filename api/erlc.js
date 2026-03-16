// api/erlc.js  — Vercel serverless function
// Proxies requests to the ERLC API so the browser never hits CORS issues.
// Usage from client: fetch('/api/erlc?path=/v2/server&Players=true')

export default async function handler(req, res) {
  const { path = '/v2/server', ...rest } = req.query
  const params = new URLSearchParams(rest).toString()
  const url = `https://api.policeroleplay.community${path}${params ? '?' + params : ''}`

  try {
    const erlcRes = await fetch(url, {
      headers: {
        'server-key': process.env.VITE_ERLC_API_KEY || '',
        'Accept': 'application/json',
      },
    })
    const data = await erlcRes.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=4, stale-while-revalidate=10')
    res.status(erlcRes.status).json(data)
  } catch (e) {
    res.status(500).json({ error: 'ERLC proxy error', detail: e.message })
  }
}
