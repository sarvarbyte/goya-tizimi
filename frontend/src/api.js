// Backend bilan ishlash uchun barcha so'rovlar shu yerda
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    let msg = `Xatolik: ${res.status}`
    try {
      msg = (await res.json()).detail || msg
    } catch {}
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  // G'oyalar
  listIdeas: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return request(`/ideas${qs ? `?${qs}` : ''}`)
  },
  getIdea: (id) => request(`/ideas/${id}`),
  createIdea: (data) => request('/ideas', { method: 'POST', body: data }),
  updateIdea: (id, data) => request(`/ideas/${id}`, { method: 'PATCH', body: data }),
  deleteIdea: (id) => request(`/ideas/${id}`, { method: 'DELETE' }),
  stats: () => request('/stats'),

  // Qaror daraxti
  getTree: (ideaId) => request(`/ideas/${ideaId}/tree`),
  addNode: (ideaId, data) => request(`/ideas/${ideaId}/tree`, { method: 'POST', body: data }),
  updateNode: (id, data) => request(`/nodes/${id}`, { method: 'PATCH', body: data }),
  deleteNode: (id) => request(`/nodes/${id}`, { method: 'DELETE' }),

  // Mind map / doska
  getCanvas: (ideaId, kind) => request(`/ideas/${ideaId}/canvas/${kind}`),
  saveCanvas: (ideaId, kind, data) =>
    request(`/ideas/${ideaId}/canvas/${kind}`, { method: 'PUT', body: { data } }),
}

export const STATUSES = [
  { value: 'yangi', label: 'Yangi' },
  { value: 'sinovda', label: 'Sinovda' },
  { value: 'ishladi', label: 'Ishladi' },
  { value: 'toxtatildi', label: "To'xtatildi" },
]

export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label ?? v

// "Yangi short turi #youtube #short" -> { title, tags: "youtube,short" }
export function parseQuickInput(text) {
  const tags = [...text.matchAll(/#([\p{L}\p{N}_'-]+)/gu)].map((m) => m[1].toLowerCase())
  const title = text.replace(/#([\p{L}\p{N}_'-]+)/gu, '').replace(/\s+/g, ' ').trim()
  return { title, tags: [...new Set(tags)].join(',') }
}

export const splitTags = (tags) =>
  (tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

// Ko'p chaqiriladigan saqlashni kechiktirish uchun
export function debounce(fn, ms) {
  let t
  const wrapped = (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
  wrapped.flush = (...args) => {
    clearTimeout(t)
    fn(...args)
  }
  wrapped.cancel = () => clearTimeout(t)
  return wrapped
}
