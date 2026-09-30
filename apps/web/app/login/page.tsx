'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ui/toast-provider';
import { extractErrorMessage } from '../../lib/validation';

const API = '/api/v1';

function destination(roles: string[]) {
  if (roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER'].includes(role))) return '/admin/dashboard';
  if (roles.includes('INSTITUTION_ADMIN')) return '/institution';
  if (roles.includes('MEMBER')) return '/member';
  return '/member';
}

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  // Security guard: Ensure sensitive credentials (like passwords or emails) are NEVER retained in the URL query string
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('password') || params.has('identifier')) {
        // Strip credentials from URL history immediately
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  function validate(): boolean {
    const errors: { identifier?: string; password?: string } = {};
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      errors.identifier = 'Email address or phone number is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!validate()) {
      push({ type: 'warning', title: 'Missing required credentials', message: 'Please enter your email/phone and password.' });
      return;
    }

    setBusy(true);
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authUser');

      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await response.json();
      if (!response.ok || !data.accessToken || !data.refreshToken) {
        const errorReason = extractErrorMessage(data, 'The email/phone or password was not accepted.');
        throw new Error(errorReason);
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      push({ type: 'success', title: 'Signed in successfully', message: 'Your account is authenticated. Opening your authorized workspace.' });
      router.replace(destination(data.user?.roles || []));
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'The sign-in service could not complete your request.';
      setError(reason);
      push({ type: 'error', title: 'Sign-in failed', message: reason });
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
        <form className="form-stack" method="post" action="#" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="identifier">Email address or phone number</label>
            <input
              id="identifier"
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
              required
            />
            {fieldErrors.identifier && (
              <p id="identifier-error" className="field-error" style={{ color: 'var(--danger, #b91c1c)', fontSize: 13, marginTop: 4 }}>
                {fieldErrors.identifier}
              </p>
            )}
            <small>Use the identifier associated with your CRil account.</small>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              required
            />
            {fieldErrors.password && (
              <p id="password-error" className="field-error" style={{ color: 'var(--danger, #b91c1c)', fontSize: 13, marginTop: 4 }}>
                {fieldErrors.password}
              </p>
            )}
          </div>
          {error && (
            <div className="form-error" role="alert">
              <strong>Unable to sign in</strong>
              <br />
              {error}
            </div>
          )}
          <button className="button button-primary button-full" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="auth-footer">
          <Link href="/">Return to public home</Link>
        </div>
      </section>
    </main>
  );
}
