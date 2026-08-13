import { useEffect, useState } from 'react'
import './App.css'

const CATEGORIES = [
  'World',
  'Sports',
  'Entertainment',
  'Politics',
  'Tech',
  'Economics',
]

function timeAgo(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const intervals = [
    ['y', 31536000],
    ['mo', 2592000],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ]
  for (const [label, secs] of intervals) {
    const count = Math.floor(seconds / secs)
    if (count >= 1) return `${count}${label} ago`
  }
  return 'just now'
}

function getSource(article) {
  if (!article.link) return 'News source'
  try {
    const url = new URL(article.link)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return 'News source'
  }
}

function SpinCheckModal({ cluster, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Spin Check</h3>
        <p className="modal-subtitle">How different outlets covered this</p>
        {cluster.map((a) => (
          <a key={a.id} className="modal-headline" href={a.link} target="_blank" rel="noreferrer">
            <span className="modal-source">{a.source}</span>
            <span>{a.title}</span>
          </a>
        ))}
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function ArticleCard({ article, cluster }) {
  const [showSpinCheck, setShowSpinCheck] = useState(false)

  return (
    <a className="article-card" href={article.link} target="_blank" rel="noreferrer">
      {article.image_url ? (
        <img className="article-card-image" src={article.image_url} alt="" loading="lazy" />
      ) : (
        <div className="article-card-placeholder"></div>
      )}

      <div className="article-card-overlay">
        <div className="card-meta">
          <span className="source">{article.source || getSource(article)}</span>
          <span className="dot">•</span>
          <span className="time">{timeAgo(article.published)}</span>
        </div>

        <h2 className="headline">{article.title}</h2>

        {article.summary && <p className="summary">{article.summary}</p>}

        <div className="article-bottom">
          <span className="source">{article.source || 'BBC.CO.UK'}</span>
          <span className="read-link">READ SOURCE →</span>
        </div>
      </div>

      {cluster && cluster.length > 1 && (
        <button
          className="spin-check-badge"
          onClick={(e) => { e.preventDefault(); setShowSpinCheck(true) }}
        >
          Spin Check · {cluster.length} sources
        </button>
      )}

      {showSpinCheck && (
        <SpinCheckModal cluster={cluster} onClose={() => setShowSpinCheck(false)} />
      )}
    </a>
  )
}

function CategoryGrid({ articles, onSelect }) {
  const tileImage = (category) => {
    const match = articles.find((article) => article.category === category && article.image_url)
    return match ? match.image_url : null
  }

  return (
    <div className="category-grid">
      {CATEGORIES.map((category) => {
        const image = tileImage(category)
        return (
          <button className="tile" key={category} onClick={() => onSelect(category)}>
            {image ? (
              <img className="tile-img" src={image} alt="" loading="lazy" />
            ) : (
              <div className="tile-placeholder">
                <span>{category}</span>
              </div>
            )}
            <span className="tile-label">{category}</span>
          </button>
        )
      })}
    </div>
  )
}

function TrendingTab({ trending }) {
  return (
    <div className="trending-tab">
      <div className="search-input-locked">
        <span>Search articles</span>
        <span className="locked-pill">Sign in to search</span>
      </div>

      <h2 className="section-title">Trending Now</h2>

      {trending.length === 0 && <p className="status">Nothing trending yet.</p>}

      <div className="trending-list">
        {trending.map((cluster, i) => (
          <a
            key={i}
            className="trending-item"
            href={cluster[0].link}
            target="_blank"
            rel="noreferrer"
          >
            <span className="trending-rank">{i + 1}</span>
            <div className="trending-content">
              <span className="trending-sources">{cluster.length} sources covering this</span>
              <h3 className="trending-headline">{cluster[0].title}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function LockedTab({ label }) {
  return (
    <div className="locked-tab">
      <p className="locked-title">{label}</p>
      <p className="locked-text">Sign in to unlock this</p>
    </div>
  )
}

function HomeTab({ articles, loading, clusters }) {
  const [view, setView] = useState('feed')
  const [selectedCategory, setSelectedCategory] = useState(null)

  const filtered = selectedCategory
    ? articles.filter((article) => article.category === selectedCategory)
    : articles

  const clusterFor = (id) => clusters.find((c) => c.some((a) => a.id === id))

  if (view === 'grid') {
    return (
      <div className="category-view">
        <button className="back-link" onClick={() => setView('feed')}>← Home</button>
        <h2 className="section-title">Categories</h2>
        <CategoryGrid
          articles={articles}
          onSelect={(category) => {
            setSelectedCategory(category)
            setView('list')
          }}
        />
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="category-view">
        <button className="back-link" onClick={() => setView('grid')}>← Categories</button>
        <h2 className="section-title">{selectedCategory}</h2>
        <main className="category-feed">
          {filtered.length === 0 && <p className="status">No articles in this category yet.</p>}
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} cluster={clusterFor(article.id)} />
          ))}
        </main>
      </div>
    )
  }

  return (
    <>
      <button className="categories-entry" onClick={() => setView('grid')}>
        <span>Browse Categories</span>
        <span aria-hidden="true">→</span>
      </button>

      <main className="reels-feed">
        {loading && (
          <div className="feed-status"><span>Loading today's news…</span></div>
        )}
        {!loading && articles.length === 0 && (
          <div className="feed-status"><span>No articles yet.</span></div>
        )}
        {!loading &&
          articles.map((article) => (
            <ArticleCard key={article.id} article={article} cluster={clusterFor(article.id)} />
          ))}
      </main>
    </>
  )
}

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [trending, setTrending] = useState([])
  const [clusters, setClusters] = useState([])

  const today = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  useEffect(() => {
    fetch('http://localhost:8000/articles')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setArticles(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch articles:', error)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetch('http://localhost:8000/trending')
      .then((res) => res.json())
      .then((data) => setTrending(data))
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    fetch('http://localhost:8000/timeline')
      .then((res) => res.json())
      .then((data) => setClusters(data))
      .catch((err) => console.error(err))
  }, [])

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="wordmark" aria-label="Loopd">
          <span className="letter">L</span>
          <span className="letter">o</span>
          <span className="letter">o</span>
          <span className="letter">p</span>
          <span className="letter">d</span>
        </div>
        <div className="tagline-row">
          <span className="tagline">{today}</span>
          <span className="accent-dot" aria-hidden="true"></span>
          <span className="tagline">news, every angle</span>
        </div>
      </header>

      {activeTab === 'home' && <HomeTab articles={articles} loading={loading} clusters={clusters} />}
      {activeTab === 'search' && <TrendingTab trending={trending} />}
      {activeTab === 'bookmarks' && <LockedTab label="Bookmarks" />}
      {activeTab === 'profile' && <LockedTab label="Profile" />}

      <nav className="bottom-nav">
        <button className={activeTab === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('home')}>Home</button>
        <button className={activeTab === 'search' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('search')}>Search</button>
        <button className={activeTab === 'bookmarks' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('bookmarks')}>Bookmarks</button>
        <button className={activeTab === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('profile')}>Profile</button>
      </nav>
    </div>
  )
}

export default App
