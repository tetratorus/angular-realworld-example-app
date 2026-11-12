import { Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { RequireAuth, RequireGuest } from './auth/guards';
import Footer from './components/Footer';
import Header from './components/Header';
import ArticlePage from './pages/ArticlePage';
import AuthPage from './pages/AuthPage';
import EditorPage from './pages/EditorPage';
import HomePage from './pages/HomePage';
import ProfileArticles from './pages/profile/ProfileArticles';
import ProfileFavorites from './pages/profile/ProfileFavorites';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/SettingsPage';

/** Same routes and URLs as src/app/app.routes.ts and features/profile/profile.routes.ts. */
export default function App() {
  const { initialised } = useAuth();
  // Angular's app initializer blocks rendering until the startup auth check completes.
  if (!initialised) return null;
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tag/:tag" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <RequireGuest>
              <AuthPage mode="login" />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <AuthPage mode="register" />
            </RequireGuest>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="/profile/:username" element={<ProfilePage />}>
          <Route index element={<ProfileArticles />} />
          <Route path="favorites" element={<ProfileFavorites />} />
        </Route>
        <Route
          path="/editor"
          element={
            <RequireAuth>
              <EditorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/editor/:slug"
          element={
            <RequireAuth>
              <EditorPage />
            </RequireAuth>
          }
        />
        <Route path="/article/:slug" element={<ArticlePage />} />
      </Routes>
      <Footer />
    </>
  );
}
