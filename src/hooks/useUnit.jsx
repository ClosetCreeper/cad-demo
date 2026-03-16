import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getSession, saveSession, clearSession } from '../lib/session'

const UnitCtx = createContext(null)

export function UnitProvider({ children }) {
  const [unit, setUnit] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (session) restoreUnit(session)
    else setLoading(false)
  }, [])

  async function restoreUnit(session) {
    const { data } = await supabase
      .from('units')
      .select('*')
      .eq('id', session.id)
      .single()
    if (data) {
      setUnit(data)
      saveSession(data)
    } else {
      clearSession()
    }
    setLoading(false)
  }

  async function login(username, team, callsign = '') {
    // Upsert unit row
    const { data, error } = await supabase
      .from('units')
      .upsert(
        { username, team, callsign, status: 'available', last_seen: new Date().toISOString() },
        { onConflict: 'username' }
      )
      .select()
      .single()
    if (error) throw error
    setUnit(data)
    saveSession(data)
    return data
  }

  async function logout() {
    if (unit) {
      await supabase.from('units').update({ status: 'off_duty' }).eq('id', unit.id)
    }
    clearSession()
    setUnit(null)
  }

  async function updateStatus(status) {
    if (!unit) return
    const { data } = await supabase
      .from('units')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('id', unit.id)
      .select()
      .single()
    if (data) { setUnit(data); saveSession(data) }
  }

  async function updateBodycam(on, url = '') {
    if (!unit) return
    const { data } = await supabase
      .from('units')
      .update({ bodycam_on: on, bodycam_url: url })
      .eq('id', unit.id)
      .select()
      .single()
    if (data) { setUnit(data); saveSession(data) }
  }

  async function refreshUnit() {
    if (!unit) return
    const { data } = await supabase.from('units').select('*').eq('id', unit.id).single()
    if (data) { setUnit(data); saveSession(data) }
  }

  return (
    <UnitCtx.Provider value={{ unit, loading, login, logout, updateStatus, updateBodycam, refreshUnit }}>
      {children}
    </UnitCtx.Provider>
  )
}

export const useUnit = () => useContext(UnitCtx)
