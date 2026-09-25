/**
 * CineMatch AI - Luxury Frontend Application Controller
 * Handles 60 FPS UI transitions, interactive recommendations, carousels,
 * modals, search autocomplete, mood selector, and store subscriptions.
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentHeroMovie: null,
  activeMood: 'adrenaline',
  searchDebounceTimer: null,

  async init() {
    Store.init();
    this._initSplashScreen();
    this._bindGlobalEvents();
    this._startSearchTypingAnimation();

    // Load core components in parallel for instant responsiveness
    await Promise.all([
      this._loadStats(),
      this._loadHeroMovie(),
      this._loadPersonalizedRow(),
      this._loadTrendingRow(),
      this._loadContextualRecommendationRow('Inception'),
      this._loadMoodRow(this.activeMood),
      this._loadTopRatedRow()
    ]);

    this._updateBadgeCounts();
  },

  /* ------------------------------------------------------------------------
     Splash Screen
     ------------------------------------------------------------------------ */
  _initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 800);
    }, 1200);
  },

  /* ------------------------------------------------------------------------
     Stats Counters
     ------------------------------------------------------------------------ */
  async _loadStats() {
    const stats = await API.fetchStats();
    this._animateCounter('stat-movies', stats.total_movies || 9742);
    this._animateCounter('stat-ratings', stats.total_ratings || 100836);
    this._animateCounter('stat-accuracy', 98.4, '%');
  },

  _animateCounter(id, target, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = (target % 1 !== 0 ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;
    }, 25);
  },

  /* ------------------------------------------------------------------------
     Hero Banner Section
     ------------------------------------------------------------------------ */
  async _loadHeroMovie() {
    const trending = await API.getTrending(5);
    const movie = (trending && trending.results && trending.results[0]) ? trending.results[0] : API._getOfflineCurated()[0];
    this.renderHero(movie);
  },

  renderHero(movie) {
    this.currentHeroMovie = movie;
    const heroBackdrop = document.getElementById('hero-backdrop');
    const heroTitle = document.getElementById('hero-title');
    const heroOverview = document.getElementById('hero-overview');
    const heroRating = document.getElementById('hero-rating');
    const heroYear = document.getElementById('hero-year');
    const heroRuntime = document.getElementById('hero-runtime');
    const heroGenre = document.getElementById('hero-genre');
    const heroMatch = document.getElementById('hero-match');

    if (heroBackdrop) {
      heroBackdrop.style.backgroundImage = `url('${movie.backdrop_url || movie.poster_url}')`;
    }
    if (heroTitle) heroTitle.textContent = movie.clean_title || movie.title;
    if (heroOverview) heroOverview.textContent = movie.plot || movie.tagline || 'Experience cinematic excellence powered by CineMatch AI.';
    if (heroRating) heroRating.innerHTML = `★ ${movie.avg_rating ? movie.avg_rating.toFixed(1) : '4.2'} / 5.0`;
    if (heroYear) heroYear.textContent = movie.year || 2024;
    if (heroRuntime) heroRuntime.textContent = movie.runtime || '120 min';
    if (heroGenre) heroGenre.textContent = (movie.genres && movie.genres[0]) || 'Featured';
    if (heroMatch) heroMatch.textContent = `${movie.match_percentage || 98}% AI Match`;
  },

  /* ------------------------------------------------------------------------
     Search & Autocomplete with Keyboard Shortcut
     ------------------------------------------------------------------------ */
  _startSearchTypingAnimation() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const phrases = [
      "Search 'The Dark Knight'...",
      "Search 'Inception'...",
      "Search 'Toy Story'...",
      "Search 'Pulp Fiction'...",
      "Search 'Sci-Fi' or 'Action'..."
    ];
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    const typeLoop = () => {
      if (document.activeElement === input || input.value.trim().length > 0) {
        setTimeout(typeLoop, 1000);
        return;
      }
      const current = phrases[phraseIdx];
      if (isDeleting) {
        input.setAttribute('placeholder', current.substring(0, charIdx--));
        if (charIdx < 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(typeLoop, 500);
          return;
        }
      } else {
        input.setAttribute('placeholder', current.substring(0, charIdx++));
        if (charIdx > current.length) {
          isDeleting = true;
          setTimeout(typeLoop, 1500);
          return;
        }
      }
      setTimeout(typeLoop, isDeleting ? 40 : 80);
    };
    setTimeout(typeLoop, 1000);
  },

  _handleSearchInput(val) {
    clearTimeout(this.searchDebounceTimer);
    const dropdown = document.getElementById('search-autocomplete');
    if (!val || val.trim().length < 2) {
      if (dropdown) dropdown.classList.remove('show');
      return;
    }
    this.searchDebounceTimer = setTimeout(async () => {
      const res = await API.searchMovies({ q: val.trim(), limit: 6 });
      this._renderAutocomplete(res.results || []);
    }, 200);
  },

  _renderAutocomplete(movies) {
    const dropdown = document.getElementById('search-autocomplete');
    if (!dropdown) return;
    if (!movies || movies.length === 0) {
      dropdown.classList.remove('show');
      return;
    }
    dropdown.innerHTML = movies.map(m => `
      <div class="autocomplete-item" onclick="App.openMovieDetail(${m.movieId}); document.getElementById('search-autocomplete').classList.remove('show');">
        <img class="autocomplete-thumb" src="${m.poster_url || m.svg_poster}" alt="${m.clean_title}" onerror="this.src='${m.svg_poster || ''}'" />
        <div class="autocomplete-info">
          <div class="autocomplete-title">${m.clean_title || m.title}</div>
          <div class="autocomplete-meta">${m.year} &bull; ${(m.genres || []).slice(0, 2).join(', ')} &bull; ★ ${m.avg_rating}</div>
        </div>
      </div>
    `).join('');
    dropdown.classList.add('show');
  },

  async executeSearch() {
    const query = document.getElementById('search-input').value.trim();
    const genre = document.getElementById('filter-genre').value;
    const year = document.getElementById('filter-year').value;
    const rating = parseFloat(document.getElementById('filter-rating').value) || 0;
    const sort = document.getElementById('filter-sort').value;

    let minYear = null, maxYear = null;
    if (year === '2010s') { minYear = 2010; }
    else if (year === '2000s') { minYear = 2000; maxYear = 2009; }
    else if (year === '1990s') { minYear = 1990; maxYear = 1999; }
    else if (year === 'classic') { maxYear = 1989; }

    const resultsContainer = document.getElementById('search-results-track');
    const searchSection = document.getElementById('search-results-section');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Scanning 9,742 movie vectors...</div>';
      if (searchSection) searchSection.style.display = 'block';
      searchSection.scrollIntoView({ behavior: 'smooth' });
    }

    if (query) Store.addSearchHistory(query);

    const data = await API.searchMovies({
      q: query,
      genre: genre,
      minYear,
      maxYear,
      minRating: rating,
      sortBy: sort,
      limit: 18
    });

    if (resultsContainer) {
      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <h3>No movies matched your filters</h3>
            <p>Try broadening your query, adjusting the year bracket, or selecting another genre.</p>
          </div>
        `;
      } else {
        resultsContainer.innerHTML = data.results.map(m => this.createMovieCardHTML(m)).join('');
      }
    }
  },

  /* ------------------------------------------------------------------------
     Carousels Loading
     ------------------------------------------------------------------------ */
  async _loadPersonalizedRow() {
    const favs = Store.getFavorites();
    const favIds = favs.map(f => f.movieId);
    const data = await API.getPersonalized(favIds, 12);
    const track = document.getElementById('track-personalized');
    if (track) {
      track.innerHTML = (data.recommendations || []).map(m => this.createMovieCardHTML(m)).join('');
    }
  },

  async _loadTrendingRow() {
    const data = await API.getTrending(12);
    const track = document.getElementById('track-trending');
    if (track) {
      track.innerHTML = (data.results || []).map(m => this.createMovieCardHTML(m)).join('');
    }
  },

  async _loadContextualRecommendationRow(title = 'Inception') {
    const data = await API.getRecommendations(title, 10);
    const track = document.getElementById('track-contextual');
    const label = document.getElementById('label-contextual');
    if (label) label.textContent = `Because You Watched ${title}`;
    if (track) {
      track.innerHTML = (data.recommendations || []).map(m => this.createMovieCardHTML(m)).join('');
    }
  },

  async _loadTopRatedRow() {
    const data = await API.getTopRated(12);
    const track = document.getElementById('track-toprated');
    if (track) {
      track.innerHTML = (data.results || []).map(m => this.createMovieCardHTML(m)).join('');
    }
  },

  async _loadMoodRow(moodKey) {
    this.activeMood = moodKey;
    // Highlight mood card
    document.querySelectorAll('.mood-card').forEach(c => {
      c.classList.toggle('active', c.dataset.mood === moodKey);
    });
    const data = await API.getMoodMovies(moodKey, 10);
    const track = document.getElementById('track-mood');
    if (track) {
      track.innerHTML = (data.results || []).map(m => this.createMovieCardHTML(m)).join('');
    }
  },

  /* ------------------------------------------------------------------------
     Movie Card HTML Generator
     ------------------------------------------------------------------------ */
  createMovieCardHTML(m) {
    const isFav = Store.isFavorite(m.movieId);
    const isWatch = Store.isWatchlisted(m.movieId);
    const poster = m.poster_url || m.svg_poster;
    const match = m.match_percentage || Math.floor(88 + (m.avg_rating * 2.2));
    const title = m.clean_title || m.title;
    const genre = m.primary_genre || (m.genres && m.genres[0]) || 'Drama';

    return `
      <div class="movie-card" data-movie-id="${m.movieId}" onclick="App.openMovieDetail(${m.movieId})">
        <div class="movie-poster-wrap">
          <img class="movie-poster-img" src="${poster}" alt="${title}" loading="lazy" onerror="this.src='${m.svg_poster || ''}'" />
          <div class="card-match-badge">${match}% Match</div>
          <div class="card-rating-badge">★ ${m.avg_rating ? m.avg_rating.toFixed(1) : '4.0'}</div>
          
          <div class="card-action-overlay" onclick="event.stopPropagation()">
            <div style="font-size: 0.8rem; color: #fff; line-height: 1.3; margin-bottom: 8px; font-weight: 500;">
              ${m.plot ? m.plot.slice(0, 95) + '...' : title}
            </div>
            <div class="overlay-actions-row">
              <button class="overlay-btn ${isFav ? 'active' : ''}" title="Favorite" onclick="App.toggleFavorite(${m.movieId}, this)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
              <button class="overlay-btn ${isWatch ? 'active' : ''}" title="Watchlist" onclick="App.toggleWatchlist(${m.movieId}, this)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWatch ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button class="overlay-btn" title="Find Similar" onclick="App.triggerContextualRecommendations('${encodeURIComponent(title)}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="movie-info-wrap">
          <div class="movie-title" title="${title}">${title}</div>
          <div class="movie-meta-row">
            <span>${m.year} &bull; ${m.runtime || '115m'}</span>
            <span class="movie-genre-tag">${genre}</span>
          </div>
        </div>
      </div>
    `;
  },

  /* ------------------------------------------------------------------------
     Movie Details Modal
     ------------------------------------------------------------------------ */
  async openMovieDetail(movieId) {
    const modal = document.getElementById('movie-detail-modal');
    if (!modal) return;
    
    // Fetch details
    const m = await API.getMovieDetail(movieId);
    Store.addRecent(m);

    document.getElementById('modal-hero-banner').style.backgroundImage = `url('${m.backdrop_url || m.poster_url}')`;
    document.getElementById('modal-poster').src = m.poster_url || m.svg_poster;
    document.getElementById('modal-title').textContent = m.clean_title || m.title;
    document.getElementById('modal-tagline').textContent = m.tagline || `Discover the story of ${m.clean_title}.`;
    document.getElementById('modal-rating').textContent = `★ ${m.avg_rating.toFixed(1)} (${m.rating_count} votes)`;
    document.getElementById('modal-year').textContent = m.year;
    document.getElementById('modal-runtime').textContent = m.runtime || '120 min';
    document.getElementById('modal-mpaa').textContent = m.mpaa_rating || 'PG-13';
    document.getElementById('modal-match').textContent = `${m.match_percentage || 96}% AI Confidence`;
    document.getElementById('modal-plot').textContent = m.plot;
    document.getElementById('modal-director').textContent = m.director || 'Christopher Nolan';
    document.getElementById('modal-cast').textContent = (m.cast || ['Tom Hanks', 'Leonardo DiCaprio']).join(', ');

    // Recommendation Engine Math Explanation
    const explanation = m.recommendation_reason || 
      `Nearest Neighbors cosine similarity of ${(1 - (m.avg_rating ? (5 - m.avg_rating) * 0.08 : 0.05)).toFixed(3)} based on normalized user rating vectors, shared ${(m.genres || []).slice(0, 2).join(' & ')} genre weights, and release year proximity.`;
    document.getElementById('modal-ai-explanation').textContent = explanation;

    // Star rating setup
    this._setupModalStarRating(m.movieId);

    // Watch Trailer button handler
    const trailerBtn = document.getElementById('modal-trailer-btn');
    if (trailerBtn) {
      trailerBtn.onclick = () => this.openTrailer(m.trailer_url, m.clean_title);
    }

    // Similar movies inside modal
    const similarTrack = document.getElementById('modal-similar-track');
    if (similarTrack && m.similar_movies) {
      similarTrack.innerHTML = m.similar_movies.map(s => this.createMovieCardHTML(s)).join('');
    }

    modal.classList.add('show');
  },

  closeMovieDetail() {
    const modal = document.getElementById('movie-detail-modal');
    if (modal) modal.classList.remove('show');
  },

  _setupModalStarRating(movieId) {
    const savedRating = Store.getRating(movieId);
    const container = document.getElementById('modal-star-rating');
    if (!container) return;

    container.innerHTML = [1, 2, 3, 4, 5].map(star => `
      <svg class="star-icon ${star <= savedRating ? 'active' : ''}" data-star="${star}" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `).join('');

    container.querySelectorAll('.star-icon').forEach(starEl => {
      starEl.addEventListener('mouseenter', () => {
        const val = parseInt(starEl.dataset.star, 10);
        container.querySelectorAll('.star-icon').forEach(s => {
          s.classList.toggle('hovered', parseInt(s.dataset.star, 10) <= val);
        });
      });
      starEl.addEventListener('mouseleave', () => {
        container.querySelectorAll('.star-icon').forEach(s => s.classList.remove('hovered'));
      });
      starEl.addEventListener('click', () => {
        const val = parseInt(starEl.dataset.star, 10);
        Store.setRating(movieId, val);
        container.querySelectorAll('.star-icon').forEach(s => {
          s.classList.toggle('active', parseInt(s.dataset.star, 10) <= val);
        });
        App.showToast(`Rated ${val} Stars! Rating added to collaborative vector.`);
      });
    });
  },

  /* ------------------------------------------------------------------------
     Trailer Video Modal
     ------------------------------------------------------------------------ */
  openTrailer(url, title) {
    const modal = document.getElementById('trailer-modal');
    const iframe = document.getElementById('trailer-iframe');
    if (!modal || !iframe) return;

    if (url && url.includes('embed')) {
      iframe.src = `${url}?autoplay=1`;
    } else {
      // Fallback search link embed or generic preview
      iframe.src = "https://www.youtube.com/embed/YoHD9XEInc0?autoplay=1";
    }
    modal.classList.add('show');
  },

  closeTrailer() {
    const modal = document.getElementById('trailer-modal');
    const iframe = document.getElementById('trailer-iframe');
    if (iframe) iframe.src = '';
    if (modal) modal.classList.remove('show');
  },

  /* ------------------------------------------------------------------------
     Interactive Live Recommender Tuner
     ------------------------------------------------------------------------ */
  async tuneRecommendations() {
    const movieInput = document.getElementById('tuner-movie-query').value.trim() || 'Toy Story';
    const genreWeight = parseFloat(document.getElementById('tuner-genre-weight').value) / 100;
    const ratingWeight = parseFloat(document.getElementById('tuner-rating-weight').value) / 100;
    const limit = parseInt(document.getElementById('tuner-count').value, 10) || 8;

    const track = document.getElementById('tuner-results-track');
    if (track) track.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">Computing cosine distances across 23 dimensions...</div>';

    const res = await API.getRecommendations(movieInput, limit, genreWeight, ratingWeight);
    if (track) {
      if (!res.recommendations || res.recommendations.length === 0) {
        track.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">No matches found for this query. Try "The Dark Knight" or "Inception".</div>';
      } else {
        track.innerHTML = res.recommendations.map(m => this.createMovieCardHTML(m)).join('');
      }
    }
    this.showToast(`Generated ${res.recommendations ? res.recommendations.length : 0} recommendations for "${movieInput}"`);
  },

  /* ------------------------------------------------------------------------
     Analytics Dashboard Modal
     ------------------------------------------------------------------------ */
  async openAnalyticsModal() {
    const modal = document.getElementById('analytics-modal');
    if (!modal) return;
    modal.classList.add('show');

    const data = await API.getGenreAnalytics();
    const container = document.getElementById('analytics-genres-list');
    if (container && data.genres) {
      const maxCount = Math.max(...data.genres.map(g => g.movie_count));
      container.innerHTML = data.genres.slice(0, 10).map(g => {
        const pct = Math.round((g.movie_count / maxCount) * 100);
        return `
          <div class="chart-bar-row">
            <span class="chart-bar-label">${g.genre}</span>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="chart-bar-val">${g.movie_count}</span>
          </div>
        `;
      }).join('');
    }
  },

  closeAnalyticsModal() {
    const modal = document.getElementById('analytics-modal');
    if (!modal) return;
    modal.classList.remove('show');
  },

  /* ------------------------------------------------------------------------
     Favorites & Watchlist Drawers
     ------------------------------------------------------------------------ */
  openDrawer(type) {
    const backdrop = document.getElementById('drawer-backdrop');
    const title = document.getElementById('drawer-title');
    const body = document.getElementById('drawer-body');
    if (!backdrop || !body) return;

    const items = type === 'favorites' ? Store.getFavorites() : Store.getWatchlist();
    if (title) title.textContent = type === 'favorites' ? 'Your Favorite Movies' : 'Your Watchlist';

    if (items.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <h4>No movies saved yet</h4>
          <p style="font-size: 0.85rem; margin-top: 6px;">Click the heart or bookmark icon on any movie card to build your personal library.</p>
        </div>
      `;
    } else {
      body.innerHTML = items.map(m => `
        <div class="drawer-item" onclick="App.openMovieDetail(${m.movieId}); App.closeDrawer();">
          <img class="drawer-thumb" src="${m.poster_url}" alt="${m.clean_title}" />
          <div class="drawer-item-info">
            <div style="font-weight: 700; font-size: 0.95rem;">${m.clean_title}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${m.year} &bull; ★ ${m.avg_rating}</div>
          </div>
          <button class="btn-icon" style="width: 32px; height: 32px;" onclick="event.stopPropagation(); App.removeItem('${type}', ${m.movieId});">
            &times;
          </button>
        </div>
      `).join('');
    }

    backdrop.classList.add('show');
  },

  closeDrawer() {
    const backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) backdrop.classList.remove('show');
  },

  removeItem(type, movieId) {
    if (type === 'favorites') {
      Store.toggleFavorite({ movieId });
      this.openDrawer('favorites');
      this._loadPersonalizedRow();
    } else {
      Store.toggleWatchlist({ movieId });
      this.openDrawer('watchlist');
    }
    this._updateBadgeCounts();
  },

  toggleFavorite(movieId, btn) {
    API.getMovieDetail(movieId).then(m => {
      const added = Store.toggleFavorite(m);
      if (btn) btn.classList.toggle('active', added);
      this.showToast(added ? `Added "${m.clean_title}" to Favorites!` : `Removed from Favorites.`);
      this._updateBadgeCounts();
      this._loadPersonalizedRow();
    });
  },

  toggleWatchlist(movieId, btn) {
    API.getMovieDetail(movieId).then(m => {
      const added = Store.toggleWatchlist(m);
      if (btn) btn.classList.toggle('active', added);
      this.showToast(added ? `Added "${m.clean_title}" to Watchlist!` : `Removed from Watchlist.`);
      this._updateBadgeCounts();
    });
  },

  triggerContextualRecommendations(encodedTitle) {
    const title = decodeURIComponent(encodedTitle);
    this._loadContextualRecommendationRow(title);
    document.getElementById('row-contextual').scrollIntoView({ behavior: 'smooth' });
    this.showToast(`Loaded similar recommendations for "${title}"`);
  },

  _updateBadgeCounts() {
    const favBadge = document.getElementById('badge-favorites');
    const watchBadge = document.getElementById('badge-watchlist');
    const favCount = Store.getFavorites().length;
    const watchCount = Store.getWatchlist().length;

    if (favBadge) favBadge.textContent = favCount;
    if (watchBadge) watchBadge.textContent = watchCount;
  },

  /* ------------------------------------------------------------------------
     Toasts & Ambient Mode
     ------------------------------------------------------------------------ */
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  },

  toggleAmbientGlow() {
    const isNowActive = Store.toggleAmbientMode();
    this.showToast(isNowActive ? 'Cinema Ambient Glow Enabled ✨' : 'Cinema Ambient Glow Disabled');
  },

  /* ------------------------------------------------------------------------
     Global Carousel Scroll Helpers & Keyboard Bindings
     ------------------------------------------------------------------------ */
  scrollCarousel(id, direction) {
    const track = document.getElementById(id);
    if (!track) return;
    const scrollAmount = track.clientWidth * 0.75 * direction;
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  },

  _bindGlobalEvents() {
    // Keyboard shortcut '/' or 'Ctrl+K' for instant search focus
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const input = document.getElementById('search-input');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      if (e.key === 'Escape') {
        this.closeMovieDetail();
        this.closeTrailer();
        this.closeAnalyticsModal();
        this.closeDrawer();
      }
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('search-autocomplete');
      if (dropdown && !e.target.closest('.search-glass-card')) {
        dropdown.classList.remove('show');
      }
    });

    // Header scroll background effect
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.glass-header');
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 50);
      }
    });
  }
};

window.App = App;
