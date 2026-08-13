from db import init_db, save_articles, get_all_articles, delete_old_articles
RSS_SOURCES = [
    {"source": "BBC", "category": "World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
    {"source": "BBC", "category": "Sports", "url": "http://feeds.bbci.co.uk/sport/rss.xml"},
    {"source": "BBC", "category": "Entertainment", "url": "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"},
    {"source": "BBC", "category": "Politics", "url": "http://feeds.bbci.co.uk/news/politics/rss.xml"},
    {"source": "BBC", "category": "Tech", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml"},
    {"source": "BBC", "category": "Economics", "url": "http://feeds.bbci.co.uk/news/business/rss.xml"},
    {"source": "NDTV", "category": "World", "url": "https://feeds.feedburner.com/NDTV-LatestNews"},
    {"source": "Times of India", "category": "World", "url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"},
    {"source": "Hindustan Times", "category": "World", "url": "https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml"},
]

def get_image_url(entry):
    url = None

    # 1. media:thumbnail
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        url = entry.media_thumbnail[0].get("url")

    # 2. media:content
    if not url and hasattr(entry, "media_content") and entry.media_content:
        for media in entry.media_content:
            media_url = media.get("url")
            if media_url:
                url = media_url
                break

    # 3. enclosure
    if not url and hasattr(entry, "enclosures") and entry.enclosures:
        for enclosure in entry.enclosures:
            media_url = enclosure.get("href") or enclosure.get("url")
            media_type = enclosure.get("type", "")
            if media_url and media_type.startswith("image/"):
                url = media_url
                break

    # Upgrade BBC image resolution
    if url:
        url = url.replace("/standard/240/", "/standard/640/")

    return url

def fetch_articles():
    import feedparser
    all_articles = []

    for src in RSS_SOURCES:
        feed = feedparser.parse(src["url"])
        for entry in feed.entries:
            all_articles.append({
                "title": entry.title,
                "link": entry.link,
                "summary": entry.get("summary", ""),
                "published": entry.get("published", ""),
                "category": src["category"],
                "source": src["source"],
                "image_url": get_image_url(entry),
            })

    return all_articles

if __name__ == "__main__":
    init_db()
    articles = fetch_articles()
    save_articles(articles)
    deleted = delete_old_articles(days=7)
    stored = get_all_articles()
    print(f"Deleted {deleted} articles older than 7 days")
    print(f"Total articles in database: {len(stored)}")