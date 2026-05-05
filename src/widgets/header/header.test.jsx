// @ts-check
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './header';

/** @param {string} path */
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );

describe('Header — three slots', () => {
  it('renders the wordmark, nav links, and a search-bar slot placeholder', () => {
    const { container } = renderAt('/');

    expect(screen.getByRole('link', { name: 'reel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'For you' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="search-bar"]')).not.toBeNull();
  });
});

describe('Header — NavLink active state', () => {
  it.each([
    { path: '/', active: 'For you', inactive: ['Search', 'Profile'] },
    { path: '/search', active: 'Search', inactive: ['For you', 'Profile'] },
    { path: '/profile', active: 'Profile', inactive: ['For you', 'Search'] },
  ])('on $path, only "$active" carries the accent', ({ path, active, inactive }) => {
    renderAt(path);

    expect(screen.getByRole('link', { name: active })).toHaveClass('text-accent');

    for (const label of inactive) {
      expect(screen.getByRole('link', { name: label })).not.toHaveClass('text-accent');
    }
  });

  it('on /movie/:id, "For you" does not stay active (end prop honored)', () => {
    renderAt('/movie/123');

    expect(screen.getByRole('link', { name: 'For you' })).not.toHaveClass('text-accent');
  });
});
