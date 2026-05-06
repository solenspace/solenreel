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
import Row from '@/widgets/row/row';
import MovieModal from '@/features/movie-modal/movie-modal';
import SkeletonBanner from '@/shared/ui/skeleton-banner';
import SkeletonRow from '@/shared/ui/skeleton-row';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/tile-variants').TileVariant} TileVariant */

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

  /**
   * @type {Array<{
   *   title: string,
   *   tiles: Movie[] | undefined,
   *   isLoading: boolean,
   *   variant: TileVariant,
   * }>}
   */
  const rows = [
    {
      title: 'Trending Now',
      tiles: trending.data?.results,
      isLoading: trending.isLoading,
      variant: 'grid',
    },
    {
      title: 'Originals',
      tiles: originals.data?.results,
      isLoading: originals.isLoading,
      variant: 'list',
    },
    {
      title: 'Top Rated',
      tiles: topRated.data?.results,
      isLoading: topRated.isLoading,
      variant: 'grid',
    },
    {
      title: 'Action Movies',
      tiles: action.data?.results,
      isLoading: action.isLoading,
      variant: 'grid',
    },
    {
      title: 'Comedy Movies',
      tiles: comedy.data?.results,
      isLoading: comedy.isLoading,
      variant: 'grid',
    },
    {
      title: 'Horror Movies',
      tiles: horror.data?.results,
      isLoading: horror.isLoading,
      variant: 'grid',
    },
    {
      title: 'Romance Movies',
      tiles: romance.data?.results,
      isLoading: romance.isLoading,
      variant: 'grid',
    },
    {
      title: 'Documentaries',
      tiles: documentary.data?.results,
      isLoading: documentary.isLoading,
      variant: 'grid',
    },
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
        {rows.map((row) =>
          row.isLoading ? (
            <SkeletonRow key={row.title} />
          ) : (
            <Row
              key={row.title}
              title={row.title}
              tiles={row.tiles ?? []}
              variant={row.variant}
              onTileClick={(movie) => setSelectedMovie(movie)}
            />
          ),
        )}
      </div>

      {selectedMovie && <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Home;
