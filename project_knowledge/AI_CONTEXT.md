# 🤖 CineMatch AI — System Context for AI Models

> **AI SYSTEM PROMPT & CODEBASE KNOWLEDGE BASE**  
> *Target Models: ChatGPT (GPT-4o/o1/o3), Claude 3.5 Sonnet, Gemini 1.5/2.0 Pro, Cursor, GitHub Copilot, Antigravity.*  
> *Instructions: Use this document as the single source of truth for the CineMatch AI architecture, algorithms, file paths, endpoints, and data contracts.*

---

## 1. Project Synopsis
- **Project Name:** CineMatch AI
- **Tagline:** "Discover your next favorite story."
- **Domain:** Artificial Intelligence / Machine Learning / Full-Stack Web Development / UI/UX Design
- **Architecture Pattern:** Decoupled Client-Server (FastAPI Python Backend + Glassmorphism SPA Frontend)
- **Dataset:** MovieLens Latest Small Dataset (9,742 movies, 100,836 ratings, 610 unique users)
- **Core ML Model:** k-Nearest Neighbors (`sklearn.neighbors.NearestNeighbors`) with `metric='cosine'`, combined with dynamic Content-Based Jaccard Genre Weighting.

---

## 2. Complete Repository Directory Structure
```text
Movie_recomendation/
│
├── backend/
│   ├── __init__.py                # Package marker
│   ├── app.py                     # FastAPI application, CORS, routers, static mounts
│   ├── recommender.py             # CineMatchRecommender: KNN engine, feature matrix, caching
│   ├── movie_enricher.py          # MovieEnricher: metadata, cast, plots, trailers, procedural SVGs
│   └── requirements.txt           # Python dependencies (fastapi, uvicorn, scikit-learn, etc.)
│
├── frontend/
│   ├── index.html                 # Semantic HTML5 Single Page Application (Netflix-style)
│   ├── css/
│   │   └── style.css              # Glassmorphism, animations, custom scrollbars, cinema glow, 60fps transitions
│   └── js/
│       ├── api.js                 # Asynchronous fetch client with offline mock resilience
│       ├── store.js               # Client persistence (LocalStorage for favorites, watchlist, ratings)
│       └── app.js                 # UI Controller: carousels, modals, search, tuner, stats
│
├── project_knowledge/
│   ├── PROJECT_OVERVIEW.md        # High-level architecture & 5-minute project briefing
│   ├── AI_CONTEXT.md              # [This file] Complete AI knowledge base & system context
│   ├── PROJECT_QA.md              # 110+ comprehensive viva, placement, and interview Q&As
│   ├── CHATGPT_PROMPT.txt         # Pre-engineered prompt for AI assistants
│   ├── SYSTEM_ARCHITECTURE.md     # Detailed Mermaid.js architectural diagrams
│   ├── CHANGELOG.md               # Versioning and feature release notes
│   ├── PROJECT_LOG.md             # Chronological engineering log
│   └── QUICK_START_FOR_AI.md      # 1-2 page executive AI cheat sheet
│
├── movies.csv                     # Original MovieLens movies dataset (movieId, title, genres)
├── ratings.csv                    # Original MovieLens ratings dataset (userId, movieId, rating, timestamp)
├── movie_recommendation.ipynb     # Original development notebook
├── run.py                         # Single-command launcher (starts server + opens browser)
└── README.md                      # GitHub showcase presentation
```

---

## 3. Database Schema & Data Ingestion Specs

### `movies.csv`
- `movieId` (int): Unique identifier for each movie.
- `title` (str): Raw string containing movie title and release year, e.g. `"Toy Story (1995)"` or `"Dark Knight, The (2008)"`.
- `genres` (str): Pipe-separated genre names, e.g. `"Adventure|Animation|Children|Comedy|Fantasy"`.

### `ratings.csv`
- `userId` (int): Identifier for user providing feedback.
- `movieId` (int): Foreign key matching `movies.csv`.
- `rating` (float): Rating on a 0.5 to 5.0 scale (increments of 0.5).
- `timestamp` (int): Epoch timestamp.

### Preprocessing & Feature Engineering Pipeline
1. **Year Extraction**: `r'\((\d{4})\)$'` regex extracts release year. Missing values filled with the median year (2000).
2. **Title Normalization**: Trailing articles (e.g. `", The"`, `", A"`) are cleaned into natural reading order (`"The Dark Knight"`).
3. **One-Hot Encoding**: Pipe-separated genres transformed into binary indicator columns (19 distinct genres).
4. **Year Normalization**: Scaled to $[0, 1]$ using `sklearn.preprocessing.MinMaxScaler()`.
5. **Rating Statistics**:
   - `avg_rating`: Mean rating per movie (missing values imputed with global mean: $\approx 3.50$).
   - `rating_count`: Total number of ratings per movie.
   - `avg_rating` and `rating_count` are standardized with zero mean and unit variance using `sklearn.preprocessing.StandardScaler()`.
6. **Feature Matrix**: Concatenation of normalized numeric features (`year`, `avg_rating`, `rating_count`) and the 20 genre columns $\to$ 23-dimensional feature matrix $\mathbf{X} \in \mathbb{R}^{9742 \times 23}$.

