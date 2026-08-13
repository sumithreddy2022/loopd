import feedparser

feed = feedparser.parse("http://feeds.bbci.co.uk/news/world/rss.xml")
entry = feed.entries[0]

print("Available fields:", list(entry.keys()))
print()
if 'media_thumbnail' in entry:
    print("media_thumbnail:", entry.media_thumbnail)
if 'media_content' in entry:
    print("media_content:", entry.media_content)
if 'links' in entry:
    print("links:", entry.links)