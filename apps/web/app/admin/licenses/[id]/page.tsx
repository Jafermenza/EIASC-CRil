'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API = '/api/v1';

type License = {
  id: string; licenseNumber?: string | null; licenseType: string; status: string; applicationStatus: string;
  issuedAt?: string | null; effectiveFrom?: string | null; expiresAt?: string | null; reason?: string | null;
  institution: { id: string; name: string; institutionCode?: string | null; status: string; regionId: string; zoneId: string; subcityId: string; districtId: string; documents?: { id: string; documentType: string; fileName: string; mimeType: string; size: number }[] };
};

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>();
  const [license, setLicense] = useState<License | null>(null); const [error, setError] = useState(''); const [reason, setReason] = useState(''); const [expiresAt, setExpiresAt] = useState(''); const [busy, setBusy] = useState('');

  async function load() {
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
    const response = await fetch(`${API}/licenses/${params.id}`, { headers: { authorization: `Bearer ${token}` } });
    const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load license'); setLicense(data);
  }
  useEffect(() => { void load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load license')); }, [params.id]);

  async function action(path: string, body: Record<string, string> = {}) {
    setError(''); setBusy(path);
    try {
      const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
      const response = await fetch(`${API}/licenses/${params.id}/${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Action failed'); setReason(''); setExpiresAt(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); } finally { setBusy(''); }
  }

  if (error && !license) return <main className="shell"><section className="grid"><article><p className="form-error">{error}</p><Link className="button button-secondary" href="/admin/licenses">Back to licenses</Link></article></section></main>;
  if (!license) return <main className="shell"><p>Loading license…</p></main>;

  const canReview = license.applicationStatus === 'SUBMITTED' || license.applicationStatus === 'RESUBMITTED';
  const canApprove = license.applicationStatus === 'UNDER_REVIEW'; const canReject = license.applicationStatus === 'UNDER_REVIEW'; const canIssue = license.applicationStatus === 'APPROVED' && license.status === 'PENDING';
  const canSuspend = license.status === 'ACTIVE' || license.status === 'EXPIRED'; const canRestore = license.status === 'SUSPENDED'; const canRevoke = ['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(license.status); const canRenew = ['ACTIVE', 'EXPIRED'].includes(license.status);
  const run = (path: string, body?: Record<string, string>) => void action(path, body);

  return (
    <main className="shell">
      <div className="hero"><Link className="back-link" href="/admin/licenses">← Licensing registry</Link><p className="eyebrow">EIASC · INSTITUTIONAL LICENSING</p><h1>{license.institution.name}</h1><p className="lead">{license.licenseNumber || 'License application'} · {license.status}</p></div>
      <section className="grid detail-grid">
        <article><h2>License record</h2><dl><dt>Application stage</dt><dd>{license.applicationStatus}</dd><dt>License number</dt><dd>{license.licenseNumber || 'Not issued'}</dd><dt>License type</dt><dd>{license.licenseType}</dd><dt>Issue date</dt><dd>{license.issuedAt ? new Date(license.issuedAt).toLocaleDateString() : '—'}</dd><dt>Effective from</dt><dd>{license.effectiveFrom ? new Date(license.effectiveFrom).toLocaleDateString() : '—'}</dd><dt>Expiry</dt><dd>{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Not set'}</dd><dt>Reason / decision note</dt><dd>{license.reason || '—'}</dd></dl></article>
        <article><h2>Institution</h2><dl><dt>Status</dt><dd>{license.institution.status}</dd><dt>Institution code</dt><dd>{license.institution.institutionCode || '—'}</dd><dt>Region</dt><dd>{license.institution.regionId}</dd><dt>Zone / City</dt><dd>{license.institution.zoneId}</dd><dt>District</dt><dd>{license.institution.districtId}</dd></dl></article>
      </section>
      <section className="grid"><article><h2>Institution documents</h2>{license.institution.documents?.length ? <ul>{license.institution.documents.map((document) => <li key={document.id}>{document.documentType} — {document.fileName}</li>)}</ul> : <p>No documents are attached to this institution record.</p>}</article></section>

      <section className="workflow-panel"><div className="section-heading compact"><div><p className="eyebrow">CONTROLLED ACTIONS</p><h2>License workflow</h2></div><p>Actions are available according to the application's current state and the signed-in user's authorization.</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="action-row">
          {canReview && <button className="button button-primary" disabled={!!busy} onClick={() => run('review')}>{busy === 'review' ? 'Starting…' : 'Start review'}</button>}
          {canApprove && <button className="button button-primary" disabled={!!busy} onClick={() => run('approve')}>{busy === 'approve' ? 'Approving…' : 'Approve application'}</button>}
          {canReject && <button className="button button-danger" disabled={!!busy || !reason.trim()} onClick={() => run('reject', { reason })}>{busy === 'reject' ? 'Rejecting…' : 'Reject application'}</button>}
          {canIssue && <button className="button button-primary" disabled={!!busy} onClick={() => run('issue', expiresAt ? { expiresAt } : {})}>{busy === 'issue' ? 'Issuing…' : 'Issue license'}</button>}
          {canRestore && <button className="button button-primary" disabled={!!busy} onClick={() => run('restore')}>{busy === 'restore' ? 'Restoring…' : 'Restore license'}</button>}
        </div>
        <div className="form-grid">
          <div className="field"><label htmlFor="expiresAt">Expiry date and time</label><input id="expiresAt" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /><small>Required when the selected action needs an expiry date.</small></div>
          <div className="field"><label htmlFor="reason">Decision reason or administrative note</label><textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter a concise reason where required." rows={4} /></div>
        </div>
        <div className="action-row secondary-actions">
          {license.applicationStatus === 'UNDER_REVIEW' && <button className="button button-secondary" disabled={!!busy || !reason.trim()} onClick={() => run('request-correction', { reason })}>Request correction</button>}
          {license.applicationStatus === 'CORRECTION_REQUIRED' && <button className="button button-secondary" disabled={!!busy} onClick={() => run('resubmit')}>Resubmit application</button>}
          {canSuspend && <button className="button button-secondary" disabled={!!busy || !reason.trim()} onClick={() => run('suspend', { reason })}>Suspend license</button>}
          {canRevoke && <button className="button button-danger" disabled={!!busy || !reason.trim()} onClick={() => run('revoke', { reason })}>Revoke license</button>}
          {canRenew && <button className="button button-secondary" disabled={!!busy || !expiresAt} onClick={() => run('renew', { expiresAt })}>Renew license</button>}
        </div>
      </section>
    </main>
  );
}
