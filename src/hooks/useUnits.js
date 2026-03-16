import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUnits() {
  const [units, setUnits] = useState([])

  useEffect(() => {
    fetchUnits()
    const sub = supabase
      .channel('units-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => fetchUnits())
      .subscribe()

    // Heartbeat — update last_seen every 60s
    const hb = setInterval(() => {
      const session = JSON.parse(localStorage.getItem('nexus_session') || 'null')
      if (session?.id) supabase.from('units').update({ last_seen: new Date().toISOString() }).eq('id', session.id)
    }, 60000)

    return () => { supabase.removeChannel(sub); clearInterval(hb) }
  }, [])

  async function fetchUnits() {
    const { data } = await supabase
      .from('units')
      .select('*')
      .neq('status', 'off_duty')
      .order('team')
    setUnits(data || [])
  }

  async function setUnitStatus(unitId, status) {
    await supabase.from('units').update({ status }).eq('id', unitId)
  }

  return { units, setUnitStatus }
}
