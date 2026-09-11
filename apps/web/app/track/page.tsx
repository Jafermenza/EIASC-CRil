'use client';

import { FormEvent, useEffect, useState } from 'react';

const API = '/api/v1';

type TrackingResult = {
  type: string;
  trackingCode: string;
  status: string;
  submittedAt: string | null;
  nextAction: string;
  correctionRequirement?: string;
  decisionInformation?: string;
};

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialCode = new URLSearchParams(window.location.search).get('code');
    if (initialCode) setCode(initialCode);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try {
      const params = new URLSearchParams();
      if (phone.trim()) params.set('phone', phone.trim());
      if (firstName.trim()) params.set('firstName', firstName.trim());
      const query = params.toString();
      const response = await fetch(`${API}/registrations/${encodeURIComponent(code.trim())}${query ? `?${query}` : ''}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Application not found.');
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Application not found.'); }
    finally { setLoading(false); }
  }

  return <main className="shell hero" style={{maxWidth:800}}><p className="eyebrow">EIASC · APPLICATION TRACKING</p><h1>Track your application</h1><p className="lead">Enter your tracking code. Phone number and first name can be added as an extra verification check.</p><form onSubmit={submit} className="grid"><section><h2>Application</h2><p><input required placeholder="EIASC-2026-8F42K7" value={code} onChange={(e)=>setCode(e.target.value)} /></p><p><input placeholder="Phone number (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} /></p><p><input placeholder="First name (optional)" value={firstName} onChange={(e)=>setFirstName(e.target.value)} /></p><button className="button" disabled={loading}>{loading ? 'Checking…' : 'Check status'}</button></section></form>{error && <article><strong>{error}</strong></article>}{result && <article><h2>{result.trackingCode}</h2><p>Application type: <strong>{result.type}</strong></p><p>Status: <strong>{result.status}</strong></p>{result.submittedAt && <p>Submitted: {new Date(result.submittedAt).toLocaleString()}</p>}<p>Next action: <strong>{result.nextAction}</strong></p>{result.correctionRequirement && <p>Correction required: {result.correctionRequirement}</p>}{result.decisionInformation && <p>Decision: {result.decisionInformation}</p>}</article>}</main>;
}
