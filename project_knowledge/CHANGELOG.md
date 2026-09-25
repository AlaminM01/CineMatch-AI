# 📝 CineMatch AI — Changelog

All notable changes, architectural overhauls, algorithmic enhancements, and UI redesigns for **CineMatch AI** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-09-25
### 🚀 Major Architectural Transformation: Production Luxury Streaming Platform

This milestone release transforms the legacy prototype notebook into an enterprise-grade, portfolio-ready streaming application with full-stack decoupled architecture.

### ✨ Added (Features)
- **FastAPI Asynchronous Backend Engine (`backend/app.py`)**:
  - Implemented 11 production REST endpoints for health checks, system metrics, advanced multi-filter search, hybrid recommendations, personalized user aggregation, trending lists, and mood categorizations.
  - Native CORS middleware, Pydantic request validation, and static asset serving for seamless browser integration.
- **Explainable AI (XAI) System**:
  - Added dynamic AI Match Percentage badges (`55%` - `99%`).
  - Added contextual mathematical rationale generator explaining cosine distance, shared genre traits, and collaborative rating signals.
- **Interactive AI Recommendation Tuner**:
  - Added live frontend sliders allowing real-time tuning of Content/Genre Weight vs. Collaborative/Rating Weight.
- **Curated Mood-Based Recommendation Stations**:
  - Implemented 6 distinct psychological mood stations: *Adrenaline Rush*, *Mind Bending*, *Feel Good*, *Dark & Gritty*, *Heartfelt*, *Cosmic Wonder*.
- **Interactive Movie Detail Modal**:
  - Added high-resolution backdrop banner, poster, storyline synopsis, director and cast listings, runtime, and age ratings.
  - Built-in interactive 1–5 star user rating widget with persistent state.
- **Embedded YouTube Video Trailer Player**:
  - Added dedicated video player modal supporting HD trailer playback with automatic audio silencing on modal close.
- **Procedural SVG Fallback Generator (`backend/movie_enricher.py`)**:
  - Procedurally constructs stylized, high-contrast cinema posters in SVG vector format as Data URIs for offline resilience and zero broken images.
- **Client Persistence Store (`frontend/js/store.js`)**:
  - Implemented LocalStorage pub/sub store managing Favorites, Watchlist, Recently Viewed, Custom Star Ratings, Search History, and Ambient Glow settings.
- **Genre Analytics Dashboard**:
  - Added real-time visual charts displaying catalog density across 19 genres, average ratings, and machine learning hyperparameters.
- **Comprehensive Project Knowledge Base (`/project_knowledge/`)**:
  - Added 8 dedicated files including high-level overview, AI system context, 110-question Q&A repository, Mermaid architecture diagrams, and quick-start guides.

### 🎨 Changed & Redesigned (UI/UX)
- **Glassmorphism Design System (`frontend/css/style.css`)**:
  - Frosted glass cards with `rgba(255, 255, 255, 0.06)`, `backdrop-filter: blur(20px)`, and subtle borders.
  - Netflix Crimson Red (`#E50914`), Electric Cyan (`#00D4FF`), and Cyber Gold (`#FFD700`) accent system.
  - Dark cinematic background gradients (`#08080C` to `#141419`).
- **60 FPS Hardware-Accelerated Micro-Interactions**:
  - Fluid card hover lift (`translateY(-8px) scale(1.03)`), elevation drop-shadow bloom, and quick-action overlays.
- **Netflix-Style Animated Splash Screen**:
  - Added 1.2-second startup animation with glowing cinema reel logo, progress indicator, and smooth opacity fade-out.
- **Smart Search Experience**:
  - Added animated typewriter placeholder cycling through popular queries.
  - Added real-time debounced autocomplete suggestion dropdown.
  - Added global keyboard shortcut: press `/` or `Ctrl+K` to immediately focus search.
- **Horizontal Carousels with Touch/Scroll Stepping**:
  - Implemented smooth left/right arrow navigation for all movie rows.

### 🔧 Fixed & Optimized
- **Pandas 2.2+ / Python 3.14 Compatibility**:
  - Resolved `TypeError: Cannot perform reduction 'median' with string dtype` by explicitly casting regex-extracted release years using `pd.to_numeric(..., errors='coerce')`.
  - Replaced deprecated `inplace=True` operations with safe series assignments.
- **Sub-3ms Inference Optimization**:
  - Cached the fitted `NearestNeighbors` model in memory for instant sub-millisecond query execution.
- **Event Propagation Protection**:
  - Wrapped card hover quick-action buttons in `event.stopPropagation()` to prevent modal collision bugs.

---

## [1.0.0] - 2025-01-30
### Initial Academic Prototype
- Created initial exploratory Jupyter Notebook `movie_recommendation.ipynb`.
- Loaded `movies.csv` and `ratings.csv`.
- Extracted release year using regex.
- Constructed sparse user-item matrix using `scipy.sparse.csr_matrix`.
- Fitted Scikit-Learn `NearestNeighbors` model using cosine metric.
- Evaluated basic command-line recommendations for *"Toy Story"*.
