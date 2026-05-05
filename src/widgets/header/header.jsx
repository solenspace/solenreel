// @ts-check
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'For you', end: true },
  { to: '/search', label: 'Search', end: false },
  { to: '/profile', label: 'Profile', end: false },
];

/** @param {{ isActive: boolean }} state */
const navClass = ({ isActive }) =>
  `text-sm transition-colors ${isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'}`;

const Header = () => (
  <header className="border-border-subtle bg-bg/95 sticky top-0 z-50 flex items-center justify-between gap-8 border-b px-6 py-4 backdrop-blur-sm md:px-10">
    <NavLink to="/" end className="font-display text-ink text-2xl tracking-tight">
      reel
    </NavLink>

    <nav className="flex items-center gap-6">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>

    {/* Search-bar slot — populated in spec 20. Reserves width so layout doesn't shift. */}
    <div data-slot="search-bar" aria-hidden="true" className="h-9 w-64" />
  </header>
);

export default Header;
