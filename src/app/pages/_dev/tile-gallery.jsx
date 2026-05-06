// @ts-check
import Tile from '@/entities/movie/tile';
import Row from '@/widgets/row/row';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

/**
 * @param {Partial<Movie> & { id: number, title: string }} overrides
 * @returns {Movie}
 */
const movie = (overrides) => ({
  originalTitle: overrides.title,
  releaseDate: '2010-01-01',
  year: 2010,
  posterPath: '/placeholder.jpg',
  backdropPath: null,
  genreIds: [],
  voteAverage: 7.6,
  overview: '',
  tagline: null,
  runtime: 120,
  director: 'Sample Director',
  moodTags: ['cerebral', 'dreamlike', 'tense'],
  mediaType: 'movie',
  ...overrides,
});

const FULL = movie({ id: 1, title: 'Inception', director: 'Christopher Nolan', runtime: 148 });
const NO_DIRECTOR = movie({ id: 2, title: 'Anonymous Auteur', director: null });
const NO_RUNTIME = movie({ id: 3, title: 'Untimed Reel', runtime: null });
const NO_MOODS = movie({ id: 4, title: 'Genre-less', moodTags: [] });
const NO_POSTER = movie({ id: 5, title: 'Lost Poster', posterPath: null });
const NO_YEAR = movie({ id: 6, title: 'Undated Print', year: 0, releaseDate: '' });

const SAMPLES = [FULL, NO_DIRECTOR, NO_RUNTIME, NO_MOODS, NO_POSTER, NO_YEAR];

const TileGallery = () => (
  <div className="bg-bg min-h-screen pt-12 pb-24">
    <header className="mb-8 px-6 md:px-12">
      <h1 className="display text-ink text-3xl">Tile gallery</h1>
      <p className="text-ink-muted mt-2 text-sm">
        Visual reference for the three Tile variants and the Row primitive. Empty-data edge cases
        included so omission behaviour is easy to spot.
      </p>
    </header>

    <Row title="Grid variant" caption="poster + title + year" tiles={SAMPLES} variant="grid" />
    <Row
      title="List variant"
      caption="poster + title + meta + mood tags + score"
      tiles={SAMPLES}
      variant="list"
    />
    <Row
      title="Compact variant"
      caption="poster + title only"
      tiles={SAMPLES}
      variant="compact"
    />

    <section className="mt-12 px-6 md:px-12">
      <h2 className="display text-ink mb-3 text-2xl">Slot override</h2>
      <p className="text-ink-muted mb-3 text-sm">
        The list variant with `Tile.Score` replaced by a reasoning sentence (spec 18 preview).
      </p>
      <div className="flex gap-3">
        <Tile movie={FULL} variant="list" onClick={() => {}}>
          <Tile.Poster />
          <Tile.Body>
            <Tile.Title />
            <Tile.Meta />
            <Tile.MoodTags />
            <Tile.Reasoning>Because you watched Memento</Tile.Reasoning>
          </Tile.Body>
        </Tile>
      </div>
    </section>

    <section className="mt-12 px-6 md:px-12">
      <h2 className="display text-ink mb-3 text-2xl">Non-interactive (article)</h2>
      <p className="text-ink-muted mb-3 text-sm">
        When `onClick` is omitted the tile renders as `&lt;article&gt;` instead of `&lt;button&gt;`.
      </p>
      <div className="flex gap-3">
        <Tile movie={FULL} variant="grid" />
        <Tile movie={NO_POSTER} variant="grid" />
      </div>
    </section>
  </div>
);

export default TileGallery;
