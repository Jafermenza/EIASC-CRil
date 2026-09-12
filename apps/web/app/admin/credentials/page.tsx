'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CredentialType = 'MEMBER' | 'INSTITUTION' | 'LICENSE';
type Issued = {
  id: string;
  credentialNumber: string;
  verificationUrl: string;
  qrPayload: string;
  status: string;
  expiresAt?: string | null;
  issuedAt?: string | null;
  type?: CredentialType;
  publicationStatus?: string;
};

export default function CredentialsPage() {
  const [type, setType] = useState<CredentialType>('INSTITUTION');
  const [subjectId, setSubjectId] = useState('');
  const [issued, setIssued] = useState<Issued | null>(null);
  const [pending, setPending] = useState<Issued[]>([]);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('accessToken') || '';

  async function loadPending() {
    const response = await fetch('/api/v1/credentials/pending-review', {
      headers: { authorization: `Bearer ${token()}` },
    });
    if (response.ok) setPending(await response.json());
  }

  useEffect(() => {
    loadPending().catch(() => undefined);
  }, []);

  async function issue(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setIssued(null);
    const response = await fetch('/api/v1/credentials', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type, subjectId }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.message || 'Unable to issue credential');
      return;
    }
    setIssued({
      ...body,
      verificationUrl: `/verify/${encodeURIComponent(body.credentialNumber)}`,
      qrPayload: `/verify/${encodeURIComponent(body.credentialNumber)}`,
    });
    setSubjectId('');
    await loadPending();
  }

  async function publish(id: string) {
    setError('');
    const response = await fetch(`/api/v1/credentials/${id}/publish`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token()}` },
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.message || 'Unable to publish credential');
      return;
    }
    await loadPending();
    setIssued({
      ...body,
      verificationUrl: `/verify/${encodeURIComponent(body.credentialNumber)}`,
      qrPayload: `/verify/${encodeURIComponent(body.credentialNumber)}`,
    });
  }

  return (
    <main className="shell" style={{ maxWidth: 1000 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · CREDENTIALS</p>
        <h1>Digital credentials</h1>
        <p className="lead">
          Approved members receive digital IDs automatically. Approved institutional licenses generate certificates automatically and remain in review until an authorized officer publishes them.
        </p>
      </div>

      {error && (
        <section className="error-reason" role="alert">
          <strong>Credential action failed</strong>
          <span>{error}</span>
        </section>
      )}

      <section className="workflow-panel">
        <form className="form-grid" onSubmit={issue}>
          <div className="field">
            <label htmlFor="credential-type">Credential type</label>
            <select
              id="credential-type"
              value={type}
              onChange={(event) => setType(event.target.value as CredentialType)}
            >
              <option value="MEMBER">Member</option>
              <option value="INSTITUTION">Institution</option>
              <option value="LICENSE">License</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="subject-id">Subject ID</label>
            <input
              id="subject-id"
              required
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              placeholder="UUID"
            />
          </div>
          <div className="field field-action">
            <button className="button button-primary">Issue credential</button>
          </div>
        </form>
      </section>

      {issued && (
        <section className="workflow-panel">
          <p className="eyebrow">CREDENTIAL</p>
          <h2>{issued.credentialNumber}</h2>
          <p>
            Status: {issued.status} · Publication: {issued.publicationStatus || 'PUBLISHED'}
          </p>
          <div className="action-row">
            <Link className="button button-primary" href={`/credentials/${issued.id}`}>
              Open &amp; print
            </Link>
            <Link
              className="button button-secondary"
              href={issued.verificationUrl}
              target="_blank"
              rel="noreferrer"
            >
              {issued.verificationUrl}
            </Link>
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="workflow-panel">
          <p className="eyebrow">REVIEW QUEUE</p>
          <h2>Certificates awaiting publication</h2>
          {pending.map((credential) => (
            <article
              key={credential.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <strong>{credential.credentialNumber}</strong>
                <p style={{ margin: '4px 0' }}>
                  Generated{' '}
                  {credential.issuedAt
                    ? new Date(credential.issuedAt).toLocaleDateString('en-GB')
                    : '—'}{' '}
                  · {credential.type || 'CREDENTIAL'}
                </p>
              </div>
              <div className="action-row">
                <Link className="button button-secondary" href={`/credentials/${credential.id}`}>
                  Review
                </Link>
                <button className="button button-primary" onClick={() => publish(credential.id)}>
                  Publish
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
