'use client';

import { useEffect, useState } from 'react';

type TrendRow = { month: string; members: number; institutions: number; applications: number; licenses: number };

export default function ReportsPage() {
  const [trend, setTrend] = useState<TrendRow[]>([]); const [error, setError] = useState('');
  useEffect(() => { const token = localStorage.getItem('accessToken') || ''; fetch('/api/v1/reports/trend?months=12', { headers: { authorization: `Bearer ${token}` } }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Unable to load reporting trend'); setTrend(body); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load reporting trend')); }, []);
  function exportReport() { const token = localStorage.getItem('accessToken') || ''; fetch('/api/v1/reports/export', { headers: { authorization: `Bearer ${token}` } }).then(async (response) => { if (!response.ok) throw new Error('Unable to export report'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'eiasc-report.csv'; anchor.click(); URL.revokeObjectURL(url); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to export report')); }
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · REPORTING</p><h1>Reports &amp; trends</h1><p className="lead">Server-side reporting across registration, membership, institutions and licensing, restricted to your authorized jurisdiction.</p><button className="button button-primary" onClick={exportReport}>Export CSV</button></div>{error&&<section className="error-reason" role="alert">{error}</section>}<section className="workflow-panel"><h2>12-month trend</h2><div className="table-wrap"><table><thead><tr><th>Month</th><th>Members</th><th>Institutions</th><th>Applications</th><th>Licenses</th></tr></thead><tbody>{trend.map((row)=><tr key={row.month}><td>{row.month}</td><td>{row.members}</td><td>{row.institutions}</td><td>{row.applications}</td><td>{row.licenses}</td></tr>)}</tbody></table></div></section></main>;
}
