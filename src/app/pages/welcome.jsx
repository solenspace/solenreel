// @ts-check
import { Link } from 'react-router-dom';
import { NetflixIcon } from '@/shared/ui/icons';
import Button from '@/shared/ui/button';

const Welcome = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://assets.nflxext.com/ffe/siteui/vlv3/93da5c27-be66-427c-8b72-5cb39d275279/94eb5ad7-10d8-4571-ab50-d3a3e25547fa/US-en-20240101-popsignuptwoithreecomplianttall-perspective_alpha_website_large.jpg)',
        }}
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute top-0 right-0 left-0 h-48 bg-gradient-to-b from-black/80 to-transparent" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <NetflixIcon />
        <Link to="/auth/login">
          <Button variant="primary" size="sm">
            Sign In
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 max-w-3xl text-3xl font-bold text-white md:text-5xl lg:text-6xl">
          Unlimited movies, TV shows, and more
        </h1>
        <p className="mb-6 text-lg text-gray-200 md:text-xl">Watch anywhere. Cancel anytime.</p>
        <p className="mb-4 text-gray-300">Ready to watch? Create your account to get started.</p>
        <Link to="/auth/login">
          <Button variant="primary" size="lg">
            Get Started ›
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Welcome;
