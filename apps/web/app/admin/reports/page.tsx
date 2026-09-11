'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

type Dashboard = { members: number; activeMembers: number; institutions: number; activeInstitutions: number; pendingApplications: number; approvedApplications: number; rejectedApplications: number; activeLicenses: number; expiredLicenses: number; suspendedLicenses: number };

export default function ReportsPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    fetch(`${API}/reports/dashboard`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Unable to load reports'); setData(body); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load reports'));
  }, []);

  const cards: Array<[keyof Dashboard, string]> = [
    ['members', 'Total members'], ['activeMembers', 'Active members'], ['institutions', 'Institutions'], ['activeInstitutions', 'Active institutions'],
    ['pendingApplications', 'Pending applications'], ['approvedApplications', 'Approved applications'], ['rejectedApplications', 'Rejected applications'], ['activeLicenses', 'Active licenses'],
    ['expiredLicenses', 'Expired licenses'], ['suspendedLicenses', 'Suspended licenses'],
  ];
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · REPORTING</p><h1>Institutional reports</h1><p className="lead">Operational indicators are calculated server-side and restricted to your authorized jurisdiction.</p></div>{error && <p className="form-error">{error}</p>}<section className="grid">{data && cards.map(([key, label]) => <article key={key}><p className="eyebrow">{label}</p><h2>{data[key]}</h2></article>)}</section></main>;
}
