import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'
import './App.css'
import AuthPage from './pages/AuthPage'
import { useEffect as useEffectBookmark } from 'react'

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

  function ArticleCard({ article, cluster, onClick , token, username }) {
    const [showSpinCheck, setShowSpinCheck] = useState(false)
    const [isBookmarked, setIsBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

    // Check bookmark status on mount
    useEffectBookmark(() => {
      if (token && username) {
        fetch(`http://localhost:8000/articles/${article.id}/is-bookmarked?token=${token}`)
          .then(res => res.json())
          .then(data => setIsBookmarked(data.bookmarked))
          .catch(err => console.error(err))
      }
    }, [article.id, token])

      const toggleBookmark = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      if (!token || !username) {
        alert('Please login to bookmark')
        return
      }

      setLoading(true)

      try {
        if (isBookmarked) {
          // Remove bookmark
          await fetch(`http://localhost:8000/bookmarks/${article.id}?token=${token}`, {
            method: 'DELETE'
          })
        } else {
          // Add bookmark
          await fetch(`http://localhost:8000/bookmarks?article_id=${article.id}&token=${token}`, {
            method: 'POST'
          })
        }
        setIsBookmarked(!isBookmarked)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }

    return (
      <>
        <div 
    className="article-card" 
    style={{ cursor: 'pointer', border: 'none', padding: 0, background: 'none' }}
  >
    {article.image_url ? (
      <img 
        className="article-card-image" 
        src={article.image_url} 
        alt="" 
        loading="lazy"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      />
    ) : (
      <div 
        className="article-card-placeholder"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      ></div>
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
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <span className="source">{article.source || 'BBC.CO.UK'}</span>
      <button onClick={toggleBookmark} 
        onClickCapture={toggleBookmark}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.5)',
          color: isBookmarked ? '#ffd700' : 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
          pointerEvents: 'auto'
        }}
        disabled={loading}
      >
        {isBookmarked ? '★ Saved' : '☆ Save'}
      </button>
    </div>
    <span className="read-link">READ MORE →</span>
  </div>
          </div>
        </div>

        {cluster && cluster.length > 1 && (
          <button
            className="spin-check-badge"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSpinCheck(true) }}
            style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 10 }}
          >
            {cluster.length} sources
          </button>
        )}

        {showSpinCheck && (
          <SpinCheckModal cluster={cluster} onClose={() => setShowSpinCheck(false)} />
        )}
      </>
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

function TrendingTab({ trending, onArticleClick, token, username }) {
  return (
    <div className="trending-tab">
      <div className="search-input-locked">
        <span>Search articles</span>
        <span className="locked-pill">Phase 8</span>
      </div>

      <h2 className="section-title">Trending Now</h2>

      {trending.length === 0 && <p className="status">Nothing trending yet.</p>}

      <div className="trending-list">
        {trending.map((cluster, i) => (
          <button
            key={i}
            className="trending-item"
            onClick={() => onArticleClick(cluster[0].id)}
            style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0, textAlign: 'left', width: '100%' }}
          >
            <span className="trending-rank">{i + 1}</span>
            <div className="trending-content">
              <span className="trending-sources">{cluster.length} sources covering this</span>
              <h3 className="trending-headline">{cluster[0].title}</h3>
            </div>
          </button>
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

function ProfileView({ username, onLogout }) {
  return (
    <div className="profile-view">
      <div className="profile-header">
        <p className="profile-username">@{username}</p>
        <p className="profile-label">Logged in</p>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="locked-tab">
        <p className="locked-title">Echo Chamber Score</p>
        <p className="locked-text">Coming in Phase 9</p>
      </div>
    </div>
  )
}

function HomeTab({ articles, loading, clusters, onArticleClick , token, username }) {
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
            <ArticleCard 
  key={article.id} 
  article={article} 
  cluster={clusterFor(article.id)}
  onClick={() => onArticleClick(article.id)}
  token={token}
  username={username}
/>
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
            <ArticleCard 
              key={article.id} 
              article={article} 
              cluster={clusterFor(article.id)}
              onClick={() => onArticleClick(article.id)}
              token={token}
              username={username}
            />
          ))}
      </main>
    </>
  )
}

