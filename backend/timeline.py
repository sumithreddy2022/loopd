from email.utils import parsedate_to_datetime
from db import get_all_articles
from embeddings import get_embeddings_batch
from sklearn.metrics.pairwise import cosine_similarity


def _parse_date(date_str):
    try:
        return parsedate_to_datetime(date_str)
    except (TypeError, ValueError):
        return parsedate_to_datetime("Thu, 01 Jan 1970 00:00:00 GMT")


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x, y):
        root_x, root_y = self.find(x), self.find(y)
        if root_x != root_y:
            self.parent[root_x] = root_y


def build_story_clusters(threshold=0.5):
    articles = get_all_articles()
    n = len(articles)
    if n == 0:
        return []

    titles = [a[1] for a in articles]
    embeddings = get_embeddings_batch(titles)
    sim_matrix = cosine_similarity(embeddings)

    uf = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i][j] >= threshold:
                uf.union(i, j)

    groups = {}
    for i in range(n):
        root = uf.find(i)
        groups.setdefault(root, []).append(articles[i])

    clusters = []
    for group in groups.values():
        if len(group) < 2:
            continue
        group_sorted = sorted(group, key=lambda a: _parse_date(a[4]))
        clusters.append([
            {"id": a[0], "title": a[1], "link": a[2], "summary": a[3], "published": a[4]}
            for a in group_sorted
        ])

    return clusters


def get_top_clusters(threshold=0.5, limit=5):
    clusters = build_story_clusters(threshold=threshold)
    return sorted(clusters, key=len, reverse=True)[:limit]


def get_cluster_for_article(article_id, threshold=0.5):
    clusters = build_story_clusters(threshold=threshold)
    for cluster in clusters:
        if any(a["id"] == article_id for a in cluster):
            return cluster
    return []