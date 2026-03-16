export const TEAMS = {
  police:   { label: 'Police',    color: '#3b82f6', icon: '🚔', erlcTeams: ['Police', 'Sheriff'] },
  fire:     { label: 'Fire Dept', color: '#f97316', icon: '🚒', erlcTeams: ['Fire'] },
  ems:      { label: 'EMS',       color: '#22c55e', icon: '🚑', erlcTeams: ['EMS'] },
  dispatch: { label: 'Dispatch',  color: '#a855f7', icon: '📡', erlcTeams: [] },
  civilian: { label: 'Civilian',  color: '#eab308', icon: '👤', erlcTeams: ['Civilian'] },
}

export const STATUSES = [
  { value: 'available',  label: '10-8  Available',   color: '#22c55e' },
  { value: 'unavailable',label: '10-7  Unavailable',  color: '#ef4444' },
  { value: 'busy',       label: '10-6  Busy',         color: '#eab308' },
  { value: 'enroute',    label: '10-76 En Route',     color: '#00d2ff' },
  { value: 'on_scene',   label: '10-23 On Scene',     color: '#a855f7' },
]

export const PRIORITIES = ['low', 'medium', 'high', 'emergency']

export const RADIO_CHANNELS = [
  { id: 'ch1', name: 'MAIN  CH1', color: '#00d2ff', teams: ['police','fire','ems','dispatch'] },
  { id: 'ch2', name: 'FIRE  CH2', color: '#f97316', teams: ['fire','dispatch'] },
  { id: 'ch3', name: 'EMS   CH3', color: '#22c55e', teams: ['ems','dispatch'] },
  { id: 'ch4', name: 'TACT  CH4', color: '#a855f7', teams: ['police','dispatch'] },
]

export const CIV_TEAMS = ['civilian']
export const RESPONDER_TEAMS = ['police', 'fire', 'ems']
export const DISPATCH_TEAMS = ['dispatch']
