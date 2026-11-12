import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Errors, User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import ListErrors from '../components/ListErrors';

interface SettingsForm {
  image: string;
  username: string;
  bio: string;
  email: string;
  password: string;
}

/** Port of src/app/features/settings/settings.component.{ts,html}. */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, update, logout } = useAuth();
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(() => ({
    image: currentUser?.image ?? '',
    username: currentUser?.username ?? '',
    bio: currentUser?.bio ?? '',
    email: currentUser?.email ?? '',
    password: '',
  }));
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof SettingsForm) => (e: { target: { value: string } }) =>
    setSettingsForm(form => ({ ...form, [field]: e.target.value }));

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: Partial<SettingsForm> = { ...settingsForm };
    if (!payload.password) {
      delete payload.password;
    }

    update(payload as Partial<User> & { password?: string }).then(
      user => navigate('/profile/' + user.username),
      (err: Errors) => {
        setErrors(err);
        setIsSubmitting(false);
      },
    );
  };

  return (
    <div className="settings-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Your Settings</h1>

            <ListErrors errors={errors} />

            {/* Angular's reactive forms add `novalidate`, so the server validates the email. */}
            <form noValidate onSubmit={submitForm}>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="URL of profile picture"
                    name="image"
                    value={settingsForm.image}
                    onChange={set('image')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Username"
                    name="username"
                    value={settingsForm.username}
                    onChange={set('username')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <textarea
                    className="form-control form-control-lg"
                    rows={8}
                    placeholder="Short bio about you"
                    name="bio"
                    value={settingsForm.bio}
                    onChange={set('bio')}
                  ></textarea>
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="email"
                    placeholder="Email"
                    name="email"
                    value={settingsForm.email}
                    onChange={set('email')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="password"
                    placeholder="New Password"
                    name="password"
                    value={settingsForm.password}
                    onChange={set('password')}
                  />
                </fieldset>

                <button className="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Update Settings
                </button>
              </fieldset>
            </form>

            {/* Line break for logout button */}
            <hr />

            <button className="btn btn-outline-danger" onClick={logout}>
              Or click here to logout.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
