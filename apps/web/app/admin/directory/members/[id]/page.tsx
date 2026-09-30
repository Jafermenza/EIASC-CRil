'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGeographyMap } from '../../../../../lib/useGeographyMap';
import { extractErrorMessage } from '../../../../../lib/validation';
import { useToast } from '../../../../../components/ui/toast-provider';

const API = '/api/v1';

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const geography = useGeographyMap();
  const { push } = useToast();
  const [member, setMember] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const auth = () => ({ authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` });

  async function load() {
    try {
      const response = await fetch(`${API}/registrations/admin/members/${params.id}`, { headers: auth(), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(data, 'Unable to load member.'));
      setMember(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load member.'); }
  }
  useEffect(() => { if (params.id) void load(); }, [params.id]);

  async function resetCredentials() {
    if (!member?.loginUserId) return;
    if (!window.confirm('Reset this member\'s username and password?')) return;
    setBusy(true);
    try {
      const response = await fetch(`${API}/users/${member.loginUserId}/reset-credentials`, { method: 'POST', headers: auth() });
      const body = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(body, 'Unable to reset credentials.'));
      push({ type: 'success', title: 'Credentials reset', message: 'A new username/password was sent to the member.' });
    } catch (reason) { push({ type: 'error', title: 'Reset failed', message: reason instanceof Error ? reason.message : 'Unable to reset credentials.' }); }
    finally { setBusy(false); }
  }

  if (error) return <main className="shell"><section className="error-reason" role="alert"><strong>Member could not be opened</strong><span>{error}</span><Link className="button button-secondary" href="/admin/directory/members">Back to directory</Link></section></main>;
  if (!member) return <main className="shell"><p>Loading member…</p></main>;

  return (
    <main className="shell" style={{ maxWidth: 900 }}>
      <Link className="back-link" href="/admin/directory/members">← Back to member directory</Link>
      <div className="hero"><p className="eyebrow">EIASC · MEMBER DETAIL</p><h1>{member.firstName} {member.lastName}</h1><p className="lead">{member.membershipNumber || 'No membership number issued yet'} · {member.status}</p></div>
      <div className="grid">
        <section><p className="eyebrow">CONTACT</p><h2>Details</h2><dl><dt>Phone</dt><dd>{member.phone}</dd><dt>Email</dt><dd>{member.email || '—'}</dd><dt>Location</dt><dd>{[geography.regions.get(member.regionId), geography.zones.get(member.zoneId), member.subcityId ? geography.subcities.get(member.subcityId) : null, member.districtId ? geography.districts.get(member.districtId) : null].filter(Boolean).join(' / ') || '—'}</dd><dt>Registered</dt><dd>{new Date(member.createdAt).toLocaleDateString()}</dd></dl></section>
        <section><p className="eyebrow">DIGITAL ID</p><h2>Credential record</h2>{member.credential ? <dl><dt>Credential number</dt><dd>{member.credential.credentialNumber}</dd><dt>Status</dt><dd>{member.credential.status}</dd><dt>Issued</dt><dd>{member.credential.issuedAt ? new Date(member.credential.issuedAt).toLocaleDateString() : '—'}</dd><dt>Expires</dt><dd>{member.credential.expiresAt ? new Date(member.credential.expiresAt).toLocaleDateString() : '—'}</dd></dl> : <p className="empty-state">No digital ID has been issued yet.</p>}</section>
        <section><p className="eyebrow">ACCOUNT</p><h2>Sign-in credentials</h2>{member.loginUserId ? <><p>Status: {member.loginUserStatus}</p><button className="button button-primary" disabled={busy} onClick={() => void resetCredentials()}>{busy ? 'Resetting…' : 'Reset username & password'}</button></> : <p className="empty-state">No login account has been provisioned for this member yet.</p>}</section>
      </div>
    </main>
  );
}
