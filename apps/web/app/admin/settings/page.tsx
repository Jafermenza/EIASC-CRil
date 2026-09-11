'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API = '/api/v1';
type Health = { ready: boolean; regions: number; zones: number };

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [sending, setSending] = useState(false);
  useEffect(() => { fetch(`${API}/locations/health`, { headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Unable to read platform settings'); setHealth(body); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to read platform settings')); }, []);
  async function testEmail() { setSending(true); setError(''); setMessage(''); try { const response = await fetch(`${API}/notifications/test-email`, { method: 'POST', headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Live email delivery failed'); setMessage(`Live email delivered to ${body.recipient}.`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Live email delivery failed'); } finally { setSending(false); } }
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · SUPER ADMIN</p><h1>Platform settings</h1><p className="lead">System configuration, controlled reference data and production readiness for the CRil platform.</p></div>
    {error && <section className="error-reason" role="alert">{error}</section>}{message && <section className="workflow-panel" role="status">{message}</section>}
    <section className="grid">
      <article className="workflow-panel"><p className="eyebrow">REFERENCE DATA</p><h2>Geography</h2><p>Registration depends on a preloaded Region → Zone/City → Sub-city/Town → District/Woreda hierarchy stored in PostgreSQL.</p><div className="status-line"><strong>{health?.ready ? 'Ready' : health ? 'Not ready' : 'Checking…'}</strong><span>{health ? `${health.regions} regions · ${health.zones} zones` : 'Checking database'}</span></div><Link className="button button-primary" href="/admin/settings/geography">Manage geography</Link></article>
      <article className="workflow-panel"><p className="eyebrow">MESSAGING</p><h2>Live email delivery</h2><p>Resend credentials are deployment secrets. Use this action after configuring them to prove a real external delivery before release.</p><div className="status-line"><strong>Environment-managed</strong><span>RESEND_API_KEY · RESEND_FROM_EMAIL</span></div><button className="button button-primary" type="button" disabled={sending} onClick={testEmail}>{sending ? 'Sending live test…' : 'Send live test email'}</button></article>
      <article className="workflow-panel"><p className="eyebrow">DATABASE</p><h2>Production bootstrap</h2><p>Before exposing the public port, run the database bootstrap command. It applies migrations, seeds system roles/admin, imports the pinned geography dataset and verifies expected geography counts.</p><code>npm run db:bootstrap</code></article>
    </section>
  </main>;
}
