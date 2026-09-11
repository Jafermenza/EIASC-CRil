'use client';

import { useEffect, useState } from 'react';

type Dashboard = Record<string, number>;
export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { const token = localStorage.getItem('accessToken') || ''; fetch('/api/v1/reports/dashboard', { headers: { authorization: `Bearer ${token}` } }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Unable to load dashboard'); setData(body); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard')); }, []);
  const labels: Record<string, string> = { members: 'Members', activeMembers: 'Active members', institutions: 'Institutions', activeInstitutions: 'Active institutions', pendingApplications: 'Pending applications', approvedApplications: 'Approved applications', activeLicenses: 'Active licenses', expiredLicenses: 'Expired licenses', suspendedLicenses: 'Suspended licenses' };
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · REPORTING</p><h1>Operational dashboard</h1><p className="lead">Server-side counts for the records visible to your role and jurisdiction.</p></div>{error && <p className="form-error">{error}</p>}<section className="grid">{data && Object.entries(labels).map(([key, label]) => <article key={key}><p className="eyebrow">{label}</p><h2>{data[key] ?? 0}</h2></article>)}</section></main>;
}
