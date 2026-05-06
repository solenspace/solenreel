// @ts-check
import { useNavigate } from 'react-router-dom';
import { usePopular } from '@/entities/movie/queries';
import Row from '@/widgets/row/row';
import SkeletonRow from '@/shared/ui/skeleton-row';
import ErrorFallback from '@/shared/ui/error-fallback';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { useLoadingTooLong } from '@/shared/lib/use-loading-too-long';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

const Home = () => {
  const navigate = useNavigate();
  const query = usePopular(1, { retry: 1 });
  const longPending = useLoadingTooLong(query.isPending, 800);

  useDocumentTitle('reel — for you');

  if (query.isError) {
    return (
      <ErrorFallback
        error={new Error("the movies aren't loading. trying again.")}
        resetErrorBoundary={() => {
          query.refetch();
        }}
      />
    );
  }

  if (query.isPending) {
    if (longPending) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <p className="text-accent display text-2xl">reel is loading</p>
        </div>
      );
    }
    return <SkeletonRow />;
  }

  return (
    <Row
      title="Popular this week"
      tiles={query.data.results}
      variant="grid"
      onTileClick={(/** @type {Movie} */ movie) => navigate(`/movie/${movie.id}`)}
    />
  );
};

export default Home;
