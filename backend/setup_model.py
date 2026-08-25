from sentence_transformers import SentenceTransformer

print("Downloading and caching sentence-transformers model...")
print("This takes ~2-3 minutes, but only runs once.")

model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Model cached successfully!")
print("Future runs will start instantly.")