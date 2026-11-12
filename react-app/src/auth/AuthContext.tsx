import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwt, setUnauthorizedHandler, userApi } from '../api/client';
import type { User } from '../api/types';

/** Same states as Angular's UserService.AuthState. */
export type AuthState = 'authenticated' | 'unauthenticated' | 'unavailable' | 'loading';

interface AuthContextValue {
  authState: AuthState;
  currentUser: User | null;
  isAuthenticated: boolean;
  /** True once the startup auth check has finished (Angular blocks bootstrap on it). */
  initialised: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (credentials: { username: string; email: string; password: string }) => Promise<User>;
  update: (user: Partial<User> & { password?: string }) => Promise<User>;
  logout: () => void;
  purgeAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

declare global {
  interface Window {
    __conduit_debug__?: {
      getToken: () => string | null;
      getAuthState: () => AuthState;
      getCurrentUser: () => User | null;
    };
  }
}

/** Port of Angular's UserService + initAuth (src/app/core/auth/services/user.service.ts, app.config.ts). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialised, setInitialised] = useState(false);
  const retryAttempt = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const stateRef = useRef({ authState, currentUser });
  stateRef.current = { authState, currentUser };

  const cancelRetry = () => {
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    retryTimer.current = null;
  };

  const setAuth = useCallback((user: User) => {
    cancelRetry();
    retryAttempt.current = 0;
    jwt.save(user.token);
    setCurrentUser(user);
    setAuthState('authenticated');
  }, []);

  const purgeAuth = useCallback(() => {
    cancelRetry();
    retryAttempt.current = 0;
    jwt.destroy();
    setCurrentUser(null);
    setAuthState('unauthenticated');
  }, []);

  const loadCurrentUser = useCallback((): Promise<void> => {
    return userApi.current().then(
      ({ user }) => setAuth(user),
      (err: { status?: number }) => {
        const status = err?.status ?? 0;
        if (status >= 400 && status < 500) {
          purgeAuth();
        } else {
          setCurrentUser(null);
          setAuthState('unavailable');
          scheduleRetry();
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAuth, purgeAuth]);

  const scheduleRetry = () => {
    cancelRetry();
    if (!jwt.get()) return;
    const delaySeconds = Math.min(2 * Math.pow(2, retryAttempt.current), 16);
    retryAttempt.current++;
    retryTimer.current = window.setTimeout(() => {
      if (jwt.get()) {
        setAuthState('loading');
        void loadCurrentUser();
      }
    }, delaySeconds * 1000);
  };

  useEffect(() => {
    window.__conduit_debug__ = {
      getToken: () => jwt.get(),
      getAuthState: () => stateRef.current.authState,
      getCurrentUser: () => stateRef.current.currentUser,
    };
    setUnauthorizedHandler(purgeAuth);
    let cancelled = false;
    if (jwt.get()) {
      void loadCurrentUser().finally(() => !cancelled && setInitialised(true));
    } else {
      purgeAuth();
      setInitialised(true);
    }
    return () => {
      cancelled = true;
      cancelRetry();
    };
  }, [loadCurrentUser, purgeAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authState,
      currentUser,
      isAuthenticated: !!currentUser,
      initialised,
      purgeAuth,
      login: credentials =>
        userApi.login(credentials).then(({ user }) => {
          setAuth(user);
          return user;
        }),
      register: credentials =>
        userApi.register(credentials).then(({ user }) => {
          setAuth(user);
          return user;
        }),
      update: user =>
        userApi.update(user).then(({ user: updated }) => {
          setCurrentUser(updated);
          return updated;
        }),
      logout: () => {
        purgeAuth();
        navigate('/');
      },
    }),
    [authState, currentUser, initialised, purgeAuth, setAuth, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
