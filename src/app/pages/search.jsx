// @ts-check
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '@/entities/movie/use-movies';
import { useDebounce } from '@/shared/lib/use-debounce';
import { img } from '@/shared/api/tmdb';
import MovieModal from '@/features/movie-modal/movie-modal';
import { motion } from 'framer-motion';

/** @typedef {import('@/shared/api/tmdb').Movie} Movie */

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 400);
  const { data: results, isLoading } = useSearch(debouncedQuery);
  const [selectedMovie, setSelectedMovie] = useState(/** @type {Movie | null} */ (null));

  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery });
    } else {
      setSearchParams({});
    }
  }, [debouncedQuery, setSearchParams]);

  const filteredResults =
    results?.filter(
      (item) => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv'),
    ) || [];

  return (
    <div className="min-h-screen px-4 pt-24 md:px-12">
      <div className="mx-auto mb-8 max-w-2xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies, TV shows, people..."
          autoFocus
          className="bg-bg-elevated/70 border-border focus:border-accent focus:ring-accent text-ink placeholder:text-ink-faint w-full rounded-lg border px-6 py-4 text-lg transition-colors focus:ring-1 focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-bg-elevated aspect-[2/3] animate-pulse rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && filteredResults.length > 0 && (
        <>
          <p className="text-ink-muted mb-4 text-sm">
            {filteredResults.length} results for &quot;{debouncedQuery}&quot;
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {filteredResults.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer"
                onClick={() => setSelectedMovie(item)}
              >
                <img
                  src={img.poster(item.poster_path)}
                  alt={item.title || item.name}
                  className="w-full rounded-md object-cover transition-all group-hover:shadow-xl group-hover:ring-1 group-hover:ring-white/20"
                  loading="lazy"
                />
                <p className="text-ink mt-2 truncate text-sm">{item.title || item.name}</p>
                <p className="text-ink-muted text-xs">
                  {(item.release_date || item.first_air_date || '').slice(0, 4)}
                  {item.vote_average > 0 && ` · ${Math.round(item.vote_average * 10)}%`}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      {!isLoading && debouncedQuery && filteredResults.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-ink-muted text-lg">
            No results found for &quot;{debouncedQuery}&quot;
          </p>
          <p className="text-ink-faint mt-2 text-sm">
            Try different keywords or check the spelling
          </p>
        </div>
      )}

      {!debouncedQuery && (
        <div className="py-24 text-center">
          <p className="text-ink-muted text-lg">Search for your favorite movies and TV shows</p>
        </div>
      )}

      {selectedMovie && <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Search;