function BookmarksTab({ token, username, articles, clusters, onArticleClick }) {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  if (token && username) {
    fetch(`http://localhost:8000/user/bookmarks?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setBookmarks(data)
        } else {
          setBookmarks([])
        }
      })
      .catch(err => {
        console.error('Bookmarks fetch error:', err)
        setBookmarks([])
      })
      .finally(() => setLoading(false))
  }
}, [token, username])

  const clusterFor = (id) => clusters.find((c) => c.some((a) => a.id === id))

  return (
    <div className="bookmarks-tab">
      <h2 className="section-title">Saved Articles</h2>

      {loading && <p className="status">Loading bookmarks…</p>}
      {!loading && bookmarks.length === 0 && <p className="status">No bookmarks yet. Save articles to read later!</p>}

      <main className="reels-feed">
        {bookmarks.map((article) => (
          <ArticleCard 
            key={article.id} 
            article={article} 
            cluster={clusterFor(article.id)}
            onClick={() => onArticleClick(article.id)}
            token={token}
            username={username}
          />
        ))}
      </main>
    </div>
  )
}
function SearchTab({ articles, clusters, token, username, onArticleClick }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    try {
      const response = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setResults(data)
      setSearched(true)
    } catch (err) {
      console.error(err)
    }
  }

  const clusterFor = (id) => clusters.find((c) => c.some((a) => a.id === id))

  return (
  <div style={{ width: 'min(640px, calc(100% - 40px))', margin: '0 auto', padding: '0 20px' }}>
    <h2 className="section-title">Search News</h2>

      {/* Single search input */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 20px',
            background: 'var(--accent-ink)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Search
        </button>
      </div>

      {/* Results */}
      {searched && (
        <>
          <p className="status">{results.length} results found</p>
          <main className="reels-feed">
            {results.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                cluster={clusterFor(article.id)}
                onClick={() => onArticleClick(article.id)}
                token={token}
                username={username}
              />
            ))}
          </main>
        </>
      )}
    </div>
  )
}   

function MainApp({ articles, loading, clusters, trending, username, onLogout, today, token }) {
  const [activeTab, setActiveTab] = useState('home')
  const navigate = useNavigate()

  const handleArticleClick = (articleId) => {
    navigate(`/articles/${articleId}`)
  }

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

{activeTab === 'home' && <HomeTab articles={articles} loading={loading} clusters={clusters} onArticleClick={handleArticleClick} token={token} username={username} />}  

{activeTab === 'search' && (
  <SearchTab 
    articles={articles} 
    clusters={clusters} 
    token={token} 
    username={username}
    onArticleClick={handleArticleClick}
  />
)}
      {activeTab === 'bookmarks' && (
  token ? (
    <BookmarksTab 
      token={token} 
      username={username} 
      articles={articles} 
      clusters={clusters} 
      onArticleClick={handleArticleClick} 
    />
  ) : (
    <LockedTab label="Bookmarks" />
  )
)}
      {activeTab === 'profile' && <ProfileView username={username} onLogout={onLogout} />}

      <nav className="bottom-nav">
        <button className={activeTab === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('home')}>Home</button>
        <button className={activeTab === 'search' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('search')}>Search</button>
        <button className={activeTab === 'bookmarks' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('bookmarks')}>Bookmarks</button>
        <button className={activeTab === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('profile')}>Profile</button>
      </nav>
    </div>
  )
}

function ArticleDetail({ articles, clusters, username, onLogout, today }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const articleId = parseInt(id)

  const article = articles.find((a) => a.id === articleId)
  const cluster = clusters.find((c) => c.some((a) => a.id === articleId)) || []

  if (!article) {
    return (
      <div className="app-shell">
        <header className="masthead">
          <button className="back-link" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>← Back to Feed</button>
        </header>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Article not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <button 
          className="back-link" 
          onClick={() => navigate('/')}
          style={{ marginTop: '20px' }}
        >
          ← Back to Feed
        </button>
      </header>

      <article className="article-detail">
        {/* Hero Image */}
        <div className="article-detail-image">
          {article.image_url ? (
            <img src={article.image_url} alt={article.title} />
          ) : (
            <div className="article-card-placeholder"></div>
          )}
        </div>

        {/* Content */}
        <div className="article-detail-content">
          {/* Meta */}
          <div className="article-detail-meta">
            <span className="source">{article.source}</span>
            <span className="dot">•</span>
            <span className="time">{timeAgo(article.published)}</span>
          </div>

          {/* Title */}
          <h1 className="article-detail-title">{article.title}</h1>

          {/* Full Summary - 2-3 Paragraphs / 10-15 Lines */}
          {article.summary && (
            <div className="article-detail-full">
              <p className="article-detail-summary">{article.summary}</p>
              <p className="article-detail-description">
                This story is developing across multiple news outlets. Each organization brings its own perspective and additional details to the narrative. Read the complete analysis below to understand the full context and implications of this news.
              </p>
              <p className="article-detail-extra">
                By reviewing coverage from multiple sources, you can see how different outlets approach the same story, highlighting important nuances and variations in reporting. Click the button below to read the full article on {article.source}.
              </p>
            </div>
          )}

          {/* Read on Source Button */}
          <a 
            href={article.link} 
            target="_blank" 
            rel="noreferrer"
            className="article-detail-button"
          >
            Read on {article.source}
          </a>

          {/* Spin Check - Related Stories */}
          {cluster.length > 1 && (
            <div className="article-detail-cluster">
              <h2 className="cluster-title">How {cluster.length} sources covered this</h2>
              <p className="cluster-subtitle">Compare headlines and angles</p>
              
              <div className="cluster-items">
                {cluster.map((a) => (
                  <a
                    key={a.id}
                    href={a.link}
                    target="_blank"
                    rel="noreferrer"
                    className="cluster-card"
                  >
                    <div className="cluster-source">{a.source}</div>
                    <div className="cluster-headline">{a.title}</div>
                    <div className="cluster-time">{timeAgo(a.published)}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Working Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>Home</button>
        <button className="nav-item" onClick={() => navigate('/')}>Search</button>
        <button className="nav-item" onClick={() => navigate('/')}>Bookmarks</button>
        <button className="nav-item" onClick={() => navigate('/')}>Profile</button>
      </nav>
    </div>
  )
}

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [trending, setTrending] = useState([])
  const [clusters, setClusters] = useState([])
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')

  const today = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  // Check if user is already logged in
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUsername = localStorage.getItem('username')
    if (savedToken && savedUsername) {
      setToken(savedToken)
      setUsername(savedUsername)
      setIsAuthenticated(true)
    }
  }, [])

  // Handle auth success
  const handleAuthSuccess = (newToken, newUsername) => {
    setToken(newToken)
    setUsername(newUsername)
    setIsAuthenticated(true)
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken('')
    setUsername('')
    setIsAuthenticated(false)
  }

  // Fetch articles
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

  // Fetch trending
  useEffect(() => {
    fetch('http://localhost:8000/trending')
      .then((res) => res.json())
      .then((data) => setTrending(data))
      .catch((err) => console.error(err))
  }, [])

  // Fetch clusters
  useEffect(() => {
    fetch('http://localhost:8000/timeline')
      .then((res) => res.json())
      .then((data) => setClusters(data))
      .catch((err) => console.error(err))
  }, [])

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <MainApp 
              articles={articles} 
              loading={loading} 
              clusters={clusters} 
              trending={trending} 
              username={username} 
              onLogout={handleLogout}
              today={today}
              token={token}
            />
          } 
        />
        <Route 
          path="/articles/:id" 
          element={
            <ArticleDetail 
              articles={articles} 
              clusters={clusters} 
              username={username}
              onLogout={handleLogout}
              today={today}
            />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
