const HIST_KEY = 'pp_hist_v3'

export const getHistory = () => {
  try   { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]') }
  catch { return [] }
}

export const saveHistory = (items) => {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(items.slice(0, 40))) }
  catch {}
}

export const addHistoryItem = (item) => {
  const h = getHistory()
  h.unshift({ ...item, id: Date.now(), date: new Date().toISOString() })
  saveHistory(h)
}

export const clearHistory = () => saveHistory([])

export const deleteHistoryItem = (id) => {
  const h = getHistory().filter(i => i.id !== id)
  saveHistory(h)
  return h
}
