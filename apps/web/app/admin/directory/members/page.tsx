'use client';

import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatLocation, useGeographyMap } from '../../../../lib/useGeographyMap';
import { extractErrorMessage } from '../../../../lib/validation';
import { useToast } from '../../../../components/ui/toast-provider';

const API = '/api/v1';
type Member = { id: string; firstName: string; lastName: string; phone: string; email?: string | null; status: string; membershipNumber?: string | null; regionId?: string | null; zoneId?: string | null; subcityId?: string | null; districtId?: string | null; createdAt: string };
type Location = { id: string; name: string; regionId?: string; zoneId?: string; subcityId?: string };

export default function MembersDirectoryPage() {
  const geography = useGeographyMap();
  const { push } = useToast();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Member[]>([]);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState('');
  const [regions, setRegions] = useState<Location[]>([]);
  const [zones, setZones] = useState<Location[]>([]);
  const [subcities, setSubcities] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [subcityId, setSubcityId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const auth = () => ({ authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` });

  async function load() {
    setLoading(true); setError('');
    const query = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (status) query.set('status', status);
    if (search.trim()) query.set('search', search.trim());
    if (regionId) query.set('regionId', regionId); if (zoneId) query.set('zoneId', zoneId); if (subcityId) query.set('subcityId', subcityId); if (districtId) query.set('districtId', districtId); if (from) query.set('from', from); if (to) query.set('to', to);
    try {
      const response = await fetch(`${API}/registrations/admin/members?${query}`, { headers: auth(), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(data, 'Unable to load the member directory.'));
      setItems(data.items || []); setTotalPages(data.totalPages || 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load the member directory.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const headers = auth();
    Promise.all([
      fetch(`${API}/locations/regions`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${API}/locations/zones`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${API}/locations/subcities`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${API}/locations/districts`, { headers }).then((r) => r.ok ? r.json() : []),
    ]).then(([a,b,d,e]) => { setRegions(a); setZones(b); setSubcities(d); setDistricts(e); }).catch(() => undefined);
  }, []);
  useEffect(() => { void load(); }, [page, status]);

  async function resetCredentials(memberId: string) {
    if (!window.confirm('Reset this member\'s username and password? A new temporary password will be sent to them.')) return;
    setResetting(memberId);
    try {
      const detailResponse = await fetch(`${API}/registrations/admin/members/${memberId}`, { headers: auth() });
      const detail = await detailResponse.json();
      if (!detailResponse.ok) throw new Error(extractErrorMessage(detail, 'Unable to load member account.'));
      if (!detail.loginUserId) throw new Error('This member does not yet have a login account.');
      const response = await fetch(`${API}/users/${detail.loginUserId}/reset-credentials`, { method: 'POST', headers: auth() });
      const body = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(body, 'Unable to reset credentials.'));
      push({ type: 'success', title: 'Credentials reset', message: 'A new username/password was sent to the member.' });
    } catch (reason) {
      push({ type: 'error', title: 'Reset failed', message: reason instanceof Error ? reason.message : 'Unable to reset credentials.' });
    } finally { setResetting(''); }
  }

  async function exportCsv() {
    const query = new URLSearchParams();
    if (status) query.set('status', status); if (search.trim()) query.set('search', search.trim()); if (regionId) query.set('regionId', regionId); if (zoneId) query.set('zoneId', zoneId); if (subcityId) query.set('subcityId', subcityId); if (districtId) query.set('districtId', districtId); if (from) query.set('from', from); if (to) query.set('to', to);
    const response = await fetch(`${API}/registrations/admin/members/export?${query}`, { headers: auth() });
    if (!response.ok) { const body = await response.json().catch(() => ({})); push({ type: 'error', title: 'Export failed', message: extractErrorMessage(body, 'Unable to export the member catalog.') }); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'eiasc-members.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="shell" style={{ maxWidth: 1200 }}>
      <div className="hero"><p className="eyebrow">EIASC · APPROVED MEMBERS</p><h1>Member directory</h1><p className="lead">Approved members across your authorized jurisdiction. View details, reset login credentials, filter by status, and export the list.</p></div>
      <section className="workflow-panel">
        <div className="form-grid">
          <div className="field"><label htmlFor="member-search">Search</label><input id="member-search" placeholder="Name, phone or membership number" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void load(); } }} /></div>
          <div className="field"><label htmlFor="member-region">Region</label><select id="member-region" value={regionId} onChange={(e) => { setRegionId(e.target.value); setZoneId(''); setSubcityId(''); setDistrictId(''); setPage(1); }}><option value="">All regions</option>{regions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label htmlFor="member-zone">Zone / City</label><select id="member-zone" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setSubcityId(''); setDistrictId(''); setPage(1); }} disabled={!regionId}><option value="">All zones / cities</option>{zones.filter(x=>!regionId||x.regionId===regionId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label htmlFor="member-subcity">Subcity / Town</label><select id="member-subcity" value={subcityId} onChange={(e) => { setSubcityId(e.target.value); setDistrictId(''); setPage(1); }} disabled={!zoneId}><option value="">All subcities / towns</option>{subcities.filter(x=>!zoneId||x.zoneId===zoneId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label htmlFor="member-district">District</label><select id="member-district" value={districtId} onChange={(e) => { setDistrictId(e.target.value); setPage(1); }} disabled={!zoneId}><option value="">All districts</option>{districts.filter(x=>(!subcityId||x.subcityId===subcityId)&&(!zoneId||x.zoneId===zoneId)).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label htmlFor="member-from">Registered from</label><input id="member-from" type="date" value={from} onChange={(e)=>{setFrom(e.target.value);setPage(1);}} /></div>
          <div className="field"><label htmlFor="member-to">Registered to</label><input id="member-to" type="date" value={to} onChange={(e)=>{setTo(e.target.value);setPage(1);}} /></div>
          <div className="field"><label htmlFor="member-status">Status</label><select id="member-status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Inactive / suspended</option></select></div>
          <div className="field field-action"><button className="button button-primary" onClick={() => { setPage(1); void load(); }} disabled={loading}>{loading ? 'Searching…' : /button></div>
          <div className="field field-action"><button className="button button-secondary" onClick={() => void exportCsv()} disabled={!items.length}><Download size={16}/> Export CSV</button></div>
        </div>
      </section>
      {error && <section className="error-reason" role="alert"><strong>Directory could not be loaded</strong><span>{error}</span></section>}
      <section className="workflow-panel" style={{ marginTop: 18 }}>
        <div className="table-heading"><div><p className="eyebrow">DIRECTORY</p><h2>Members</h2></div><span className="result-count">{loading ? 'Loading…' : `${items.length} shown`}</span></div>
        <div className="table-wrap"><table><thead><tr><th>Member</th><th>Membership number</th><th>Location</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead><tbody>
          {items.length ? items.map((m) => (
            <tr key={m.id}>
              <td><strong>{m.firstName} {m.lastName}</strong><br /><small>{m.phone} · {m.email || '—'}</small></td>
              <td>{m.membershipNumber || '—'}</td>
              <td>{formatLocation(geography, m)}</td>
              <td><span className={`status-badge status-${m.status.toLowerCase()}`}>{m.status}</span></td>
              <td>{new Date(m.createdAt).toLocaleDateString()}</td>
              <td><div className="action-row"><Link className="button button-secondary" href={`/admin/directory/members/${m.id}`}>View detail</Link><button className="button button-secondary" disabled={resetting === m.id} onClick={() => void resetCredentials(m.id)}>{resetting === m.id ? 'Resetting…' : 'Reset credentials'}</button></div></td>
            </tr>
          )) : <tr><td colSpan={6}><div className="empty-state">{loading ? 'Loading members…' : 'No approved members match this filter.'}</div></td></tr>}
        </tbody></table></div>
        <div className="pagination"><button className="button button-secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button><strong>Page {page} / {totalPages}</strong><button className="button button-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</button></div>
      </section>
    </main>
  );
}
