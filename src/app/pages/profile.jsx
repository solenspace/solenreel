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
        <h1 className="mb-8 text-3xl font-bold text-white md:text-4xl">Account</h1>

        <div className="bg-bg-elevated space-y-6 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <img
              src="https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png"
              alt="Profile"
              className="h-20 w-20 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold text-white">Welcome back!</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          <hr className="border-gray-700" />

          <div>
            <h3 className="mb-2 text-xs tracking-wider text-gray-400 uppercase">Membership</h3>
            <p className="text-sm text-white">{user?.email}</p>
            <p className="mt-1 text-xs text-gray-400">Member since {new Date().getFullYear()}</p>
          </div>

          <hr className="border-gray-700" />

          <Button variant="primary" size="full" onClick={() => dispatch(signOut())}>
            Sign Out
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          This is a reel demo for educational purposes only.
        </p>
      </div>
    </div>
  );
};

export default Profile;
