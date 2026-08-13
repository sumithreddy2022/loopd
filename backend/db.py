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
            image_url TEXT
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

    # Add image_url if the database was created with an older schema
    columns = [row[1] for row in cursor.execute("PRAGMA table_info(articles)")]

    if "image_url" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN image_url TEXT")

    if "category" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN category TEXT")

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

from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

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