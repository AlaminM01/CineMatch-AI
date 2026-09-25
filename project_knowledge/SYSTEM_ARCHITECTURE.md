# 📐 CineMatch AI — System Architecture & Engineering Diagrams

This document outlines the software architecture, data pipelines, algorithmic workflows, component interactions, and user journeys of CineMatch AI using standardized **Mermaid.js** diagrams.

---

## 1. High-Level System Architecture

The following diagram illustrates the decoupled client-server architecture of CineMatch AI, showing the separation of concerns between client persistence, API routing, machine learning models, and data storage.

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Presentation Layer (Browser)"]
        HTML["index.html (Semantic HTML5)"]
        CSS["style.css (Glassmorphism & 60 FPS Engine)"]
        AppJS["app.js (UI Orchestrator & View Model)"]
        StoreJS["store.js (LocalStorage State & PubSub)"]
        APIJS["api.js (REST Fetch Client & Fallback)"]
        
        HTML --- CSS
        HTML --- AppJS
        AppJS <--> StoreJS
        AppJS <--> APIJS
    end

    subgraph TransportLayer ["Network & Protocol Layer"]
        HTTP["HTTP / JSON REST API (Port 8000)"]
        StaticRoute["Static Asset Serving (/static)"]
    end

    subgraph ServerLayer ["Application Backend (FastAPI / Uvicorn)"]
        Router["app.py (FastAPI App & CORS Middleware)"]
        Enricher["movie_enricher.py (Metadata Decorator & SVG Engine)"]
        Recommender["recommender.py (CineMatchRecommender)"]
        
        Router <--> Enricher
        Router <--> Recommender
    end

    subgraph MLLayer ["Machine Learning & Data Modeling"]
        KNN["Scikit-Learn NearestNeighbors (metric='cosine')"]
        Matrix["23-Dimensional Hybrid Feature Matrix"]
        Scalers["MinMaxScaler (Year) & StandardScaler (Ratings)"]
        
        Matrix --> Scalers
        Scalers --> KNN
        KNN --> Recommender
    end

    subgraph DataStorage ["Persistent Data Storage"]
        MoviesCSV[("movies.csv (9,742 records)")]
        RatingsCSV[("ratings.csv (100,836 records)")]
        LocalStore[("Browser LocalStorage (Client State)")]
        
        MoviesCSV --> Matrix
        RatingsCSV --> Matrix
        StoreJS <--> LocalStore
    end

    APIJS <== "Asynchronous JSON" ==> HTTP
    HTTP <--> Router
    HTML <== "Asset Requests" ==> StaticRoute
    StaticRoute <--> Router
```

---

## 2. End-to-End Data Pipeline & Feature Engineering

This diagram depicts how raw CSV files are ingested, transformed, normalized, and indexed into the vector feature space.

```mermaid
flowchart LR
    subgraph Ingestion ["1. Ingestion"]
        M[movies.csv]
        R[ratings.csv]
    end

    subgraph Extraction ["2. Parsing & Cleaning"]
        YRegex["Regex Year Extraction: r'\((\d{4})\)$'"]
        CleanTitles["Normalize Titles (strip trailing ', The')"]
        OneHot["One-Hot Encode Genres (19 columns)"]
        
        M --> YRegex
        M --> CleanTitles
        M --> OneHot
    end

    subgraph Aggregation ["3. Rating Metrics"]
        Group["Group by movieId"]
        MeanRating["avg_rating = mean(rating)"]
        CountRating["rating_count = count(rating)"]
        
        R --> Group
        Group --> MeanRating
        Group --> CountRating
    end

    subgraph Normalization ["4. Feature Scaling"]
        MinMax["MinMaxScaler -> scaled_year"]
        StdScaler["StandardScaler -> scaled_avg_rating, scaled_count"]
        
        YRegex --> MinMax
        MeanRating --> StdScaler
        CountRating --> StdScaler
    end

    subgraph Assembly ["5. Feature Matrix Assembly"]
        Concat["Concatenate: [scaled_year, scaled_avg, scaled_count, 19 genres]"]
        Matrix23["23-Dimensional Matrix (9,742 x 23)"]
        
        MinMax --> Concat
        StdScaler --> Concat
        OneHot --> Concat
        Concat --> Matrix23
    end

    subgraph Fitting ["6. KNN Model Fit"]
        FitModel["NearestNeighbors(n_neighbors=50, metric='cosine').fit()"]
        Matrix23 --> FitModel
    end
