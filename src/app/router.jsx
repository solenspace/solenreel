import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppLayout from '@/app/layouts/app-layout';
import AuthLayout from '@/app/layouts/auth-layout';
import LoadingScreen from '@/shared/ui/loading-screen';

const Home = lazy(() => import('@/app/pages/home'));
const Search = lazy(() => import('@/app/pages/search'));
const Profile = lazy(() => import('@/app/pages/profile'));
const Login = lazy(() => import('@/app/pages/login'));
const Welcome = lazy(() => import('@/app/pages/welcome'));

const withSuspense = (Component) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: withSuspense(Home) },
      { path: 'search', element: withSuspense(Search) },
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
]);

export default router;
