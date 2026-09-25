/**
 * CineMatch AI - Local Client Storage & State Store
 * Manages client persistence: Favorites, Watchlist, Ratings, History, Ambient Mode.
 */

const Store = {
  // Storage Keys
  KEYS: {
    FAVORITES: 'cinematch_favorites',
    WATCHLIST: 'cinematch_watchlist',
    RECENT: 'cinematch_recent',
    RATINGS: 'cinematch_ratings',
    HISTORY: 'cinematch_history',
    AMBIENT: 'cinematch_ambient'
  },

  // Event callbacks
  listeners: {},

  init() {
    this._ensureDefaults();
    this.applyAmbientMode();
  },

  _ensureDefaults() {
    if (!localStorage.getItem(this.KEYS.FAVORITES)) {
      // Pre-populate with iconic starter favorites for instant personalized recs demo
      const starters = [
        { movieId: 1, title: 'Toy Story (1995)', clean_title: 'Toy Story', year: 1995, genres: ['Adventure', 'Animation', 'Children'], avg_rating: 3.9, poster_url: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg' },
        { movieId: 296, title: 'Pulp Fiction (1994)', clean_title: 'Pulp Fiction', year: 1994, genres: ['Comedy', 'Crime', 'Drama'], avg_rating: 4.2, poster_url: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' }
      ];
      localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(starters));
    }
    if (!localStorage.getItem(this.KEYS.WATCHLIST)) {
      localStorage.setItem(this.KEYS.WATCHLIST, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.RECENT)) {
      localStorage.setItem(this.KEYS.RECENT, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.RATINGS)) {
      localStorage.setItem(this.KEYS.RATINGS, JSON.stringify({}));
    }
    if (!localStorage.getItem(this.KEYS.HISTORY)) {
      localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(['Inception', 'Sci-Fi', 'Christopher Nolan']));
    }
  },

  getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.FAVORITES)) || [];
    } catch {
      return [];
    }
  },

  isFavorite(movieId) {
    return this.getFavorites().some(m => m.movieId === movieId);
  },

  toggleFavorite(movie) {
    let favs = this.getFavorites();
    const exists = favs.some(m => m.movieId === movie.movieId);
    if (exists) {
      favs = favs.filter(m => m.movieId !== movie.movieId);
    } else {
      favs.unshift({
        movieId: movie.movieId,
        title: movie.title,
        clean_title: movie.clean_title || movie.title,
        year: movie.year,
        genres: movie.genres || [],
        avg_rating: movie.avg_rating,
        poster_url: movie.poster_url || movie.svg_poster
      });
    }
    localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favs));
    this.emit('favoritesChanged', favs);
    return !exists;
  },

  getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.WATCHLIST)) || [];
    } catch {
      return [];
    }
  },

  isWatchlisted(movieId) {
    return this.getWatchlist().some(m => m.movieId === movieId);
  },

  toggleWatchlist(movie) {
    let list = this.getWatchlist();
    const exists = list.some(m => m.movieId === movie.movieId);
    if (exists) {
      list = list.filter(m => m.movieId !== movie.movieId);
    } else {
      list.unshift({
        movieId: movie.movieId,
        title: movie.title,
        clean_title: movie.clean_title || movie.title,
        year: movie.year,
        genres: movie.genres || [],
        avg_rating: movie.avg_rating,
        poster_url: movie.poster_url || movie.svg_poster
      });
    }
    localStorage.setItem(this.KEYS.WATCHLIST, JSON.stringify(list));
    this.emit('watchlistChanged', list);
    return !exists;
  },

  addRecent(movie) {
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem(this.KEYS.RECENT)) || [];
    } catch {}
    recent = recent.filter(m => m.movieId !== movie.movieId);
    recent.unshift({
      movieId: movie.movieId,
      title: movie.title,
      clean_title: movie.clean_title || movie.title,
      year: movie.year,
      poster_url: movie.poster_url || movie.svg_poster,
      avg_rating: movie.avg_rating
    });
    recent = recent.slice(0, 15);
    localStorage.setItem(this.KEYS.RECENT, JSON.stringify(recent));
    this.emit('recentChanged', recent);
  },

  getRecent() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.RECENT)) || [];
    } catch {
      return [];
    }
  },

  setRating(movieId, rating) {
    let ratings = {};
    try {
      ratings = JSON.parse(localStorage.getItem(this.KEYS.RATINGS)) || {};
    } catch {}
    ratings[movieId] = rating;
    localStorage.setItem(this.KEYS.RATINGS, JSON.stringify(ratings));
    this.emit('ratingChanged', { movieId, rating });
  },

  getRating(movieId) {
    try {
      const ratings = JSON.parse(localStorage.getItem(this.KEYS.RATINGS)) || {};
      return ratings[movieId] || 0;
    } catch {
      return 0;
    }
  },

  addSearchHistory(term) {
    if (!term || !term.trim()) return;
    term = term.trim();
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY)) || [];
    } catch {}
    history = history.filter(h => h.toLowerCase() !== term.toLowerCase());
    history.unshift(term);
    history = history.slice(0, 8);
    localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
    this.emit('historyChanged', history);
  },

  getSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.HISTORY)) || [];
    } catch {
      return [];
    }
  },

  toggleAmbientMode() {
    const isAmbient = localStorage.getItem(this.KEYS.AMBIENT) === 'true';
    const newState = !isAmbient;
    localStorage.setItem(this.KEYS.AMBIENT, String(newState));
    this.applyAmbientMode();
    return newState;
  },

  applyAmbientMode() {
    const isAmbient = localStorage.getItem(this.KEYS.AMBIENT) === 'true';
    if (isAmbient) {
      document.body.classList.add('cinema-ambient-mode');
    } else {
      document.body.classList.remove('cinema-ambient-mode');
    }
  },

  // Event Pub/Sub
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
};

window.Store = Store;
