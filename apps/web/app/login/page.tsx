'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type LoginResponse = { accessToken: string; refreshToken: string; user: { roles: string[] } };

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
      const data = await response.json() as LoginResponse & { message?: string };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Sign in failed');
      localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken); localStorage.setItem('userRoles', JSON.stringify(data.user.roles));
      router.replace('/admin');
    } catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed'); } finally { setLoading(false); }
  }

  return <main className="auth-page"><section className="auth-panel" aria-labelledby="login-title">
    <div className="brand-mark">EIASC</div>
    <p className="eyebrow">CRil · SECURE ACCESS</p>
    <h1 id="login-title">Platform sign in</h1>
    <p className="auth-intro">Authorized EIASC personnel can access administration services using their registered email or phone.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    <form className="form-stack" onSubmit={submit}>
      <div className="field"><label htmlFor="identifier">Email or phone</label><input id="identifier" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <button className="button button-primary button-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}</button>
    </form>
    <div className="auth-footer"><a href="/">Return to public portal</a></div>
  </section></main>;
}
