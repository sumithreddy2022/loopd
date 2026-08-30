import sqlite3
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta
 
DB_NAME = "loopd.db"
 
 
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
 
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            link TEXT UNIQUE NOT NULL,
            summary TEXT,
            published TEXT,
            category TEXT,
            image_url TEXT,
            source TEXT
        )
    """)
 
    # Add columns if the database was created with an older schema
    columns = [row[1] for row in cursor.execute("PRAGMA table_info(articles)")]
 
    if "image_url" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN image_url TEXT")
 
    if "category" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN category TEXT")
 
    if "source" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN source TEXT")
 
    # Bookmarks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            article_id INTEGER NOT NULL,
            created_at TEXT,
            UNIQUE(user_id, article_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(article_id) REFERENCES articles(id)
        )
    """)
 
    conn.commit()
    conn.close()
 
 
def save_articles(articles):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
 
    for article in articles:
        cursor.execute("""
            INSERT INTO articles
            (title, link, summary, published, category, source, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(link) DO UPDATE SET
                title = excluded.title,
                summary = excluded.summary,
                published = excluded.published,
                category = excluded.category,
                source = excluded.source,
                image_url = excluded.image_url
        """, (
            article["title"],
            article["link"],
            article.get("summary"),
            article.get("published"),
            article.get("category"),
            article.get("source"),
            article.get("image_url")
        ))
 
    conn.commit()
    conn.close()
 
 
def get_all_articles():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
 
    cursor.execute("""
        SELECT
            id,
            title,
            link,
            summary,
            published,
            category,
            source,
            image_url
        FROM articles
        ORDER BY id DESC
    """)
 
    rows = cursor.fetchall()
    conn.close()
 
    return rows
 
 
def delete_old_articles(days=7):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, published FROM articles")
    rows = cursor.fetchall()
 
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    old_ids = []
    for row_id, published in rows:
        try:
            pub_date = parsedate_to_datetime(published)
            if pub_date.tzinfo is None:
                pub_date = pub_date.replace(tzinfo=timezone.utc)
            if pub_date < cutoff:
                old_ids.append(row_id)
        except (TypeError, ValueError):
            continue  # unparseable date — skip, don't risk deleting it wrongly
 
    if old_ids:
        placeholders = ",".join("?" * len(old_ids))
        cursor.execute(f"DELETE FROM articles WHERE id IN ({placeholders})", old_ids)
 
    conn.commit()
    conn.close()
    return len(old_ids)
 
 
# ===== BOOKMARKS FUNCTIONS =====
 
def add_bookmark(user_id, article_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO bookmarks (user_id, article_id, created_at) VALUES (?, ?, ?)",
            (user_id, article_id, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False  # Already bookmarked
    finally:
        conn.close()
 
 
def remove_bookmark(user_id, article_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?",
        (user_id, article_id)
    )
    conn.commit()
    conn.close()
 
 
def get_user_bookmarks(user_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.title, a.link, a.summary, a.published, a.category, a.source, a.image_url
        FROM articles a
        JOIN bookmarks b ON a.id = b.article_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows
 
 
def is_bookmarked(user_id, article_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM bookmarks WHERE user_id = ? AND article_id = ?",
        (user_id, article_id)
    )
    result = cursor.fetchone()
    conn.close()
    return result is not None
 