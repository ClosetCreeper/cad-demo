import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRadio(channel) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!channel) return
    fetchMessages()
    const sub = supabase
      .channel(`radio-${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `channel=eq.${channel}` }, payload => {
        setMessages(prev => [...prev.slice(-49), payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [channel])

  async function fetchMessages() {
    const { data } = await supabase
      .from('radio_messages')
      .select('*')
      .eq('channel', channel)
      .order('created_at', { ascending: true })
      .limit(50)
    setMessages(data || [])
  }

  async function sendMessage(username, team, message) {
    await supabase.from('radio_messages').insert({ channel, username, team, message })
  }

  return { messages, sendMessage }
}
