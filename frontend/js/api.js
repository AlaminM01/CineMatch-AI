/**
 * CineMatch AI - REST API Client & Offline Fallback Provider
 * Seamlessly interfaces with the FastAPI backend.
 * Provides resilient offline fallback if loaded via static file protocol.
 */

const API_BASE = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:8000';

const API = {
  async fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        total_movies: 9742,
        total_ratings: 100836,
        total_users: 610,
        model_type: 'NearestNeighbors (Hybrid Collaborative + Content)',
        distance_metric: 'cosine',
        recommendation_latency_ms: '< 3ms'
      };
    }
  },

  async searchMovies({ q = '', genre = '', minYear, maxYear, minRating, sortBy = 'popularity', limit = 24, offset = 0 } = {}) {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (genre && genre !== 'All') params.set('genre', genre);
      if (minYear) params.set('min_year', minYear);
      if (maxYear) params.set('max_year', maxYear);
      if (minRating) params.set('min_rating', minRating);
      if (sortBy) params.set('sort_by', sortBy);
      params.set('limit', limit);
      params.set('offset', offset);

      const res = await fetch(`${API_BASE}/api/movies/search?${params.toString()}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (err) {
      console.warn('[API] Server unreachable, using local fallback results', err);
      return { results: this._getOfflineCurated(), total: 10, limit, offset };
    }
  },

  async getRecommendations(movie, limit = 10, genreWeight = 0.4, ratingWeight = 0.6) {
    try {
      const params = new URLSearchParams({
        movie: movie,
        limit: limit,
        genre_weight: genreWeight,
        rating_weight: ratingWeight
      });
      const res = await fetch(`${API_BASE}/api/movies/recommend?${params.toString()}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        query: movie,
        count: 5,
        recommendations: this._getOfflineCurated().slice(0, limit)
      };
    }
  },

  async getPersonalized(favoriteIds, limit = 12) {
    try {
      const res = await fetch(`${API_BASE}/api/movies/recommend/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_ids: favoriteIds, limit })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { recommendations: this._getOfflineCurated().slice(0, limit) };
    }
  },

  async getTrending(limit = 15) {
    try {
      const res = await fetch(`${API_BASE}/api/movies/trending?limit=${limit}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { results: this._getOfflineCurated() };
    }
  },

  async getTopRated(limit = 15) {
    try {
      const res = await fetch(`${API_BASE}/api/movies/top-rated?limit=${limit}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { results: this._getOfflineCurated() };
    }
  },

  async getMoodMovies(mood = 'adrenaline', limit = 12) {
    try {
      const res = await fetch(`${API_BASE}/api/movies/moods?mood=${mood}&limit=${limit}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { mood, results: this._getOfflineCurated().slice(0, limit) };
    }
  },

  async getMovieDetail(movieId) {
    try {
      const res = await fetch(`${API_BASE}/api/movies/${movieId}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const found = this._getOfflineCurated().find(m => m.movieId === movieId);
      return found || this._getOfflineCurated()[0];
    }
  },

  async getGenreAnalytics() {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/genres`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        genres: [
          { genre: 'Drama', movie_count: 4361, avg_rating: 3.66 },
          { genre: 'Comedy', movie_count: 3756, avg_rating: 3.38 },
          { genre: 'Action', movie_count: 1828, avg_rating: 3.45 },
          { genre: 'Thriller', movie_count: 1894, avg_rating: 3.49 },
          { genre: 'Adventure', movie_count: 1263, avg_rating: 3.51 },
          { genre: 'Romance', movie_count: 1596, avg_rating: 3.51 },
          { genre: 'Sci-Fi', movie_count: 980, avg_rating: 3.46 },
          { genre: 'Crime', movie_count: 1199, avg_rating: 3.66 },
          { genre: 'Animation', movie_count: 611, avg_rating: 3.50 }
        ]
      };
    }
  },

  // Fallback curated movies if running completely decoupled
  _getOfflineCurated() {
    return [
      {
        movieId: 296,
        title: "Pulp Fiction (1994)",
        clean_title: "Pulp Fiction",
        year: 1994,
        genres: ["Comedy", "Crime", "Drama", "Thriller"],
        primary_genre: "Crime",
        avg_rating: 4.2,
        rating_count: 307,
        match_percentage: 97,
        poster_url: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        backdrop_url: "https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
        plot: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in four tales of violence and redemption.",
        director: "Quentin Tarantino",
        cast: ["John Travolta", "Samuel L. Jackson", "Uma Thurman", "Bruce Willis"],
        runtime: "154 min",
        mpaa_rating: "R",
        trailer_url: "https://www.youtube.com/embed/s7EdQ4FqbhY",
        tagline: "Just because you are a character doesn't mean you have character."
      },
      {
        movieId: 58559,
        title: "Dark Knight, The (2008)",
        clean_title: "The Dark Knight",
        year: 2008,
        genres: ["Action", "Crime", "Drama", "IMAX"],
        primary_genre: "Action",
        avg_rating: 4.2,
        rating_count: 149,
        match_percentage: 98,
        poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        backdrop_url: "https://image.tmdb.org/t/p/original/hkBaDkMWbLaf8B1rDYR5K7EZUv7.jpg",
        plot: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and Harvey Dent, challenging the chaos unleashed by the Joker.",
        director: "Christopher Nolan",
        cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine"],
        runtime: "152 min",
        mpaa_rating: "PG-13",
        trailer_url: "https://www.youtube.com/embed/EXeTwQWrcwY",
        tagline: "Why so serious?"
      },
      {
        movieId: 79132,
        title: "Inception (2010)",
        clean_title: "Inception",
        year: 2010,
        genres: ["Action", "Crime", "Drama", "Mystery", "Sci-Fi", "Thriller", "IMAX"],
        primary_genre: "Sci-Fi",
        avg_rating: 4.1,
        rating_count: 143,
        match_percentage: 96,
        poster_url: "https://image.tmdb.org/t/p/w500/8IB2e4r4oVhHn97huNTv3Kp92xL.jpg",
        backdrop_url: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        plot: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        director: "Christopher Nolan",
        cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
        runtime: "148 min",
        mpaa_rating: "PG-13",
        trailer_url: "https://www.youtube.com/embed/YoHD9XEInc0",
        tagline: "Your mind is the scene of the crime."
      },
      {
        movieId: 1,
        title: "Toy Story (1995)",
        clean_title: "Toy Story",
        year: 1995,
        genres: ["Adventure", "Animation", "Children", "Comedy", "Fantasy"],
        primary_genre: "Animation",
        avg_rating: 3.9,
        rating_count: 215,
        match_percentage: 95,
        poster_url: "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
        backdrop_url: "https://image.tmdb.org/t/p/original/lxD5ak7ZaMb9AHxYOGIOUVNJbmv.jpg",
        plot: "A little boy named Andy loves to be in his room, making his toys come to life. But when new toy Buzz Lightyear arrives, rivalry and adventure follow.",
        director: "John Lasseter",
        cast: ["Tom Hanks", "Tim Allen", "Don Rickles", "Jim Varney"],
        runtime: "81 min",
        mpaa_rating: "G",
        trailer_url: "https://www.youtube.com/embed/v-PjgYDrg70",
        tagline: "Hang on for the comedy that goes to infinity and beyond!"
      },
      {
        movieId: 109487,
        title: "Interstellar (2014)",
        clean_title: "Interstellar",
        year: 2014,
        genres: ["Sci-Fi", "IMAX"],
        primary_genre: "Sci-Fi",
        avg_rating: 4.0,
        rating_count: 73,
        match_percentage: 96,
        poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        backdrop_url: "https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
        plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        director: "Christopher Nolan",
        cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
        runtime: "169 min",
        mpaa_rating: "PG-13",
        trailer_url: "https://www.youtube.com/embed/zSWdZVtXT7E",
        tagline: "Mankind was born on Earth. It was never meant to die here."
      }
    ];
  }
};

window.API = API;
