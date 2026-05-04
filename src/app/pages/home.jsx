// @ts-check
import { useState, useMemo } from 'react';
import { useHomeRows, useTrending } from '@/entities/movie/use-movies';
import Banner from '@/widgets/banner/banner';
import BannerAmbient from '@/widgets/banner/banner-ambient';
import MovieRow from '@/widgets/movie-row/movie-row';
import MovieModal from '@/features/movie-modal/movie-modal';
import SkeletonBanner from '@/shared/ui/skeleton-banner';

/** @typedef {import('@/shared/api/tmdb').Movie} Movie */

const Home = () => {
  const { data: trending, isLoading: trendingLoading } = useTrending();
  const { rows } = useHomeRows();
  /** @type {[Movie | null, React.Dispatch<React.SetStateAction<Movie | null>>]} */
  const [selectedMovie, setSelectedMovie] = useState(/** @type {Movie | null} */ (null));

  const featuredMovie = useMemo(() => {
    if (!trending?.length) return null;
    return trending[Math.floor(Math.random() * trending.length)];
  }, [trending]);

  return (
    <div className="relative pb-16">
      <BannerAmbient movie={featuredMovie} isTrailerPlaying={false} />

      {trendingLoading ? (
        <SkeletonBanner />
      ) : (
        <Banner
          movie={featuredMovie}
          onMoreInfo={(/** @type {Movie} */ movie) => setSelectedMovie(movie)}
        />
      )}

      <div className="relative z-10 -mt-16">
        {rows.map((row) => (
          <MovieRow
            key={row.title}
            title={row.title}
            movies={row.data}
            isLoading={row.isLoading}
            isLargeRow={row.isLargeRow}
            onMovieClick={(/** @type {Movie} */ movie) => setSelectedMovie(movie)}
          />
        ))}
      </div>

      {selectedMovie && <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Home;
