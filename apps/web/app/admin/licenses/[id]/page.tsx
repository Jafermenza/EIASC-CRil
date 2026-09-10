'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type License = {
  id: string;
  licenseNumber?: string | null;
  licenseType: string;
  status: string;
  applicationStatus: string;
  issuedAt?: string | null;
  effectiveFrom?: string | null;
  expiresAt?: string | null;
  suspendedAt?: string | null;
  revokedAt?: string | null;
  reason?: string | null;
  institution: { id: string; name: string; institutionCode?: string | null; status: string; regionId: string; zoneId: string; subcityId: string; districtId: string };
};

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>();
  const [license, setLicense] = useState<License | null>(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function load() {
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
    const response = await fetch(`${API}/licenses/${params.id}`, { headers: { authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load license');
    setLicense(data);
  }

  useEffect(() => { void load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load license')); }, [params.id]);

  async function action(path: string, body: Record<string, string> = {}) {
    setError('');
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
    const response = await fetch(`${API}/licenses/${params.id}/${path}`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Action failed');
    setLicense(data);
    setReason('');
    setExpiresAt('');
  }

  if (error && !license) return <main className="shell"><article className="grid"><div>{error}</div></article></main>;
  if (!license) return <main className="shell"><p>Loading license…</p></main>;

  const canReview = license.applicationStatus === 'SUBMITTED' || license.applicationStatus === 'RESUBMITTED';
  const canApprove = license.applicationStatus === 'UNDER_REVIEW';
  const canIssue = license.applicationStatus === 'APPROVED' && license.status === 'PENDING';
  const canSuspend = license.status === 'ACTIVE' || license.status === 'EXPIRED';
  const canRestore = license.status === 'SUSPENDED';
  const canRevoke = license.status === 'ACTIVE' || license.status === 'EXPIRED' || license.status === 'SUSPENDED';
  const canRenew = license.status === 'ACTIVE' || license.status === 'EXPIRED';

  return (
    <main className="shell" style={{ maxWidth: 1100 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · LICENSE</p>
        <h1>{license.institution.name}</h1>
        <p className="lead">{license.licenseNumber || 'License application'} · {license.status}</p>
      </div>

      <section className="grid">
        <div>
          <h2>License</h2>
          <dl>
            <dt>Application stage</dt><dd>{license.applicationStatus}</dd>
            <dt>License number</dt><dd>{license.licenseNumber || 'Not issued'}</dd>
            <dt>Type</dt><dd>{license.licenseType}</dd>
            <dt>Issue date</dt><dd>{license.issuedAt ? new Date(license.issuedAt).toLocaleDateString() : '—'}</dd>
            <dt>Effective from</dt><dd>{license.effectiveFrom ? new Date(license.effectiveFrom).toLocaleDateString() : '—'}</dd>
            <dt>Expiry</dt><dd>{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Not set'}</dd>
            <dt>Reason</dt><dd>{license.reason || '—'}</dd>
          </dl>
        </div>
        <div>
          <h2>Institution</h2>
          <dl>
            <dt>Status</dt><dd>{license.institution.status}</dd>
            <dt>Code</dt><dd>{license.institution.institutionCode || '—'}</dd>
            <dt>Region</dt><dd>{license.institution.regionId}</dd>
            <dt>Zone / City</dt><dd>{license.institution.zoneId}</dd>
            <dt>District</dt><dd>{license.institution.districtId}</dd>
          </dl>
        </div>
      </section>

      <section className="grid">
        <div>
          <h2>Workflow actions</h2>
          {error && <p>{error}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canReview && <button className="button" onClick={() => void action('review').catch((err) => setError(err.message))}>Start review</button>}
            {canApprove && <button className="button" onClick={() => void action('approve').catch((err) => setError(err.message))}>Approve</button>}
            {canIssue && <button className="button" onClick={() => void action('issue', expiresAt ? { expiresAt } : {}).catch((err) => setError(err.message))}>Issue license</button>}
            {canRestore && <button className="button" onClick={() => void action('restore').catch((err) => setError(err.message))}>Restore</button>}
          </div>
          <div style={{ marginTop: 16 }}>
            <input placeholder="Expiry date/time (optional when issuing)" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" />
            <input placeholder="Reason for correction, suspension or revocation" value={reason} onChange={(event) => setReason(event.target.value)} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {license.applicationStatus === 'UNDER_REVIEW' && <button onClick={() => void action('request-correction', { reason }).catch((err) => setError(err.message))}>Request correction</button>}
              {canSuspend && <button onClick={() => void action('suspend', { reason }).catch((err) => setError(err.message))}>Suspend</button>}
              {canRevoke && <button onClick={() => void action('revoke', { reason }).catch((err) => setError(err.message))}>Revoke</button>}
              {canRenew && <button onClick={() => void action('renew', { expiresAt }).catch((err) => setError(err.message))}>Renew</button>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
