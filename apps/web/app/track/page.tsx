'use client';

import { FormEvent, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Record<string, string | null> | null>(null);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null);
    try {
      const response = await fetch(`${API}/registrations/${encodeURIComponent(code.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Application not found.');
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Application not found.'); }
  }

  return <main className="shell hero" style={{maxWidth:800}}><p className="eyebrow">EIASC · APPLICATION TRACKING</p><h1>Track your application</h1><p className="lead">Enter the tracking code you received after submission.</p><form onSubmit={submit} className="grid"><section><h2>Tracking code</h2><p><input required placeholder="EIASC-2026-8F42K7" value={code} onChange={(e)=>setCode(e.target.value)} /></p><button className="button">Check status</button></section></form>{error && <article><strong>{error}</strong></article>}{result && <article><h2>{String(result.trackingCode)}</h2><p>Application type: <strong>{String(result.type)}</strong></p><p>Status: <strong>{String(result.status)}</strong></p>{result.submittedAt && <p>Submitted: {String(result.submittedAt)}</p>}</article>}</main>;
}
