const KEY = 'nexus_session'

export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function saveSession(unit) {
  localStorage.setItem(KEY, JSON.stringify(unit))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
