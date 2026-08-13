from db import get_all_articles
from embeddings import get_embedding
from sklearn.metrics.pairwise import cosine_similarity

def find_similar_articles(threshold=0.5):
    articles = get_all_articles()
    print(f"Comparing {len(articles)} articles...\n")

    embeddings = []
    for article in articles:
        title = article[1]  # (id, title, link, summary, published)
        embeddings.append(get_embedding(title))

    similar_pairs = []
    for i in range(len(articles)):
        for j in range(i + 1, len(articles)):
            score = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
            if score >= threshold:
                similar_pairs.append((articles[i][1], articles[j][1], score))

    return similar_pairs

if __name__ == "__main__":
    pairs = find_similar_articles(threshold=0.5)
    print(f"Found {len(pairs)} similar pairs (threshold 0.5):\n")
    for title1, title2, score in sorted(pairs, key=lambda x: -x[2]):
        print(f"{score:.4f} | {title1}")
        print(f"       | {title2}")
        print("---")
        