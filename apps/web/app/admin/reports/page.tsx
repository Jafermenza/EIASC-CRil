'use client';

import { useEffect, useState } from 'react';

type Dashboard = Record<string, number>;
type TrendRow = { month: string; members: number; institutions: number; applications: number; licenses: number; credentials: number; memberCredentials: number; institutionCredentials: number; licenseCredentials: number };
type RegionRow = { regionId: string; region: string; members: number; institutions: number; credentials: number };

const labels: Record<string, string> = {
  members: 'Members', activeMembers: 'Active members', institutions: 'Institutions', activeInstitutions: 'Active institutions',
  pendingApplications: 'Pending applications', approvedApplications: 'Approved applications', rejectedApplications: 'Rejected applications',
  activeLicenses: 'Active licenses', expiredLicenses: 'Expired licenses', suspendedLicenses: 'Suspended licenses', credentialIssued: 'Credentials issued',
  memberCredentialsIssued: 'Member IDs issued', institutionCredentialsIssued: 'Institution certificates issued', licenseCredentialsIssued: 'License certificates issued',
  activeCredentials: 'Active credentials', expiredCredentials: 'Expired credentials', revokedCredentials: 'Revoked credentials',
};

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null); const [trend, setTrend] = useState<TrendRow[]>([]); const [regions, setRegions] = useState<RegionRow[]>([]); const [error, setError] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  async function load() {
    setError(''); const token = localStorage.getItem('accessToken') || ''; const params = new URLSearchParams(); if (from) params.set('from', from); if (to) params.set('to', to);
    try {
      const headers = { authorization: `Bearer ${token}` }; const suffix = params.toString() ? `?${params}` : '';
      const [dashboardResponse, trendResponse, regionResponse] = await Promise.all([fetch(`/api/v1/reports/dashboard${suffix}`, { headers }), fetch(`/api/v1/reports/trend?months=12${suffix ? `&${params}` : ''}`, { headers }), fetch(`/api/v1/reports/regional${suffix}`, { headers })]);
      const bodies = await Promise.all([dashboardResponse.json(), trendResponse.json(), regionResponse.json()]);
      if (!dashboardResponse.ok || !trendResponse.ok || !regionResponse.ok) throw new Error('The reporting service rejected the request.');
      setDashboard(bodies[0] as Dashboard); setTrend(bodies[1] as TrendRow[]); setRegions(bodies[2] as RegionRow[]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load reporting data'); }
  }
  useEffect(() => { void load(); }, []);
  function exportReport() { const token = localStorage.getItem('accessToken') || ''; const params = new URLSearchParams(); if (from) params.set('from', from); if (to) params.set('to', to); fetch(`/api/v1/reports/export${params.toString() ? `?${params}` : ''}`, { headers: { authorization: `Bearer ${token}` } }).then(async (response) => { if (!response.ok) throw new Error('Unable to export report'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'eiasc-report.csv'; anchor.click(); URL.revokeObjectURL(url); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to export report')); }
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · REPORTING</p><h1>Reports &amp; dashboards</h1><p className="lead">Trustworthy operational reporting across members, institutions, licensing and digital credentials, restricted to your authorized jurisdiction.</p><div className="action-row"><label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="button button-secondary" onClick={() => void load()}>Apply filter</button><button className="button button-primary" onClick={exportReport}>Export CSV</button></div></div>{error&&<section className="error-reason" role="alert">{error}</section>}<section className="grid">{dashboard&&Object.entries(labels).map(([key, label]) => <article key={key}><p className="eyebrow">{label}</p><h2>{dashboard[key] ?? 0}</h2></article>)}</section><section className="workflow-panel"><h2>12-month issuance and activity trend</h2><div className="table-wrap"><table><thead><tr><th>Month</th><th>Members</th><th>Institutions</th><th>Applications</th><th>Licenses</th><th>Credentials</th></tr></thead><tbody>{trend.map((row) => <tr key={row.month}><td>{row.month}</td><td>{row.members}</td><td>{row.institutions}</td><td>{row.applications}</td><td>{row.licenses}</td><td>{row.credentials}</td></tr>)}</tbody></table></div></section><section className="workflow-panel"><h2>Regional breakdown</h2><div className="table-wrap"><table><thead><tr><th>Region</th><th>Members</th><th>Institutions</th><th>Credentials</th></tr></thead><tbody>{regions.map((row) => <tr key={row.regionId}><td>{row.region}</td><td>{row.members}</td><td>{row.institutions}</td><td>{row.credentials}</td></tr>)}</tbody></table></div></section></main>;
}
