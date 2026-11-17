import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, parseQuickInput, splitTags, STATUSES, statusLabel } from '../api.js'

function formatDate(iso) {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
  return `${d.getDate()}-${months[d.getMonth()]}`
}

export default function Inbox() {
  const navigate = useNavigate()
  const [ideas, setIdeas] = useState([])
  const [stats, setStats] = useState(null)
  const [quick, setQuick] = useState('')
  const [status, setStatus] = useState('')
  const [tag, setTag] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    Promise.all([api.listIdeas({ status, tag, q }), api.stats()])
      .then(([list, s]) => {
        setIdeas(list)
        setStats(s)
        setError('')
      })
      .catch(() => setError("Backend'ga ulanib bo'lmadi. goya.sh ishga tushganini tekshiring."))

  useEffect(() => {
    load()
  }, [status, tag, q])

  // Barcha teglar (filtr uchun) — filtrsiz ro'yxatdan
  const [allTags, setAllTags] = useState([])
  useEffect(() => {
    api.listIdeas().then((all) => setAllTags([...new Set(all.flatMap((i) => splitTags(i.tags)))].sort()))
  }, [ideas.length])

  const submitQuick = async (e) => {
    e.preventDefault()
    const { title, tags } = parseQuickInput(quick)
    if (!title) return
    await api.createIdea({ title, tags })
    setQuick('')
    load()
  }

  const total = useMemo(() => (stats ? Object.values(stats.ideas).reduce((a, b) => a + b, 0) : 0), [stats])

  return (
    <main className="page">
      <form className="quick-add" onSubmit={submitQuick}>
        <input
          autoFocus
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="Yangi g'oya yozing va Enter bosing…  teglar uchun #youtube #short"
        />
        <button type="submit" className="btn primary" disabled={!parseQuickInput(quick).title}>
          Qo'shish
        </button>
      </form>

      {error && <div className="alert">{error}</div>}

      {stats && (
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{total}</span>
            <span className="stat-label">Jami g'oya</span>
          </div>
          {STATUSES.map((s) => (
            <div key={s.value} className={`stat s-${s.value}`}>
              <span className="stat-num">{stats.ideas[s.value]}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
          <div className="stat">
            <span className="stat-num">
              <span className="ok">{stats.tests.ishladi}</span> / <span className="fail">{stats.tests.ishlamadi}</span>
            </span>
            <span className="stat-label">Sinovlar: ishladi / ishlamadi</span>
          </div>
        </div>
      )}

      <div className="filters">
        <div className="chips">
          <button className={`chip ${!status ? 'active' : ''}`} onClick={() => setStatus('')}>
            Hammasi
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              className={`chip s-${s.value} ${status === s.value ? 'active' : ''}`}
              onClick={() => setStatus(status === s.value ? '' : s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish…" />
      </div>

      {allTags.length > 0 && (
        <div className="chips tags-row">
          {allTags.map((t) => (
            <button key={t} className={`tag ${tag === t ? 'active' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {ideas.length === 0 && !error ? (
        <div className="empty">
          {status || tag || q ? "Bu filtr bo'yicha g'oya yo'q." : "Hali g'oya yo'q. Yuqoridagi maydonga birinchisini yozing."}
        </div>
      ) : (
        <div className="grid">
          {ideas.map((idea) => (
            <button key={idea.id} className="card" onClick={() => navigate(`/idea/${idea.id}`)}>
              <div className="card-top">
                <span className={`badge s-${idea.status}`}>{statusLabel(idea.status)}</span>
                <span className="muted small">{formatDate(idea.updated_at)}</span>
              </div>
              <div className="card-title">{idea.title}</div>
              {idea.description && <div className="card-desc">{idea.description}</div>}
              <div className="card-tags">
                {splitTags(idea.tags).map((t) => (
                  <span key={t} className="tag small">
                    #{t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
