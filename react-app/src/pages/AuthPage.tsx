import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Errors } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import ListErrors from '../components/ListErrors';

/** Angular's Validators.email pattern (packages/forms/src/validators.ts). */
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Work package: auth (login + register). Port of src/app/core/auth/auth.component.*. */
export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return <AuthForm key={mode} authType={mode} />;
}

function AuthForm({ authType }: { authType: 'login' | 'register' }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const title = authType === 'login' ? 'Sign in' : 'Sign up';
  const [errors, setErrors] = useState<Errors>({ errors: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // Validators.required on every control (username only exists on register).
  const formValid = email !== '' && password !== '' && (authType === 'login' || username !== '');

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    // Same client check as Angular: Validators.email (empty values pass), message matches the API.
    if (email !== '' && !EMAIL_REGEXP.test(email)) {
      setErrors({ errors: { email: 'is invalid' } });
      return;
    }
    setIsSubmitting(true);
    setErrors({ errors: {} });

    // Same key order as Angular's FormGroup value (username control is added after email/password).
    const result = authType === 'login' ? login({ email, password }) : register({ email, password, username });

    result.then(
      () => navigate('/'),
      (err: Errors) => {
        setErrors(err);
        setIsSubmitting(false);
      },
    );
  };

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">{title}</h1>
            <p className="text-xs-center">
              {authType === 'register' && <Link to="/login">Have an account?</Link>}

              {authType === 'login' && <Link to="/register">Need an account?</Link>}
            </p>
            <ListErrors errors={errors} />
            <form onSubmit={submitForm} noValidate>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  {authType === 'register' && (
                    <input
                      name="username"
                      placeholder="Username"
                      className="form-control form-control-lg"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                  )}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    name="email"
                    placeholder="Email"
                    className="form-control form-control-lg"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <input
                    name="password"
                    placeholder="Password"
                    className="form-control form-control-lg"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </fieldset>
                <button className="btn btn-lg btn-primary pull-xs-right" disabled={!formValid} type="submit">
                  {' '}
                  {title}{' '}
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
