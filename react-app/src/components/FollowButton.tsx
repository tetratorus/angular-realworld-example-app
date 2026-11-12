import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api/client';
import type { Profile } from '../api/types';
import { useAuth } from '../auth/AuthContext';

/** Angular FollowButtonComponent. */
export default function FollowButton({ profile, onToggle }: { profile: Profile; onToggle: (p: Profile) => void }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);

  const toggleFollowing = () => {
    setSubmitting(true);
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const call = profile.following ? profileApi.unfollow(profile.username) : profileApi.follow(profile.username);
    call.then(
      p => {
        setSubmitting(false);
        onToggle(p);
      },
      () => setSubmitting(false),
    );
  };

  const classes = [
    'btn',
    'btn-sm',
    'action-btn',
    isSubmitting && 'disabled',
    profile.following ? 'btn-secondary' : 'btn-outline-secondary',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} onClick={toggleFollowing}>
      <i className="ion-plus-round"></i> &nbsp; {profile.following ? 'Unfollow' : 'Follow'} {profile.username}{' '}
    </button>
  );
}
