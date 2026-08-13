from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

 
def get_embedding(text):
    embedding = model.encode(text)
    return embedding

if __name__ == "__main__":
    sample_text = "Fed raises interest rates to combat inflation"
    vector = get_embedding(sample_text)

    print(f"Text: {sample_text}")
    print(f"Embedding length: {len(vector)}")
    print(f"First 5 numbers: {vector[:5]}")

    from sklearn.metrics.pairwise import cosine_similarity

if __name__ == "__main__":
    text1 = "Fed raises interest rates to combat inflation"
    text2 = "Central bank hikes borrowing costs"
    text3 = "Ancient Roman shipwreck discovered off Sicily"

    vec1 = get_embedding(text1)
    vec2 = get_embedding(text2)
    vec3 = get_embedding(text3)

    similarity_1_2 = cosine_similarity([vec1], [vec2])[0][0]
    similarity_1_3 = cosine_similarity([vec1], [vec3])[0][0]

    print(f"Similarity (Fed/Central bank - related): {similarity_1_2:.4f}")
    print(f"Similarity (Fed/Shipwreck - unrelated): {similarity_1_3:.4f}")

def get_embeddings_batch(texts):
    return model.encode(texts)
    