```

---

## 3. Hybrid Recommendation Engine Workflow

The following flowchart illustrates the step-by-step logic executed when a user requests recommendations for a film, highlighting the blend between Latent Space Cosine Similarity and Content-Based Jaccard Overlap.

```mermaid
flowchart TD
    Start(["Incoming Recommendation Request (movie, limit, w_genre, w_rating)"])
    
    CheckType{"Is query numeric ID or Title?"}
    Start --> CheckType
    
    CheckType -- "Title String" --> SearchFuzzy["find_movies(query) -> get movieId"]
    CheckType -- "Movie ID" --> DirectLookup["Fetch row index from movie_id_to_idx"]
    SearchFuzzy --> DirectLookup
    
    DirectLookup --> ExtractVector["Extract 23-D row vector: feature_matrix.iloc[idx:idx+1]"]
    ExtractVector --> KNNQuery["knn_model.kneighbors(vector, n_neighbors=limit+15)"]
    
    KNNQuery --> Iterate["Iterate over neighbor indices & raw distances"]
    
    subgraph LoopNeighbors ["Per-Candidate Evaluation"]
        SkipSelf{"Is neighbor the query movie?"}
        SkipSelf -- "Yes" --> Skip["Continue to next"]
        SkipSelf -- "No" --> CalcSim["Cosine Sim: S_cos = 1 - distance"]
        
        CalcSim --> CalcJaccard["Genre Jaccard Index: J = |A ∩ B| / |A ∪ B|"]
        CalcJaccard --> Blend["Blended Score = (w_genre * J) + (w_rating * S_cos)"]
        Blend --> MatchPct["Match % = clip(round(Score * 100), 55, 99)"]
        MatchPct --> BuildReason["Generate Explainable AI Reason String"]
    end
    
    Iterate --> LoopNeighbors
    LoopNeighbors --> Enrich["MovieEnricher: attach poster, backdrop, cast, plot, trailer"]
    Enrich --> Truncate["Slice to requested limit (default 10)"]
    Truncate --> ReturnJSON(["Return JSON Payload to Client"])
```

---

## 4. Component Interaction Diagram (Sequence)

This sequence diagram displays the asynchronous lifecycle of a user searching for a movie, adjusting weights, and playing a trailer.

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Viewer / User
    participant UI as 🖥️ Frontend (app.js / DOM)
    participant Store as 💾 Client Store (store.js)
    participant API as 🌐 API Client (api.js)
    participant Server as ⚙️ FastAPI (app.py)
    participant ML as 🧠 Recommender (recommender.py)

    User->>UI: Types "The Dark Knight" into search bar
    UI->>UI: Debounce timer waits 200ms
    UI->>API: searchMovies({ q: "The Dark Knight", limit: 6 })
    API->>Server: GET /api/movies/search?q=The+Dark+Knight
    Server->>ML: search_advanced(...)
    ML-->>Server: Matched movies list
    Server-->>API: JSON results array
    API-->>UI: Render autocomplete dropdown
    
    User->>UI: Selects "The Dark Knight"
    UI->>API: getMovieDetail(58559)
    API->>Server: GET /api/movies/58559
    Server->>ML: find_movie_by_id(58559) + get_recommendations(58559)
    ML-->>Server: Movie details + 6 similar movies
    Server-->>API: Enriched payload
    API-->>UI: Open Glassmorphic Modal with Poster, Plot & Similar Carousels
    UI->>Store: addRecent(movie)
    
    User->>UI: Clicks "Play Trailer"
    UI->>UI: Mount YouTube iframe with autoplay
    User->>UI: Clicks "Rate 5 Stars"
    UI->>Store: setRating(58559, 5)
    Store-->>UI: Toast: "Rated 5 Stars! Profile updated."
```

---

## 5. User Journey & Discovery Flowchart

This state diagram maps the user experience paths through CineMatch AI.

```mermaid
stateDiagram-v2
    [*] --> SplashScreen: Initial Site Visit
    SplashScreen --> HeroSection: 1.2s Intro Animation Complete
    
    state DiscoveryHub {
        HeroSection --> BrowseCarousels: Scroll Down
        BrowseCarousels --> MoodStations: Filter by Energy/Vibe
        BrowseCarousels --> PersonalizedRow: View "Top Picks For You"
        BrowseCarousels --> TrendingRow: View Bayesian Leaders
    }

    state SearchExperience {
        HeroSection --> InstantSearch: Press '/' or Click Search
        InstantSearch --> Autocomplete: Type Query
        InstantSearch --> MultiFilter: Apply Year / Genre / Rating Filters
    }

    state InteractiveTuner {
        BrowseCarousels --> AIControlPanel: Scroll to AI Tuner
        AIControlPanel --> AdjustSliders: Set Content vs. Collaborative Weights
        AdjustSliders --> LiveKNNRecalculation: Hit 'Calculate Hybrid Recommendations'
    }

    state DecisionModal {
        Autocomplete --> MovieDetailModal: Click Title
        BrowseCarousels --> MovieDetailModal: Click Card
        MultiFilter --> MovieDetailModal: Click Card
        
        MovieDetailModal --> WatchTrailer: Click 'Play Trailer'
        MovieDetailModal --> ToggleFavorite: Click Heart (Save to Store)
        MovieDetailModal --> StarRating: Submit 1-5 Star Score
        MovieDetailModal --> ExploreSimilar: Click Similar Movie Card
    }

    DecisionModal --> DiscoveryHub: Close Modal
```

---

## 6. Security & Data Protection Architecture

```mermaid
flowchart TD
    ClientReq["Client Request"] --> RateLimit["Query Upper Bounds Validation (limit <= 30)"]
    RateLimit --> Sanitize["Regex & Special Character Escaping (XSS Prevention)"]
    Sanitize --> MemoryIndex["In-Memory Vector Search (Zero SQL Injection Risk)"]
    MemoryIndex --> ResponseEnc["JSON Response (Encrypted over HTTPS in prod)"]
    ResponseEnc --> ClientBrowser["Rendered in Browser Sandbox"]
    
    subgraph ClientSideProtection ["Client-Side Data Isolation"]
        LocalData["Favorites, Watchlist, Ratings in LocalStorage"]
        NoCookies["Zero Tracking Cookies or Central Profile Storage"]
    end
    
    ClientBrowser --- ClientSideProtection
```
