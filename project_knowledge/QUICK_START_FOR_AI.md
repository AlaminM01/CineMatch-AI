# ⚡ CineMatch AI — Quick Start & Architecture Brief for AI Assistants

> **Compact System Reference (1–2 Pages)**  
> *Upload this document directly to ChatGPT, Claude, Gemini, or any LLM for immediate project comprehension.*

---

## 1. What is CineMatch AI?
**CineMatch AI** is a production-grade, portfolio-ready **Movie Recommendation Platform** featuring a **Luxury Glassmorphism UI** (Netflix/Letterboxd styling) powered by a **FastAPI backend** and an **Explainable Hybrid k-Nearest Neighbors (k-NN)** model operating on the MovieLens Latest Small dataset (**9,742 movies**, **100,836 ratings**, **610 users**).

---

## 2. Core Architecture & Tech Stack

```text
[Frontend (HTML5 / Modern CSS / Vanilla ES6+)]  <--- HTTP / JSON --->  [FastAPI Backend (Python 3.10+)]
  ├── Glassmorphic UI (rgba(255,255,255,0.06))                            ├── CineMatchRecommender (KNN Cosine)
  ├── 60 FPS transitions, Netflix Red theme                                ├── MovieEnricher (Metadata, Posters, SVGs)
  ├── LocalStorage Store (Favorites, Watchlist, Ratings)                   └── 11 REST API Endpoints (Port 8000)
```

- **Backend:** Python 3.10+, FastAPI, Uvicorn, Scikit-Learn (`NearestNeighbors`), Pandas, NumPy, SciPy (`csr_matrix`).
- **Frontend:** Zero-dependency Vanilla JS SPA, Custom Glassmorphism CSS, Google Fonts (*Outfit* + *Inter*), Procedural SVG Data URIs.
- **Data:** `movies.csv` (`movieId`, `title`, `genres`), `ratings.csv` (`userId`, `movieId`, `rating`, `timestamp`).

---

## 3. The Recommendation Algorithm in 60 Seconds
1. **Feature Vector (23 Dimensions):**
   - 1 Normalized Release Year (`MinMaxScaler`).
   - 1 Standardized Movie Average Rating (`StandardScaler`).
   - 1 Standardized Total Rating Count (`StandardScaler`).
   - 20 One-Hot Encoded Genre Columns (`Adventure`, `Animation`, `Action`, `Sci-Fi`, etc.).
2. **Model:** `sklearn.neighbors.NearestNeighbors(n_neighbors=50, metric='cosine', algorithm='auto')`.
3. **Similarity Equation:**
   $$\text{FinalScore} = w_{\text{genre}} \cdot \text{Jaccard}(\text{Genres}_A, \text{Genres}_B) + w_{\text{rating}} \cdot (1 - d_{\text{cosine}})$$
   *(Default weights: $w_{\text{genre}} = 0.40, w_{\text{rating}} = 0.60$)*.
4. **Explainable AI (XAI):** Renders dynamic **% Match badges** (55%–99%) and natural-language justifications for every candidate.

---

## 4. Key Endpoints Reference (FastAPI on Port 8000)

| Endpoint | Method | Key Parameters | Function |
| :--- | :--- | :--- | :--- |
| `/api/movies/search` | `GET` | `q`, `genre`, `min_year`, `max_year`, `min_rating`, `sort_by` | Multi-filter keyword & attribute search. |
| `/api/movies/recommend`| `GET` | `movie`, `limit`, `genre_weight`, `rating_weight` | Hybrid KNN recommendations with AI Match %. |
| `/api/movies/recommend/personalized` | `POST` | `{"favorite_ids": [1, 296]}` | Aggregated recommendations from user library. |
| `/api/movies/trending`| `GET` | `limit` (default 15) | Bayesian weighted community favorites. |
| `/api/movies/moods` | `GET` | `mood` (*adrenaline*, *mind_bending*, etc.) | Curated emotional category discovery. |
| `/api/movies/{id}` | `GET` | `movie_id` path param | Full details, trailer, cast, and similar carousel. |
| `/api/analytics/genres`| `GET` | None | Genre counts and catalog distribution. |

---

## 5. Key File Locations & Responsibilities
- `backend/recommender.py`: Preprocessing, feature matrix construction, KNN model training, and recommendation queries.
- `backend/movie_enricher.py`: Curated metadata database, plot summaries, cast, YouTube trailers, and procedural SVG posters.
- `backend/app.py`: FastAPI server setup, CORS configuration, endpoint handlers, and static asset serving.
- `frontend/index.html`: Complete single-page luxury streaming markup.
- `frontend/css/style.css`: Glassmorphism design tokens, 60 FPS transitions, dark theme, and mobile responsiveness.
- `frontend/js/app.js`: Main UI controller: debounced search, typewriter animation, modals, and carousel sliders.
- `frontend/js/store.js`: Pub/Sub state store for LocalStorage (Favorites, Watchlist, Ratings, Ambient Mode).
- `frontend/js/api.js`: Asynchronous fetch wrapper with automated offline fallback data.
- `run.py`: One-click startup script (starts Uvicorn and automatically launches default browser).

---

## 6. How to Run & Verify
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Launch application (starts server + opens browser at http://localhost:8000)
python run.py
```

---

## 7. Common Technical Inquiries
- **Q: Where is the user database?**  
  *A:* Client-side in browser `window.localStorage`, guaranteeing instant zero-auth persistence and user privacy.
- **Q: How are broken images prevented?**  
  *A:* Procedural SVG posters generated on the fly as Data URIs fallback automatically if an external image fails.
- **Q: What is the query speed?**  
  *A:* In-memory Scikit-Learn KNN cosine indexing executes in under 2.5 milliseconds.
