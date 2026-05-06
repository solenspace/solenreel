// @ts-check
import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppLayout from '@/app/layouts/app-layout';
import AuthLayout from '@/app/layouts/auth-layout';
import LoadingScreen from '@/shared/ui/loading-screen';

const Home = lazy(() => import('@/app/pages/home'));
const Search = lazy(() => import('@/app/pages/search'));
const Movie = lazy(() => import('@/app/pages/movie'));
const Profile = lazy(() => import('@/app/pages/profile'));
const Login = lazy(() => import('@/app/pages/login'));
const Welcome = lazy(() => import('@/app/pages/welcome'));
const DevTokens = import.meta.env.DEV ? lazy(() => import('@/app/pages/_dev/tokens')) : null;
const DevTileGallery = import.meta.env.DEV
  ? lazy(() => import('@/app/pages/_dev/tile-gallery'))
  : null;

/** @param {React.ComponentType} Component */
const withSuspense = (Component) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

/** @type {import('react-router-dom').RouteObject[]} */
export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: withSuspense(Home) },
      { path: 'search', element: withSuspense(Search) },
      { path: 'movie/:id', element: withSuspense(Movie) },
      { path: 'profile', element: withSuspense(Profile) },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: withSuspense(Welcome) },
      { path: 'login', element: withSuspense(Login) },
    ],
  },
  ...(DevTokens ? [{ path: '/dev/tokens', element: withSuspense(DevTokens) }] : []),
  ...(DevTileGallery
    ? [{ path: '/dev/tile-gallery', element: withSuspense(DevTileGallery) }]
    : []),
];

const router = createBrowserRouter(routes);

export default router;
