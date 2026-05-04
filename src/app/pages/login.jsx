// @ts-check
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/shared/api/firebase';
import { NetflixIcon } from '@/shared/ui/icons';
import Button from '@/shared/ui/button';
import Input from '@/shared/ui/input';

/** @type {Record<string, string>} */
const ERROR_MAP = {
  'auth/wrong-password': 'Incorrect password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/network-request-failed': 'No internet connection.',
};

const Login = () => {
  /** @type {React.RefObject<HTMLInputElement | null>} */
  const emailRef = useRef(null);
  /** @type {React.RefObject<HTMLInputElement | null>} */
  const passwordRef = useRef(null);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  /** @param {React.FormEvent<HTMLFormElement>} e */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = emailRef.current?.value ?? '';
    const password = passwordRef.current?.value ?? '';

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const code = err instanceof Error && 'code' in err ? String(err.code) : '';
      setError(ERROR_MAP[code] || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg min-h-screen">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            'url(https://assets.nflxext.com/ffe/siteui/vlv3/93da5c27-be66-427c-8b72-5cb39d275279/94eb5ad7-10d8-4571-ab50-d3a3e25547fa/US-en-20240101-popsignuptwoithreecomplianttall-perspective_alpha_website_large.jpg)',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 px-6 py-5 md:px-12">
        <Link to="/auth">
          <NetflixIcon />
        </Link>
      </nav>

      {/* Form */}
      <div className="relative z-10 mt-8 flex justify-center px-4">
        <div className="w-full max-w-md rounded-lg bg-black/75 p-10 backdrop-blur-sm md:p-12">
          <h1 className="mb-8 text-3xl font-bold text-white">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              ref={emailRef}
              type="email"
              placeholder="Email address"
              autoComplete="email"
              required
              onChange={() => setError('')}
            />
            <Input
              ref={passwordRef}
              type="password"
              placeholder="Password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              onChange={() => setError('')}
            />

            {error && <p className="text-accent bg-accent/10 rounded px-3 py-2 text-sm">{error}</p>}

            <Button
              type="submit"
              size="full"
              disabled={loading}
              className={loading ? 'opacity-60' : ''}
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 text-sm text-gray-400">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                  }}
                  className="bg-transparent text-white hover:underline"
                >
                  Sign in now
                </button>
              </p>
            ) : (
              <p>
                New to reel?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                  }}
                  className="bg-transparent text-white hover:underline"
                >
                  Sign up now
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
