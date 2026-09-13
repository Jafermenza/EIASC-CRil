'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API = '/api/v1';

export default function IndividualRegistrationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('accessToken') || '';
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await fetch(`${API}/registrations/admin/queue${query}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load individual registrations.');
      setItems(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load individual registrations.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [status]);

  return <main className="shell" style={{ maxWidth: 1200 }}>
    <div className="hero"><p className="eyebrow">EIASC · REGISTRATION</p><h1>Individual registrations</h1><p className="lead">Review member applications within your authenticated jurisdiction. Payment must be verified before approval.</p></div>
    <section className="workflow-panel"><div className="form-grid"><div className="field"><label htmlFor="registration-status">Application status</label><select id="registration-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Open applications</option><option value="SUBMITTED">Submitted</option><option value="UNDER_REVIEW">Under review</option><option value="CORRECTION">Correction required</option><option value="RESUBMITTED">Resubmitted</option></select></div><div className="field field-action"><button className="button button-secondary" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh queue'}</button></div></div></section>
    {error && <section className="error-reason" role="alert"><strong>Registration queue error</strong><span>{error}</span></section>}
    <section className="workflow-panel" style={{ marginTop: 18 }}><div className="table-heading"><div><p className="eyebrow">APPLICATION QUEUE</p><h2>Member applications</h2></div><span className="result-count">{loading ? 'Loading…' : `${items.length} shown`}</span></div><div className="table-wrap"><table><thead><tr><th>Applicant</th><th>Tracking code</th><th>Location</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.id}><td><strong>{item.firstName} {item.middleName || ''} {item.lastName}</strong><br /><small>{item.phone}</small></td><td>{item.trackingCode}</td><td>{item.regionId}<br /><small>{item.districtId || item.zoneId}</small></td><td>{item.status.replaceAll('_', ' ')}</td><td>{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '—'}</td><td><Link className="button button-secondary" href={`/admin/registrations/${item.id}`}>Open review</Link></td></tr>) : <tr><td colSpan={6}><div className="empty-state">{loading ? 'Loading registrations…' : 'No individual registrations found in this queue.'}</div></td></tr>}</tbody></table></div></section>
  </main>;
}
