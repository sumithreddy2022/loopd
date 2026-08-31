from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from db import (
    init_db, get_all_articles, save_articles, delete_old_articles,
    add_bookmark, remove_bookmark, get_user_bookmarks, is_bookmarked
)
from fetch import fetch_articles
from embeddings import get_embedding
from analyze import find_similar_articles
from timeline import build_story_clusters, get_top_clusters, get_cluster_for_article
from auth import (
    init_auth_db, create_user, verify_user, create_session, get_user_from_token
)

app = FastAPI()

# ===== CORS SETUP =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for local dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== MODELS =====
class Article(BaseModel):
    id: int
    title: str
    link: str
    summary: Optional[str] = None
    published: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    image_url: Optional[str] = None


class SignUpRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ===== INITIALIZATION =====
@app.on_event("startup")
async def startup_event():
    init_db()
    init_auth_db()


# ===== ROOT =====
@app.get("/")
def root():
    return {"message": "Loopd API running"}


# ===== ARTICLES ENDPOINTS =====
@app.get("/articles", response_model=List[Article])
def get_articles():
    rows = get_all_articles()
    return [
        Article(
            id=r[0],
            title=r[1],
            link=r[2],
            summary=r[3],
            published=r[4],
            category=r[5],
            source=r[6],
            image_url=r[7]
        )
        for r in rows
    ]


@app.get("/articles/{article_id}", response_model=Article)
def get_article(article_id: int):
    rows = get_all_articles()
    for r in rows:
        if r[0] == article_id:
            return Article(
                id=r[0],
                title=r[1],
                link=r[2],
                summary=r[3],
                published=r[4],
                category=r[5],
                source=r[6],
                image_url=r[7]
            )
    raise HTTPException(status_code=404, detail="Article not found")


# ===== FETCH ENDPOINT =====
@app.post("/fetch")
def trigger_fetch():
    articles = fetch_articles()
    save_articles(articles)
    deleted = delete_old_articles(days=7)
    stored = get_all_articles()
    return {
        "deleted": deleted,
        "total": len(stored)
    }


# ===== SIMILARITY & CLUSTERING =====
@app.get("/similar")
def get_similar(threshold: float = 0.5):
    pairs = find_similar_articles(threshold=threshold)
    return pairs


@app.get("/timeline", response_model=List[List[Article]])
def get_timeline(threshold: float = 0.5):
    clusters = build_story_clusters(threshold=threshold)
    return [
        [
            Article(
                id=a["id"],
                title=a["title"],
                link=a["link"],
                summary=a["summary"],
                published=a["published"],
                category=a.get("category"),
                source=a.get("source"),
                image_url=a.get("image_url")
            )
            for a in cluster
        ]
        for cluster in clusters
    ]


@app.get("/trending", response_model=List[List[Article]])
def get_trending(limit: int = 5):
    clusters = get_top_clusters(limit=limit)
    return [
        [
            Article(
                id=a["id"],
                title=a["title"],
                link=a["link"],
                summary=a["summary"],
                published=a["published"],
                category=a.get("category"),
                source=a.get("source"),
                image_url=a.get("image_url")
            )
            for a in cluster
        ]
        for cluster in clusters
    ]


@app.get("/articles/{article_id}/cluster", response_model=List[Article])
def get_article_cluster(article_id: int, threshold: float = 0.5):
    cluster = get_cluster_for_article(article_id, threshold=threshold)
    return [
        Article(
            id=a["id"],
            title=a["title"],
            link=a["link"],
            summary=a["summary"],
            published=a["published"],
            category=a.get("category"),
            source=a.get("source"),
            image_url=a.get("image_url")
        )
        for a in cluster
    ]


# ===== AUTH ENDPOINTS =====
@app.post("/signup")
def signup(request: SignUpRequest):
    user_id = create_user(request.username, request.password)
    if not user_id:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    token = create_session(user_id)
    return {
        "token": token,
        "username": request.username
    }


@app.post("/login")
def login(request: LoginRequest):
    user_id = verify_user(request.username, request.password)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_session(user_id)
    return {
        "token": token,
        "username": request.username
    }


# ===== BOOKMARKS ENDPOINTS =====
@app.post("/bookmarks")
def add_bookmark_endpoint(article_id: int, token: str):
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    success = add_bookmark(user_id, article_id)
    if success:
        return {"message": "Bookmarked", "article_id": article_id}
    else:
        raise HTTPException(status_code=400, detail="Already bookmarked")


@app.delete("/bookmarks/{article_id}")
def remove_bookmark_endpoint(article_id: int, token: str):
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    remove_bookmark(user_id, article_id)
    return {"message": "Bookmark removed", "article_id": article_id}


@app.get("/user/bookmarks")
def get_bookmarks(token: str):
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    rows = get_user_bookmarks(user_id)
    return [
        {
            "id": r[0],
            "title": r[1],
            "link": r[2],
            "summary": r[3],
            "published": r[4],
            "category": r[5],
            "source": r[6],
            "image_url": r[7]
        }
        for r in rows
    ]


@app.get("/articles/{article_id}/is-bookmarked")
def check_bookmark(article_id: int, token: str):
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    bookmarked = is_bookmarked(user_id, article_id)
    return {"bookmarked": bookmarked, "article_id": article_id}

    # ===== SEARCH ENDPOINT =====

@app.get("/search")
def search_articles(q: str = "", category: str = "", source: str = ""):
    rows = get_all_articles()
    results = []
    
    for r in rows:
        title = r[1].lower()
        summary = (r[3] or "").lower()
        article_category = (r[5] or "").lower()
        article_source = (r[6] or "").lower()
        
        # Match keyword
        keyword_match = (q.lower() in title or q.lower() in summary) if q else True
        
        # Match category
        category_match = (category.lower() in article_category) if category else True
        
        # Match source
        source_match = (source.lower() in article_source) if source else True
        
        if keyword_match and category_match and source_match:
            results.append({
                "id": r[0],
                "title": r[1],
                "link": r[2],
                "summary": r[3],
                "published": r[4],
                "category": r[5],
                "source": r[6],
                "image_url": r[7]
            })
    
    return results