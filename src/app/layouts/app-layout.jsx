// @ts-check
import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { auth } from '@/shared/api/firebase';
import { login, logout, selectUser } from '@/entities/user/user-slice';
import Navbar from '@/widgets/header/header';
import Footer from '@/widgets/footer/footer';
import ErrorBoundary from '@/shared/ui/error-boundary';
import LoadingScreen from '@/shared/ui/loading-screen';

const AppLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        dispatch(login({ uid: firebaseUser.uid, email: firebaseUser.email }));
      } else {
        dispatch(logout());
        navigate('/auth/login');
      }
      setAuthChecked(true);
    });
    return unsubscribe;
  }, [dispatch, navigate]);

  if (!authChecked) return <LoadingScreen />;
  if (!user) return null;

  return (
    <div className="bg-bg min-h-screen">
      <Navbar />
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
