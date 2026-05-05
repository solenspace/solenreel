// @ts-check
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/use-app-dispatch';
import { selectUser } from '@/entities/user/user-slice';
import { signOut } from '@/entities/user/auth-actions';
import Button from '@/shared/ui/button';

const Profile = () => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);

  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-24 md:px-12">
      <div className="w-full max-w-lg">
        <h1 className="text-ink mb-8 text-3xl font-bold md:text-4xl">Account</h1>

        <div className="bg-bg-elevated space-y-6 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <img
              src="https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png"
              alt="Profile"
              className="h-20 w-20 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-ink text-xl font-semibold">Welcome back!</h2>
              <p className="text-ink-muted text-sm">{user?.email}</p>
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <h3 className="text-ink-muted mb-2 text-xs tracking-wider uppercase">Membership</h3>
            <p className="text-ink text-sm">{user?.email}</p>
            <p className="text-ink-muted mt-1 text-xs">Member since {new Date().getFullYear()}</p>
          </div>

          <hr className="border-border" />

          <Button variant="primary" size="full" onClick={() => dispatch(signOut())}>
            Sign Out
          </Button>
        </div>

        <p className="text-ink-faint mt-6 text-center text-xs">
          This is a reel demo for educational purposes only.
        </p>
      </div>
    </div>
  );
};

export default Profile;
