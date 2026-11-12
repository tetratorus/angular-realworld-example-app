import { Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { RequireAuth, RequireGuest } from './auth/guards';
import Footer from './components/Footer';
import Header from './components/Header';
import NotMigrated from './pages/NotMigrated';

// Screens are swapped in from ./pages/* as each work package lands (see docs/migration-plan.md).
const HomePage = () => <NotMigrated screen="home" />;
const AuthPage = ({ mode }: { mode: 'login' | 'register' }) => <NotMigrated screen={mode} />;
const SettingsPage = () => <NotMigrated screen="settings" />;
const ProfilePage = () => <NotMigrated screen="profile" />;
const ProfileArticles = () => null;
const ProfileFavorites = () => null;
const EditorPage = () => <NotMigrated screen="editor" />;
const ArticlePage = () => <NotMigrated screen="article" />;

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
