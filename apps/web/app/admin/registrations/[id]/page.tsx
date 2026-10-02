'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGeographyMap } from '../../../../lib/useGeographyMap';

const API = '/api/v1';

export default function IndividualRegistrationReviewPage() {
  const geography = useGeographyMap();
  const params = useParams<{ id: string }>();
  const [registration, setRegistration] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch(`${API}/registrations/admin/application/${params.id}`, { headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load registration.');
    setRegistration(data);
  }
  useEffect(() => { if (params.id) void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load registration.')); }, [params.id]);

  async function openDocument(id: string, fileName: string) {\n    const response = await fetch(API + '/registrations/individual/admin/documents/' + encodeURIComponent(id), { headers: { authorization: 'Bearer ' + (localStorage.getItem('accessToken') || '') } });\n    if (!response.ok) throw new Error('Unable to open document.');\n    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener'; anchor.download = fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);\n  }\n\n  async function action(path: string, body?: Record<string, string>) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API}${path}`, { method: 'POST', headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Action rejected.');
      await load(); setReason('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Action rejected.'); }
    finally { setBusy(false); }
  }

  if (error && !registration) return <main className="shell"><section className="error-reason" role="alert"><strong>Registration could not be opened</strong><span>{error}</span><Link className="button button-secondary" href="/admin/registrations">Back to registrations</Link></section></main>;
  if (!registration) return <main className="shell"><p>Loading registration…</p></main>;
  const canReview = registration.status === 'SUBMITTED' || registration.status === 'RESUBMITTED';
  const canDecide = registration.status === 'UNDER_REVIEW';
  const payment = registration.payment;

  return <main className="shell" style={{ maxWidth: 1080 }}><Link className="back-link" href="/admin/registrations">← Back to individual registrations</Link><div className="hero"><p className="eyebrow">EIASC · MEMBER APPLICATION REVIEW</p><h1>{registration.firstName} {registration.lastName}</h1><p className="lead">{registration.trackingCode} · {registration.status.replaceAll('_', ' ')}</p></div>{error && <section className="error-reason" role="alert">{error}</section>}
    <div className="grid"><section><p className="eyebrow">APPLICANT</p><h2>Personal information</h2><dl><dt>Phone</dt><dd>{registration.phone}</dd><dt>Email</dt><dd>{registration.email}</dd><dt>Birth date</dt><dd>{new Date(registration.birthDate).toLocaleDateString()}</dd><dt>Gender</dt><dd>{registration.gender}</dd><dt>Marital status</dt><dd>{registration.maritalStatus}</dd><dt>National identity</dt><dd>{registration.nationalIdentity || '—'}</dd></dl></section>{/* geography section unchanged below */}<section><p className="eyebrow">LOCATION</p><h2>Geographic information</h2><dl><dt>Region</dt><dd>{geography.regions.get(registration.regionId) || registration.regionId}</dd><dt>Zone</dt><dd>{geography.zones.get(registration.zoneId) || registration.zoneId}</dd><dt>Sub-city / town</dt><dd>{registration.subcityId ? (geography.subcities.get(registration.subcityId) || registration.subcityId) : '—'}</dd><dt>District / woreda</dt><dd>{registration.districtId ? (geography.districts.get(registration.districtId) || registration.districtId) : '—'}</dd><dt>Address</dt><dd>{registration.currentAddress || '—'}</dd></dl></section><section><p className="eyebrow">PAYMENT</p><h2>{payment?.status || 'Missing payment'}</h2><dl><dt>Method</dt><dd>{payment?.method || '—'}</dd><dt>Reference</dt><dd>{payment?.referenceNumber || '—'}</dd><dt>Amount</dt><dd>{payment ? `${payment.amount} ${payment.currency}` : '—'}</dd></dl><p className="helper-copy">Manual bank and Telebirr payments are reviewed in the payment queue before this application can be approved.</p>{registration.amendments?.length > 0 && <div><h3>Amendment history</h3>{registration.amendments.map((a: any) => <p key={a.id}><strong>Version {a.version}</strong> · {a.statusBefore} → {a.statusAfter} · {(a.changedFields || []).join(', ')}</p>)}</div>}</section></div>
    <section className="workflow-panel" style={{ marginTop: 18 }}><p className="eyebrow">REVIEW DECISION</p><h2>Move this application through the workflow</h2><div className="field"><label htmlFor="registration-reason">Reason / review note</label><textarea id="registration-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain required corrections or rejection reason." /></div><div className="action-row"><button className="button button-secondary" disabled={busy || !canReview} onClick={() => void action(`/registrations/admin/${registration.id}/review`)}>Start review</button><button className="button button-secondary" disabled={busy || !reason.trim() || !canDecide} onClick={() => void action(`/registrations/admin/${registration.id}/correction`, { reason })}>Request correction</button><button className="button button-danger" disabled={busy || !reason.trim() || !canDecide} onClick={() => void action(`/registrations/admin/${registration.id}/reject`, { reason })}>Reject</button><button className="button button-primary" disabled={busy || !canDecide} onClick={() => void action(`/registrations/admin/${registration.id}/approve`)}>Approve member</button></div></section>
  </main>;
}
