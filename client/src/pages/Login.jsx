import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'student' };

export default function Login() {
  const { user, saveSession } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const data = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body });
      saveSession(data);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth-art">
        <p className="eyebrow">Academic notes, sharpened</p>
        <h1>
          Study smarter. <em>Share</em> better.
        </h1>
        <p className="lede">
          Find trusted notes by subject and unit, save what matters, and let AI summarize, quiz you, or answer
          questions grounded in the material.
        </p>
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create account'}</p>
        {mode === 'register' && (
          <>
            <label>
              Full name
              <input required value={form.name} onChange={set('name')} />
            </label>
            <label>
              I am a
              <select value={form.role} onChange={set('role')}>
                <option value="student">Student</option>
                <option value="contributor">Faculty / contributor</option>
              </select>
            </label>
          </>
        )}
        <label>
          Email
          <input type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label>
          Password
          <input type="password" required minLength={6} value={form.password} onChange={set('password')} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already registered? Log in'}
        </button>
      </form>
    </section>
  );
}
