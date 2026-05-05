// @ts-check
import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAuthStatus, selectSession } from '@/entities/user/user-slice';
import Header from '@/widgets/header/header';
import Footer from '@/widgets/footer/footer';
import ErrorBoundary from '@/shared/ui/error-boundary';
import LoadingScreen from '@/shared/ui/loading-screen';

const AppLayout = () => {
  const navigate = useNavigate();
  const status = useSelector(selectAuthStatus);
  const session = useSelector(selectSession);

  useEffect(() => {
    if (status === 'unauthenticated') navigate('/auth/login');
  }, [status, navigate]);

  if (status === 'idle' || status === 'loading') return <LoadingScreen />;
  if (!session) return null;

  return (
    <div className="bg-bg min-h-screen">
      <Header />
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
