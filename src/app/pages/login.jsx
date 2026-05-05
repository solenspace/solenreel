// @ts-check
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/use-app-dispatch';
import { signIn, signUp } from '@/entities/user/auth-actions';
import { NetflixIcon } from '@/shared/ui/icons';
import Button from '@/shared/ui/button';
import Input from '@/shared/ui/input';

/** @type {Record<string, string>} */
const ERROR_MAP = {
  invalid_credentials: 'Invalid email or password.',
  email_not_confirmed: 'Please confirm your email before signing in.',
  user_already_exists: 'This email is already registered.',
  email_address_invalid: 'Please enter a valid email address.',
  weak_password: 'Password is too weak. Use at least 6 characters.',
  over_email_send_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  user_banned: 'This account has been disabled.',
  signup_disabled: 'New sign-ups are temporarily disabled.',
};

const Login = () => {
  const dispatch = useAppDispatch();
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
      const action = isSignUp ? signUp({ email, password }) : signIn({ email, password });
      await dispatch(action).unwrap();
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String(/** @type {{ code: unknown }} */ (err).code)
          : '';
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
          <h1 className="text-ink mb-8 text-3xl font-bold">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>

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

          <div className="text-ink-muted mt-8 text-sm">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                  }}
                  className="text-ink bg-transparent hover:underline"
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
                  className="text-ink bg-transparent hover:underline"
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
