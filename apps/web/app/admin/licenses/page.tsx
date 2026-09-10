'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type License = {
  id: string;
  licenseNumber?: string | null;
  licenseType: string;
  status: string;
  applicationStatus: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  institution: { id: string; name: string; institutionCode?: string | null; status: string };
};

export default function LicensesPage() {
  const [items, setItems] = useState<License[]>([]);
  const [status, setStatus] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
    const query = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (status) query.set('status', status);
    if (applicationStatus) query.set('applicationStatus', applicationStatus);
    if (search.trim()) query.set('search', search.trim());
    try {
      const response = await fetch(`${API}/licenses?${query.toString()}`, { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load licenses');
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load licenses');
    }
  }

  useEffect(() => { void load(); }, [page, status, applicationStatus]);

  return (
    <main className="shell" style={{ maxWidth: 1200 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · LICENSING</p>
        <h1>Institutional licenses</h1>
        <p className="lead">Review, issue and manage institutional authorization within your jurisdiction.</p>
      </div>

      <section className="grid">
        <div>
          <input placeholder="Search license, institution or code" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={applicationStatus} onChange={(event) => { setPage(1); setApplicationStatus(event.target.value); }}>
            <option value="">All application stages</option>
            <option>SUBMITTED</option><option>UNDER_REVIEW</option><option>CORRECTION_REQUIRED</option><option>RESUBMITTED</option><option>APPROVED</option><option>REJECTED</option>
          </select>
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            <option value="">All license states</option>
            <option>PENDING</option><option>ACTIVE</option><option>EXPIRED</option><option>SUSPENDED</option><option>REVOKED</option>
          </select>
          <button className="button" onClick={() => { setPage(1); void load(); }}>Search</button>
        </div>
      </section>

      {error && <article className="grid"><div>{error}</div></article>}

      <section className="grid">
        <div>
          <table style={{ width: '100%' }}>
            <thead><tr><th>Institution</th><th>Application</th><th>License</th><th>Expiry</th><th>Action</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.institution.name}<br /><small>{item.institution.institutionCode || item.institution.id}</small></td>
                  <td>{item.applicationStatus}</td>
                  <td>{item.licenseNumber || 'Not issued'}<br /><small>{item.status}</small></td>
                  <td>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'No expiry set'}</td>
                  <td><a className="button" href={`/admin/licenses/${item.id}`}>Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>{' '}
            <strong>Page {page} / {totalPages}</strong>{' '}
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </p>
        </div>
      </section>
    </main>
  );
}