---

## 4. Machine Learning & Recommendation Logic

### KNN Hybrid Model
```python
# Model initialization
knn_model = NearestNeighbors(n_neighbors=50, metric='cosine', algorithm='auto')
knn_model.fit(feature_matrix)
```

### Recommendation Math & Scoring
When a user requests recommendations for movie $A$:
1. Vector $\mathbf{v}_A$ is queried against the KNN index to retrieve $k$ nearest neighbors:
   $$\text{cosine\_dist}(\mathbf{v}_A, \mathbf{v}_B) = 1 - \frac{\mathbf{v}_A \cdot \mathbf{v}_B}{\|\mathbf{v}_A\|_2 \|\mathbf{v}_B\|_2}$$
2. The raw similarity is $S_{\text{cosine}} = 1 - \text{cosine\_dist}$.
3. The content genre overlap is computed via Jaccard index:
   $$J(\text{Genres}_A, \text{Genres}_B) = \frac{|\text{Genres}_A \cap \text{Genres}_B|}{|\text{Genres}_A \cup \text{Genres}_B|}$$
4. Blended confidence score:
   $$\text{FinalScore} = (w_{\text{genre}} \times J) + (w_{\text{rating}} \times S_{\text{cosine}})$$
   (Default weights: $w_{\text{genre}} = 0.40, w_{\text{rating}} = 0.60$).
5. The Match Percentage is calculated as:
   $$\text{Match \%} = \text{clip}(\text{round}(\text{FinalScore} \times 100), 55, 99)$$

---

## 5. API Routes & Contracts (FastAPI)

| Method | Endpoint | Query / Body Params | Response Payload Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | Returns server health, version, dataset counts. |
| `GET` | `/api/stats` | None | Dataset scale, users count, latency, dimensions. |
| `GET` | `/api/movies/search` | `q`, `genre`, `min_year`, `max_year`, `min_rating`, `sort_by`, `limit`, `offset` | Filtered list of enriched movie objects + total count. |
| `GET` | `/api/movies/recommend` | `movie`, `limit`, `genre_weight`, `rating_weight` | Seed movie info + list of top-$k$ recommended movies with reasons and % matches. |
| `POST` | `/api/movies/recommend/personalized` | JSON: `{"favorite_ids": [1, 296], "limit": 12}` | Blended personalized recommendation list aggregated across favorites. |
| `GET` | `/api/movies/trending` | `limit` (default 15) | Bayesian weighted top community movies. |
| `GET` | `/api/movies/top-rated` | `limit` (default 15) | Highest average-rated movies with $\ge 30$ reviews. |
| `GET` | `/api/movies/moods` | `mood`, `limit` | Curated movies for emotional category. |
| `GET` | `/api/movies/genres` | None | Array of all 19 unique genres in catalog. |
| `GET` | `/api/movies/{movie_id}` | `movie_id` path param | Full movie details, enriched cast, trailer URL, and similar movies carousel. |
| `GET` | `/api/analytics/genres` | None | Genre distribution data for analytics charts. |

---

## 6. Frontend Architecture & Design System

### Design Tokens
- **Primary Color:** `#E50914` (Netflix Crimson Red)
- **Secondary Surfaces:** `#08080C`, `#141419`, `#1E1E26`
- **Accent Colors:** `#00D4FF` (Electric Cyan), `#FFD700` (Cyber Gold)
- **Glass Cards:** `background: rgba(255, 255, 255, 0.06)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.12)`
- **Hover Transitions:** 60 FPS hardware-accelerated transforms (`transform: translateY(-8px) scale(1.03)` with box-shadow bloom).

### Client Modules
- `api.js`: Handles all REST queries with automatic fallback to local offline data if backend is offline.
- `store.js`: Manages LocalStorage subscriptions for Favorites, Watchlist, Ratings, Search History, and Ambient Glow Mode.
- `app.js`: Main event orchestrator: typing animation, debounced search suggestions, carousel scroll buttons, modals, and sliders.

---

## 7. Business Logic & User Flows

1. **First-Time Discovery Flow**:
   - Splash screen plays a 1.2s Netflix-style branded intro animation.
   - User lands on the dynamic Hero presentation banner.
   - User sees "Top Picks For You" row pre-initialized with starter favorites, "Trending", and "Because You Watched Inception".
2. **Search & Exploration Flow**:
   - User presses `/` from anywhere on the page to jump into search.
   - Real-time autocomplete suggestions appear below the input.
   - User can filter by decade (2010s, 2000s, 1990s, Classic) or rating threshold (★ 4.0+).
3. **Interactive Tuning Flow**:
   - In the "AI Tuner" section, user enters any title (e.g. *The Matrix*) and drags the Content vs. Collaborative sliders.
   - Engine executes live KNN query and renders recommendations with updated similarity scores.
4. **Playback & Movie Detail Flow**:
   - Clicking a card opens the Glassmorphic Movie Detail Modal.
   - Modal displays the Mathematical Explanation for the recommendation.
   - User can click "Play Trailer" to launch a YouTube video modal, or submit a 1-5 star rating.
