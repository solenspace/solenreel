// @ts-check
import { useState, useMemo } from 'react';
import {
  useTrending,
  useOriginals,
  useTopRated,
  useByGenre,
  GENRES,
} from '@/entities/movie/queries';
import Banner from '@/widgets/banner/banner';
import BannerAmbient from '@/widgets/banner/banner-ambient';
import MovieRow from '@/widgets/movie-row/movie-row';
import MovieModal from '@/features/movie-modal/movie-modal';
import SkeletonBanner from '@/shared/ui/skeleton-banner';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

const Home = () => {
  const trending = useTrending();
  const originals = useOriginals();
  const topRated = useTopRated();
  const action = useByGenre(GENRES.ACTION);
  const comedy = useByGenre(GENRES.COMEDY);
  const horror = useByGenre(GENRES.HORROR);
  const romance = useByGenre(GENRES.ROMANCE);
  const documentary = useByGenre(GENRES.DOCUMENTARY);

  /** @type {[Movie | null, React.Dispatch<React.SetStateAction<Movie | null>>]} */
  const [selectedMovie, setSelectedMovie] = useState(/** @type {Movie | null} */ (null));

  const featuredMovie = useMemo(() => {
    const trendingResults = trending.data?.results;
    if (!trendingResults?.length) return null;
    return trendingResults[Math.floor(Math.random() * trendingResults.length)];
  }, [trending.data]);

  const rows = [
    { title: 'Trending Now', movies: trending.data?.results, isLoading: trending.isLoading },
    {
      title: 'Originals',
      movies: originals.data?.results,
      isLoading: originals.isLoading,
      isLargeRow: true,
    },
    { title: 'Top Rated', movies: topRated.data?.results, isLoading: topRated.isLoading },
    { title: 'Action Movies', movies: action.data?.results, isLoading: action.isLoading },
    { title: 'Comedy Movies', movies: comedy.data?.results, isLoading: comedy.isLoading },
    { title: 'Horror Movies', movies: horror.data?.results, isLoading: horror.isLoading },
    { title: 'Romance Movies', movies: romance.data?.results, isLoading: romance.isLoading },
    { title: 'Documentaries', movies: documentary.data?.results, isLoading: documentary.isLoading },
  ];

  return (
    <div className="relative pb-16">
      <BannerAmbient movie={featuredMovie} isTrailerPlaying={false} />

      {trending.isLoading ? (
        <SkeletonBanner />
      ) : (
        <Banner movie={featuredMovie} onMoreInfo={(movie) => setSelectedMovie(movie)} />
      )}

      <div className="relative z-10 -mt-16">
        {rows.map((row) => (
          <MovieRow
            key={row.title}
            title={row.title}
            movies={row.movies}
            isLoading={row.isLoading}
            isLargeRow={row.isLargeRow}
            onMovieClick={(movie) => setSelectedMovie(movie)}
          />
        ))}
      </div>

      {selectedMovie && <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Home;
