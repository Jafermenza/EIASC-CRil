'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { roles: string[] };
};

function destination(roles: string[]) {
  if (roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN'].includes(role))) return '/admin/licenses';
  if (roles.includes('INSTITUTION_ADMIN')) return '/institution/license';
  return '/';
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await response.json() as LoginResponse & { message?: string };
      if (!response.ok || !data.accessToken || !data.refreshToken) throw new Error(data.message || 'Unable to sign in. Please check your credentials.');
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      router.replace(destination(data.user.roles || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand-mark">EIASC</div>
        <p className="eyebrow">SECURE ACCESS</p>
        <h1 id="login-title">Sign in to CRil</h1>
        <p className="auth-intro">Access the Community Registration &amp; Institutional Licensing Platform.</p>
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="identifier">Email address or phone number</label>
            <input id="identifier" name="identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary button-full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="auth-footer">
          <Link href="/">Return to public home</Link>
        </div>
      </section>
    </main>
  );
}
