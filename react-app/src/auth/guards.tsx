import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Angular `requireAuth` guard: redirect to /login when not authenticated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/**
 * Angular login/register guard (`canActivate: !isAuthenticated`). Like a guard it is checked once, when the
 * route is entered, so signing in on /login does not redirect here (AuthPage navigates to / itself).
 * A refused navigation is cancelled as in Angular: on first load the URL becomes / with an empty outlet;
 * otherwise the user goes back to where they were.
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [allowed] = useState(!isAuthenticated);
  useEffect(() => {
    if (allowed) return;
    if (location.key === 'default') window.history.replaceState(window.history.state, '', '/');
    else navigate(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return allowed ? <>{children}</> : null;
}
