// @ts-check
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '@/shared/api/supabase';
import {
  setSession,
  selectSession,
  selectUser,
  selectAuthStatus,
} from '@/entities/user/user-slice';

export const useAuthSession = () => {
  const dispatch = useDispatch();
  const session = useSelector(selectSession);
  const user = useSelector(selectUser);
  const status = useSelector(selectAuthStatus);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      dispatch(setSession(data.session ?? null));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      dispatch(setSession(nextSession ?? null));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [dispatch]);

  return { session, user, status };
};
