// @ts-check
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useTrackingSource } from './tracking-context';
import { TrackingProvider } from './tracking-provider';

const Probe = () => {
  const source = useTrackingSource();
  return <span data-testid="source">{source}</span>;
};

describe('TrackingProvider / useTrackingSource', () => {
  afterEach(cleanup);

  it('returns the provider source', () => {
    const { getByTestId } = render(
      <TrackingProvider source="search">
        <Probe />
      </TrackingProvider>,
    );
    expect(getByTestId('source').textContent).toBe('search');
  });

  it('returns "unknown" when no provider is mounted', () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('source').textContent).toBe('unknown');
  });

  it('the deepest provider wins when nested', () => {
    const { getByTestId } = render(
      <TrackingProvider source="home">
        <TrackingProvider source="movie-detail">
          <Probe />
        </TrackingProvider>
      </TrackingProvider>,
    );
    expect(getByTestId('source').textContent).toBe('movie-detail');
  });
});
