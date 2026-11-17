import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, STATUSES } from '../api.js'
import DecisionTree from '../components/DecisionTree.jsx'

// Og'ir kutubxonalar faqat kerak bo'lganda yuklanadi
const MindMapView = lazy(() => import('../components/MindMapView.jsx'))
const Board = lazy(() => import('../components/Board.jsx'))

const TABS = [
  { id: 'tree', label: 'Qaror daraxti' },
  { id: 'mindmap', label: 'Mind map' },
  { id: 'board', label: 'Doska' },
]

export default function IdeaPage() {
  const { id } = useParams()
  const ideaId = Number(id)
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [form, setForm] = useState(null)
  const [tab, setTab] = useState(() => localStorageGet('goya-tab') || 'tree')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getIdea(ideaId)
      .then((i) => {
        setIdea(i)
        setForm({ title: i.title, description: i.description, tags: i.tags })
      })
      .catch((e) => setError(e.message))
  }, [ideaId])

  const chooseTab = (t) => {
    setTab(t)
    localStorageSet('goya-tab', t)
  }

  const save = async (patch) => {
    const updated = await api.updateIdea(ideaId, patch)
    setIdea(updated)
  }

  const saveField = (field) => {
    const value = field === 'tags' ? normalizeTags(form.tags) : form[field]
    if (field === 'title' && !value.trim()) {
      setForm({ ...form, title: idea.title })
      return
    }
    if (value !== idea[field]) save({ [field]: value })
    if (field === 'tags') setForm({ ...form, tags: value })
  }

  const remove = async () => {
    if (!window.confirm(`"${idea.title}" g'oyasi va uning daraxti, mind map'i, doskasi o'chirilsinmi?`)) return
    await api.deleteIdea(ideaId)
    navigate('/')
  }

  if (error) return <main className="page"><div className="alert">{error}</div><Link to="/">← Orqaga</Link></main>
  if (!idea || !form) return <main className="page muted">Yuklanmoqda…</main>

  return (
    <main className="idea-page">
      <div className="idea-header">
        <Link to="/" className="back">← Inbox</Link>
        <input
          className="title-input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={() => saveField('title')}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <select
          className={`status-select s-${idea.status}`}
          value={idea.status}
          onChange={(e) => save({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn danger ghost" onClick={remove}>
          O'chirish
        </button>
      </div>

      <div className="idea-meta">
        <textarea
          rows={2}
          value={form.description}
          placeholder="Tavsif: bu g'oya nima, nima uchun kerak…"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          onBlur={() => saveField('description')}
        />
        <input
          value={form.tags}
          placeholder="teglar: youtube, short"
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          onBlur={() => saveField('tags')}
        />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => chooseTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="tab-body">
        <Suspense fallback={<div className="muted pad">Yuklanmoqda…</div>}>
          {tab === 'tree' && <DecisionTree ideaId={ideaId} onChange={() => api.getIdea(ideaId).then(setIdea)} />}
          {tab === 'mindmap' && <MindMapView ideaId={ideaId} rootTitle={idea.title} />}
          {tab === 'board' && <Board ideaId={ideaId} />}
        </Suspense>
      </section>
    </main>
  )
}

function normalizeTags(raw) {
  return [...new Set(raw.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))].join(',')
}

function localStorageGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function localStorageSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}
