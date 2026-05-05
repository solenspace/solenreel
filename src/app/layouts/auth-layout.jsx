// @ts-check
import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAuthStatus } from '@/entities/user/user-slice';
import LoadingScreen from '@/shared/ui/loading-screen';
import ErrorBoundary from '@/shared/ui/error-boundary';

const AuthLayout = () => {
  const navigate = useNavigate();
  const status = useSelector(selectAuthStatus);

  useEffect(() => {
    if (status === 'authenticated') navigate('/');
  }, [status, navigate]);

  if (status === 'idle') return <LoadingScreen />;

  return (
    <div className="bg-bg min-h-screen">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
};

export default AuthLayout;
