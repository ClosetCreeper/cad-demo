import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCalls() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCalls()
    const sub = supabase
      .channel('calls-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => fetchCalls())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function fetchCalls() {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
    setCalls(data || [])
    setLoading(false)
  }

  async function createCall(payload) {
    const { data, error } = await supabase.from('calls').insert(payload).select().single()
    if (error) throw error
    return data
  }

  async function updateCall(id, patch) {
    const { data, error } = await supabase
      .from('calls')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function attachUnit(callId, callsign) {
    const call = calls.find(c => c.id === callId)
    if (!call) return
    const units = call.assigned_units || []
    if (units.includes(callsign)) return
    return updateCall(callId, { assigned_units: [...units, callsign] })
  }

  async function detachUnit(callId, callsign) {
    const call = calls.find(c => c.id === callId)
    if (!call) return
    return updateCall(callId, { assigned_units: (call.assigned_units || []).filter(u => u !== callsign) })
  }

  async function closeCall(id) {
    return updateCall(id, { status: 'closed' })
  }

  return { calls, loading, createCall, updateCall, attachUnit, detachUnit, closeCall }
}
