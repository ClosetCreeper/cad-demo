import { useState, useEffect, useRef } from 'react'
import { getServer } from '../lib/erlc'

export function useErlc(interval = 6000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef(null)

  async function poll() {
    try {
      const result = await getServer({ Players: 'true', Vehicles: 'true' })
      setData(result)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    poll()
    timer.current = setInterval(poll, interval)
    return () => clearInterval(timer.current)
  }, [interval])

  return { data, error, loading, refresh: poll }
}
