// @ts-check
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSearchMulti, posterUrl } from '@/entities/movie/queries';
import MovieModal from '@/features/movie-modal/movie-modal';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { data: response, isLoading } = useSearchMulti(query);
  const [selectedMovie, setSelectedMovie] = useState(/** @type {Movie | null} */ (null));

  useEffect(() => {
    setSearchParams(query ? { q: query } : {}, { replace: true });
  }, [query, setSearchParams]);

  const filteredResults = (response?.results ?? []).filter(
    /** @param {Movie} item */
    (item) => item.posterPath !== null,
  );

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
            {filteredResults.length} results for &quot;{query}&quot;
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {filteredResults.map(/** @param {Movie} item */ (item) => {
              const url = posterUrl(item.posterPath);
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedMovie(item)}
                >
                  {url && (
                    <img
                      src={url}
                      alt={item.title}
                      className="w-full rounded-md object-cover transition-all group-hover:shadow-xl group-hover:ring-1 group-hover:ring-white/20"
                      loading="lazy"
                    />
                  )}
                  <p className="text-ink mt-2 truncate text-sm">{item.title}</p>
                  <p className="text-ink-muted text-xs">
                    {item.year > 0 ? item.year : ''}
                    {item.voteAverage > 0 && ` · ${Math.round(item.voteAverage * 10)}%`}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {!isLoading && query.length >= 2 && filteredResults.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-ink-muted text-lg">No results found for &quot;{query}&quot;</p>
          <p className="text-ink-faint mt-2 text-sm">Try different keywords or check the spelling</p>
        </div>
      )}

      {query.length < 2 && (
        <div className="py-24 text-center">
          <p className="text-ink-muted text-lg">Search for your favorite movies and TV shows</p>
        </div>
      )}

      {selectedMovie && <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Search;
