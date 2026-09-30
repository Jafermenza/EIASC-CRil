'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { extractErrorMessage } from '../../../../lib/validation';
import { useToast } from '../../../../components/ui/toast-provider';

const API = '/api/v1';

export default function InstitutionDetailPage() {
  const params = useParams<{ id: string }>();
  const { push } = useToast();
  const [institution, setInstitution] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [error, setError] = useState('');
  const auth = () => ({ authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` });

  async function load() {
    try {
      const response = await fetch(`${API}/institutions/${params.id}`, { headers: auth(), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(data, 'Unable to load institution.'));
      setInstitution(data);
      const licenseResponse = await fetch(`${API}/licenses?institutionId=${params.id}&pageSize=1`, { headers: auth() });
      const licenseData = await licenseResponse.json();
      if (licenseResponse.ok) setLicense(licenseData.items?.[0] ?? null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load institution.'); }
  }
  useEffect(() => { if (params.id) void load(); }, [params.id]);

  async function resetCredentials() {
    if (!window.confirm('Reset this institution\'s admin username and password?')) return;
    try {
      const adminResponse = await fetch(`${API}/institutions/${params.id}/admin-user`, { headers: auth() });
      const admin = await adminResponse.json();
      if (!adminResponse.ok) throw new Error(extractErrorMessage(admin, 'Unable to load institution account.'));
      if (!admin?.id) throw new Error('This institution does not yet have an admin login account.');
      const response = await fetch(`${API}/users/${admin.id}/reset-credentials`, { method: 'POST', headers: auth() });
      const body = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(body, 'Unable to reset credentials.'));
      push({ type: 'success', title: 'Credentials reset', message: 'A new username/password was sent to the institution admin.' });
    } catch (reason) { push({ type: 'error', title: 'Reset failed', message: reason instanceof Error ? reason.message : 'Unable to reset credentials.' }); }
  }

  if (error) return <main className="shell"><section className="error-reason" role="alert"><strong>Institution could not be opened</strong><span>{error}</span><Link className="button button-secondary" href="/admin/directory/institutions">Back to directory</Link></section></main>;
  if (!institution) return <main className="shell"><p>Loading institution…</p></main>;

  return (
    <main className="shell" style={{ maxWidth: 900 }}>
      <Link className="back-link" href="/admin/directory/institutions">← Back to institution directory</Link>
      <div className="hero"><p className="eyebrow">EIASC · INSTITUTION DETAIL</p><h1>{institution.name}</h1><p className="lead">{institution.institutionCode} · {institution.status}</p></div>
      <div className="grid">
        <section><p className="eyebrow">PROFILE</p><h2>Details</h2><dl><dt>Type</dt><dd>{institution.type?.name || '—'}</dd><dt>Phone</dt><dd>{institution.phone || '—'}</dd><dt>Email</dt><dd>{institution.email || '—'}</dd><dt>Address</dt><dd>{institution.address || '—'}</dd></dl></section>
        <section><p className="eyebrow">LICENSE</p><h2>License record</h2>{license ? <dl><dt>License number</dt><dd>{license.licenseNumber || 'Not issued'}</dd><dt>Status</dt><dd>{license.status}</dd><dt>Issued</dt><dd>{license.issuedAt ? new Date(license.issuedAt).toLocaleDateString() : '—'}</dd><dt>Expires</dt><dd>{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : '—'}</dd></dl> : <p className="empty-state">No license application on record.</p>}</section>
        <section><p className="eyebrow">ADMIN ACCOUNT</p><h2>Sign-in credentials</h2><button className="button button-primary" onClick={() => void resetCredentials()}>Reset username & password</button></section>
      </div>
    </main>
  );
}
