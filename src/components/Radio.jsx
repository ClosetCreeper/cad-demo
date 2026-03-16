import { useState, useRef, useEffect } from 'react'
import { useUnit } from '../hooks/useUnit'
import { useRadio } from '../hooks/useRadio'
import { RADIO_CHANNELS, TEAMS } from '../lib/constants'

export default function Radio({ open, onToggle }) {
  const { unit } = useUnit()
  const [activeChannel, setActiveChannel] = useState('ch1')
  const [msg, setMsg] = useState('')
  const { messages, sendMessage } = useRadio(activeChannel)
  const msgEndRef = useRef(null)

  const availableChannels = RADIO_CHANNELS.filter(ch =>
    ch.teams.includes(unit?.team)
  )

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e) {
    e.preventDefault()
    if (!msg.trim()) return
    sendMessage(unit?.callsign || unit?.username, unit?.team, msg.trim())
    setMsg('')
  }

  function getTeamColor(team) {
    return TEAMS[team]?.color || '#888'
  }

  return (
    <div className="radio-widget">
      <div className="radio-hdr" onClick={onToggle}>
        <div className="radio-title">◉ RADIO</div>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <div className="radio-body">
          {/* Channels */}
          {availableChannels.map(ch => (
            <div
              key={ch.id}
              className={`radio-ch ${activeChannel === ch.id ? 'active' : ''}`}
              onClick={() => setActiveChannel(ch.id)}
            >
              <span className="radio-dot" style={{ background: ch.color, boxShadow: `0 0 6px ${ch.color}` }} />
              <span className="radio-ch-name" style={{ color: activeChannel === ch.id ? ch.color : 'var(--text-2)' }}>
                {ch.name}
              </span>
            </div>
          ))}

          {/* Messages */}
          <div className="radio-messages">
            {messages.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '8px 0' }}>
                NO TRAFFIC
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className="radio-msg">
                <span className="radio-msg-user" style={{ color: getTeamColor(m.team) }}>
                  {m.username}:{' '}
                </span>
                <span className="radio-msg-text">{m.message}</span>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="radio-input-row">
            <input
              className="input radio-input"
              placeholder="Transmit..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
            />
            <button type="submit" className="btn btn-cyan radio-send">TX</button>
          </form>
        </div>
      )}
    </div>
  )
}
