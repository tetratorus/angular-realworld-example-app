import { Outlet } from 'react-router-dom';
import NotMigrated from '../NotMigrated';

/** Work package: profile. Port of features/profile/pages/profile/profile.component.*; renders <Outlet /> for the tabs. */
export default function ProfilePage() {
  return (
    <>
      <NotMigrated screen="profile" />
      <Outlet />
    </>
  );
}
