import NotMigrated from './NotMigrated';

/** Work package: auth (login + register). Port of src/app/core/auth/auth.component.*. */
export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return <NotMigrated screen={mode} />;
}
