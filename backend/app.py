"""
CineMatch AI - FastAPI Production Web Server
Connects the KNN Hybrid Recommendation Engine to the luxury streaming platform frontend.
Serves both REST API endpoints and static frontend assets.
"""

import os
from typing import Optional, List
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from backend.recommender import CineMatchRecommender
from backend.movie_enricher import MovieEnricher

app = FastAPI(
    title="CineMatch AI API",
    description="Next-generation streaming platform recommendation system powered by Scikit-Learn KNN & Hybrid Collaborative Filtering.",
    version="2.0.0"
)

# CORS middleware for development and production flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize recommender model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOVIES_PATH = os.path.join(BASE_DIR, "movies.csv")
RATINGS_PATH = os.path.join(BASE_DIR, "ratings.csv")

print("[CineMatch AI] Initializing hybrid recommendation model...")
recommender = CineMatchRecommender(movies_path=MOVIES_PATH, ratings_path=RATINGS_PATH)
print("[CineMatch AI] Engine ready! 9,742 movies and 100,836 ratings indexed.")


def _val(param, default=None):
    """Helper to unwrap FastAPI Query default objects if called directly in Python."""
    if hasattr(param, 'default'):
        return default
    return param if param is not None else default


class PersonalizedRequest(BaseModel):
    favorite_ids: List[int]
    limit: Optional[int] = 12


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CineMatch AI",
        "version": "2.0.0",
        "movies_indexed": len(recommender.movies_df),
        "ratings_indexed": len(recommender.ratings_df)
    }


@app.get("/api/stats")
def get_stats():
    """Get system and dataset performance statistics."""
    return recommender.get_system_stats()


@app.get("/api/movies/search")
def search_movies(
    q: Optional[str] = Query(None, description="Search term for title"),
    genre: Optional[str] = Query(None, description="Genre filter (e.g. Action, Sci-Fi)"),
    min_year: Optional[int] = Query(None, description="Minimum release year"),
    max_year: Optional[int] = Query(None, description="Maximum release year"),
    min_rating: Optional[float] = Query(None, description="Minimum average rating (0-5)"),
    sort_by: str = Query("popularity", description="Sort order: popularity, rating, year_desc, year_asc, title"),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Multi-criteria movie search with instant filtering and sorting."""
    q_val = _val(q, None)
    genre_val = _val(genre, None)
    min_year_val = _val(min_year, None)
    max_year_val = _val(max_year, None)
    min_rating_val = _val(min_rating, None)
    sort_by_val = _val(sort_by, "popularity")
    limit_val = int(_val(limit, 24))
    offset_val = int(_val(offset, 0))

    movies, total_count = recommender.search_advanced(
        query=q_val,
        genre=genre_val,
        min_year=min_year_val,
        max_year=max_year_val,
        min_rating=min_rating_val,
        sort_by=sort_by_val,
        limit=limit_val,
        offset=offset_val
    )
    enriched = [MovieEnricher.enrich(m) for m in movies]
    return {
        "results": enriched,
        "total": total_count,
        "limit": limit_val,
        "offset": offset_val
    }


@app.get("/api/movies/recommend")
def get_recommendations(
    movie: str = Query(..., description="Movie title or movieId to get recommendations for"),
    limit: int = Query(10, ge=1, le=30),
    genre_weight: float = Query(0.4, ge=0.0, le=1.0),
    rating_weight: float = Query(0.6, ge=0.0, le=1.0)
):
    """
    Generate hybrid KNN recommendations for a given movie.
    Blends cosine distance in latent user-item space with content genre vector proximity.
    """
    movie_val = _val(movie, "Toy Story")
    gw = float(_val(genre_weight, 0.4))
    rw = float(_val(rating_weight, 0.6))
    lim = int(_val(limit, 10))

    recs = recommender.get_recommendations(
        movie_identifier=movie_val,
        n_recommendations=lim,
        genre_weight=gw,
        rating_weight=rw
    )
    if not recs:
        # If movie not found, try matching closest query
        matches = recommender.find_movies(movie_val, limit=1)
        if matches:
            recs = recommender.get_recommendations(matches[0]['movieId'], n_recommendations=lim)
    
    enriched = [MovieEnricher.enrich(r) for r in recs]
    return {
        "query": movie_val,
        "count": len(enriched),
        "genre_weight": gw,
        "rating_weight": rw,
        "recommendations": enriched
    }


@app.post("/api/movies/recommend/personalized")
def get_personalized(req: PersonalizedRequest):
    """Generate recommendations personalized to user's saved favorites."""
    recs = recommender.get_personalized_recommendations(
        favorite_ids=req.favorite_ids,
        limit=req.limit or 12
    )
    enriched = [MovieEnricher.enrich(r) for r in recs]
    return {
        "source_favorites": req.favorite_ids,
        "recommendations": enriched
    }


@app.get("/api/movies/trending")
def get_trending(limit: int = Query(15, ge=1, le=50)):
    """Fetch trending movies ranked by Bayesian weighted user popularity."""
    lim = int(_val(limit, 15))
    movies = recommender.get_trending(limit=lim)
    return {"results": [MovieEnricher.enrich(m) for m in movies]}


@app.get("/api/movies/top-rated")
def get_top_rated(limit: int = Query(15, ge=1, le=50)):
    """Fetch highest-rated classic movies."""
    lim = int(_val(limit, 15))
    movies = recommender.get_top_rated(limit=lim)
    return {"results": [MovieEnricher.enrich(m) for m in movies]}


@app.get("/api/movies/moods")
def get_mood_movies(
    mood: str = Query("adrenaline", description="Mood: adrenaline, mind_bending, feel_good, dark_gritty, heartfelt, cosmic_wonder"),
    limit: int = Query(12, ge=1, le=30)
):
    """Fetch movies categorized by emotional experience."""
    mood_val = _val(mood, "adrenaline")
    lim = int(_val(limit, 12))
    movies = recommender.get_mood_recommendations(mood=mood_val, limit=lim)
    return {"mood": mood_val, "results": [MovieEnricher.enrich(m) for m in movies]}


@app.get("/api/movies/genres")
def get_genres():
    """List all available movie genres in catalog."""
    return {"genres": recommender.genres_list}


@app.get("/api/movies/{movie_id}")
def get_movie_detail(movie_id: int):
    """Retrieve full movie details and its top similar titles."""
    movie = recommender.find_movie_by_id(movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    enriched = MovieEnricher.enrich(movie)
    similar = recommender.get_recommendations(movie_id, n_recommendations=6)
    enriched['similar_movies'] = [MovieEnricher.enrich(s) for s in similar]
    return enriched


@app.get("/api/analytics/genres")
def get_genre_analytics():
    """Retrieve genre distribution metrics for the analytics dashboard."""
    return recommender.get_genre_analytics()


# Mount frontend static directory if exists
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
PROJECT_KNOWLEDGE_DIR = os.path.join(BASE_DIR, "project_knowledge")

if os.path.isdir(PROJECT_KNOWLEDGE_DIR):
    app.mount("/project_knowledge", StaticFiles(directory=PROJECT_KNOWLEDGE_DIR), name="project_knowledge")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend_root():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        return FileResponse(index_path)

    @app.get("/{catchall:path}")
    def serve_frontend_catchall(catchall: str):
        # Don't intercept API routes
        if catchall.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(FRONTEND_DIR, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
