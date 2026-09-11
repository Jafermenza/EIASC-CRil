'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

export default function InstitutionLicensePage() {
  const [license, setLicense] = useState<any>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    const institutionId = localStorage.getItem('institutionId') || '';
    if (!institutionId) { setError('No institution is assigned to this account.'); return; }
    fetch(`${API}/licenses?institutionId=${encodeURIComponent(institutionId)}&pageSize=1`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load license'); return data; })
      .then((data) => setLicense(data.items?.[0] ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load license'));
  }, []);

  async function resubmit() {
    if (!license) return; setError(''); setBusy(true);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const response = await fetch(`${API}/licenses/${license.id}/resubmit`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to resubmit license application'); setLicense(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to resubmit license application'); } finally { setBusy(false); }
  }

  return (
    <main className="shell" style={{ maxWidth: 900 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · INSTITUTION</p>
        <h1>Institution license</h1>
        <p className="lead">View the current institutional licensing record available to your authorized account.</p>
      </div>
      {error && <article className="grid"><div>{error}</div></article>}
      {!error && !license && <article className="grid"><div><h2>No license record</h2><p>Your institution does not currently have a licensing record.</p></div></article>}
      {license && <section className="grid"><div>
        <h2>{license.licenseNumber || 'License application'}</h2>
        <p><strong>Application:</strong> {license.applicationStatus}</p>
        <p><strong>Status:</strong> {license.status}</p>
        <p><strong>Type:</strong> {license.licenseType}</p>
        <p><strong>Issued:</strong> {license.issuedAt ? new Date(license.issuedAt).toLocaleDateString() : '—'}</p>
        <p><strong>Expires:</strong> {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Not set'}</p>
        {license.applicationStatus === 'CORRECTION_REQUIRED' && <><p>{license.reason || 'Corrections are required before review can continue.'}</p><button className="button button-primary" disabled={busy} onClick={() => void resubmit()}>{busy ? 'Resubmitting…' : 'Resubmit application'}</button></>}
      </div></section>}
    </main>
  );
}
