'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { FormEvent } from 'react';

const API = '/api/v1';

type License = { id: string; licenseNumber?: string | null; licenseType: string; status: string; applicationStatus: string; issuedAt?: string | null; expiresAt?: string | null; institution: { id: string; name: string; institutionCode?: string | null; status: string } };

export default function LicensesPage() {
  const [items, setItems] = useState<License[]>([]); const [status, setStatus] = useState(''); const [applicationStatus, setApplicationStatus] = useState(''); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [institutionId, setInstitutionId] = useState(''); const [licenseType, setLicenseType] = useState('INSTITUTIONAL'); const [creating, setCreating] = useState(false);

  async function load() {
    setError(''); setLoading(true); const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
    const query = new URLSearchParams({ page: String(page), pageSize: '25' }); if (status) query.set('status', status); if (applicationStatus) query.set('applicationStatus', applicationStatus); if (search.trim()) query.set('search', search.trim());
    try { const response = await fetch(`${API}/licenses?${query.toString()}`, { headers: { authorization: `Bearer ${token}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load licenses'); setItems(data.items || []); setTotalPages(data.totalPages || 1); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load licenses'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [page, status, applicationStatus]);

  async function createApplication(event: FormEvent) {
    event.preventDefault(); setError(''); setCreating(true);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const response = await fetch(`${API}/licenses`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ institutionId: institutionId.trim(), licenseType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create license application');
      if (!data?.id) throw new Error('License application was created but no record ID was returned');
      setInstitutionId('');
      window.location.assign(`/admin/licenses/${data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create license application'); } finally { setCreating(false); }
  }

  return (
    <main className="shell">
      <div className="hero"><p className="eyebrow">EIASC · INSTITUTIONAL LICENSING</p><h1>Licensing registry</h1><p className="lead">Review applications and manage institutional licenses within your assigned jurisdiction.</p></div>
      <section className="workflow-panel">
        <div className="section-heading compact"><div><p className="eyebrow">REGISTRY SEARCH</p><h2>Find a license record</h2></div><p>Use one or more filters to narrow the registry. Results remain subject to server-side authorization.</p></div>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}>
          <div className="field"><label htmlFor="license-search">License or institution</label><input id="license-search" placeholder="Search by license number, institution or code" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="field"><label htmlFor="application-status">Application stage</label><select id="application-status" value={applicationStatus} onChange={(event) => { setPage(1); setApplicationStatus(event.target.value); }}><option value="">All application stages</option><option>SUBMITTED</option><option>UNDER_REVIEW</option><option>CORRECTION_REQUIRED</option><option>RESUBMITTED</option><option>APPROVED</option><option>REJECTED</option></select></div>
          <div className="field"><label htmlFor="license-status">License state</label><select id="license-status" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">All license states</option><option>PENDING</option><option>ACTIVE</option><option>EXPIRED</option><option>SUSPENDED</option><option>REVOKED</option></select></div>
          <div className="field field-action"><span aria-hidden="true">&nbsp;</span><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search registry'}</button></div>
        </form>
      </section>
      <section className="workflow-panel">
        <div className="section-heading compact"><div><p className="eyebrow">NEW APPLICATION</p><h2>Start institutional licensing</h2></div><p>Use the approved institution ID from the institution registry. The API verifies eligibility and jurisdiction.</p></div>
        <form className="form-grid" onSubmit={createApplication}>
          <div className="field"><label htmlFor="institution-id">Approved institution ID</label><input id="institution-id" required value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="Institution UUID" /></div>
          <div className="field"><label htmlFor="license-type">License type</label><input id="license-type" required value={licenseType} onChange={(event) => setLicenseType(event.target.value)} /></div>
          <div className="field field-action"><span aria-hidden="true">&nbsp;</span><button className="button button-primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create application'}</button></div>
        </form>
      </section>
      {error && <section className="grid"><article><p className="form-error" role="alert">{error}</p></article></section>}
      <section className="grid"><article>
        <div className="table-heading"><div><p className="eyebrow">RESULTS</p><h2>License records</h2></div><span className="result-count">Page {page} of {totalPages}</span></div>
        <div className="table-wrap"><table style={{ width: '100%' }}><thead><tr><th>Institution</th><th>Application</th><th>License</th><th>Expiry</th><th>Record</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.institution.name}</strong><br /><small>{item.institution.institutionCode || item.institution.id}</small></td><td>{item.applicationStatus}</td><td>{item.licenseNumber || 'Not issued'}<br /><small>{item.status}</small></td><td>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'No expiry set'}</td><td><Link className="button button-secondary" href={`/admin/licenses/${item.id}`}>View record</Link></td></tr>)}</tbody></table></div>
        {items.length === 0 && !loading && <p className="empty-state">No license records match the selected criteria.</p>}
        <div className="pagination"><button className="button button-secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><strong>Page {page} / {totalPages}</strong><button className="button button-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>
      </article></section>
    </main>
  );
}
