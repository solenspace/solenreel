// @ts-check
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/use-app-dispatch';
import { useScrolled } from '@/shared/lib/use-scrolled';
import { NetflixIcon, SearchIcon, BellIcon, ArrowDownIcon } from '@/shared/ui/icons';
import { signOut } from '@/entities/user/auth-actions';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const dispatch = useAppDispatch();
  const scrolled = useScrolled();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  /** @param {React.FormEvent<HTMLFormElement>} e */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-4 py-3 transition-all duration-300 md:px-12 ${
        scrolled
          ? 'bg-bg/95 shadow-lg backdrop-blur-sm'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      {/* Left */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex-shrink-0">
          <NetflixIcon />
        </Link>
        <ul className="hidden items-center gap-5 md:flex">
          <li>
            <Link to="/" className="text-sm text-white transition-colors hover:text-gray-300">
              Home
            </Link>
          </li>
          <li>
            <Link to="/search" className="text-sm text-gray-300 transition-colors hover:text-white">
              TV Shows
            </Link>
          </li>
          <li>
            <Link to="/search" className="text-sm text-gray-300 transition-colors hover:text-white">
              Movies
            </Link>
          </li>
          <li>
            <Link to="/search" className="text-sm text-gray-300 transition-colors hover:text-white">
              New & Popular
            </Link>
          </li>
        </ul>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <AnimatePresence>
          {searchOpen ? (
            <motion.form
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSearchSubmit}
              className="flex items-center overflow-hidden border border-white/50 bg-black/80"
            >
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                className="bg-transparent px-2"
              >
                <SearchIcon />
              </button>
              <input
                autoFocus
                type="text"
                placeholder="Titles, people, genres"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                className="w-full bg-transparent py-1.5 pr-3 text-sm text-white placeholder-gray-400 outline-none"
              />
            </motion.form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="bg-transparent p-1 transition-opacity hover:opacity-80"
            >
              <SearchIcon />
            </button>
          )}
        </AnimatePresence>

        <button className="hidden bg-transparent transition-opacity hover:opacity-80 sm:block">
          <BellIcon />
        </button>

        {/* Profile dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setProfileMenuOpen(true)}
          onMouseLeave={() => setProfileMenuOpen(false)}
        >
          <button className="flex items-center gap-1 bg-transparent">
            <img
              src="https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png"
              alt="Profile"
              className="h-8 w-8 rounded object-cover"
            />
            <ArrowDownIcon />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-bg-elevated/95 absolute top-full right-0 mt-2 w-48 overflow-hidden rounded-md border border-gray-700 shadow-xl backdrop-blur-sm"
              >
                <Link
                  to="/profile"
                  className="block px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-white/10"
                >
                  Account
                </Link>
                <hr className="border-gray-700" />
                <button
                  onClick={() => dispatch(signOut())}
                  className="w-full bg-transparent px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/10"
                >
                  Sign out of reel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
