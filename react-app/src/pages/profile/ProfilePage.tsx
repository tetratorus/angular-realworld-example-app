import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { profileApi } from '../../api/client';
import type { Errors, Profile } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import FollowButton from '../../components/FollowButton';
import ListErrors from '../../components/ListErrors';
import { defaultImage } from '../../lib/format';

const navClass = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '');

/** Port of features/profile/pages/profile/profile.component.*; renders <Outlet /> for the tabs. */
export default function ProfilePage() {
  const { username } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [errors, setErrors] = useState<Errors | null>(null);

  // Angular reads the route snapshot once in ngOnInit, so the profile is not refetched when :username changes.
  useEffect(() => {
    profileApi.get(username!).then(setProfile, (error: Errors) =>
      // Same value Angular stores: the inner `errors` map, passed to ListErrors as-is.
      setErrors((error.errors || { error: ['Failed to load profile'] }) as unknown as Errors),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUser = !!profile && profile.username === currentUser?.username;

  return (
    <div className="profile-page">
      {errors && (
        <div className="container">
          <div className="row">
            <div className="col-xs-12 col-md-10 offset-md-1">
              <ListErrors errors={errors} />
            </div>
          </div>
        </div>
      )}
      {profile && (
        <>
          <div className="user-info">
            <div className="container">
              <div className="row">
                <div className="col-xs-12 col-md-10 offset-md-1">
                  <img src={defaultImage(profile.image)} className="user-img" />
                  <h4>{profile.username}</h4>
                  <p>{profile.bio ?? ''}</p>
                  {!isUser && <FollowButton profile={profile} onToggle={setProfile} />}
                  {isUser && (
                    <Link to="/settings" className="btn btn-sm btn-outline-secondary action-btn">
                      <i className="ion-gear-a"></i> Edit Profile Settings{' '}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="container">
            <div className="row">
              <div className="col-xs-12 col-md-10 offset-md-1">
                <div className="articles-toggle">
                  <ul className="nav nav-pills outline-active">
                    <li className="nav-item">
                      <NavLink className={navClass} end to={`/profile/${profile.username}`}>
                        {' '}
                        My Posts{' '}
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink className={navClass} end to={`/profile/${profile.username}/favorites`}>
                        {' '}
                        Favorited Posts{' '}
                      </NavLink>
                    </li>
                  </ul>
                </div>

                <Outlet />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
