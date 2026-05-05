// @ts-check
import { useAuthSession } from '@/entities/user/use-auth-session';

/** @param {{ children: React.ReactNode }} props */
const AuthSessionGate = ({ children }) => {
  useAuthSession();
  return children;
};

export default AuthSessionGate;
