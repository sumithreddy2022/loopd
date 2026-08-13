from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi import Header
from auth import init_auth_db, create_user, verify_user, create_session, get_user_from_token

from timeline import build_story_clusters, get_top_clusters, get_cluster_for_article
from db import init_db, get_all_articles, save_articles
from fetch import fetch_articles
from analyze import find_similar_articles


app = FastAPI(title="Loopd API", version="0.1.0")


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database/table when server starts
init_db()

init_auth_db()
# =========================
# MODELS
# =========================

class Article(BaseModel):
    id: int
    title: str
    link: str
    summary: Optional[str] = None
    published: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class SimilarPair(BaseModel):
    title1: str
    title2: str
    score: float


# =========================
# BASIC ROUTE
# =========================

@app.get("/")
def root():
    return {"message": "Loopd API is running"}


# =========================
# ARTICLES
# =========================

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
                image_url=r[6]
            )

    raise HTTPException(
        status_code=404,
        detail="Article not found"
    )


# =========================
# FETCH NEW ARTICLES
# =========================

@app.post("/fetch")
def trigger_fetch():

    articles = fetch_articles()

    save_articles(articles)

    return {
        "fetched": len(articles),
        "total_in_db": len(get_all_articles())
    }


# =========================
# SIMILAR ARTICLES
# =========================

@app.get("/similar", response_model=List[SimilarPair])
def get_similar(threshold: float = 0.5):

    pairs = find_similar_articles(threshold=threshold)

    return [
        SimilarPair(
            title1=t1,
            title2=t2,
            score=float(s)
        )
        for t1, t2, s in pairs
    ]


# =========================
# TIMELINE
# =========================

@app.get("/timeline", response_model=List[List[Article]])
def get_timeline(threshold: float = 0.5):

    return build_story_clusters(threshold=threshold)


class Article(BaseModel):
    id: int
    title: str
    link: str
    summary: Optional[str] = None
    published: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    image_url: Optional[str] = None

@app.get("/trending", response_model=List[List[Article]])
def get_trending(limit: int = 5):
    return get_top_clusters(limit=limit)

@app.get("/articles/{article_id}/cluster", response_model=List[Article])
def get_article_cluster(article_id: int):
    return get_cluster_for_article(article_id)

@app.get("/trending", response_model=List[List[Article]])
def get_trending(limit: int = 5):
    return get_top_clusters(limit=limit)

@app.get("/articles/{article_id}/cluster", response_model=List[Article])
def get_article_cluster(article_id: int):
    return get_cluster_for_article(article_id)

class SignupRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    token: str
    username: str


@app.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    user_id = create_user(req.username, req.password)
    if user_id is None:
        raise HTTPException(status_code=400, detail="Username already taken")
    token = create_session(user_id)
    return AuthResponse(token=token, username=req.username)

@app.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user_id = verify_user(req.username, req.password)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_session(user_id)
    return AuthResponse(token=token, username=req.username)

@app.post("/fetch")
def trigger_fetch():
    articles = fetch_articles()
    save_articles(articles)
    deleted = delete_old_articles(days=7)
    return {
        "fetched": len(articles),
        "deleted": deleted,
        "total_in_db": len(get_all_articles())
    }