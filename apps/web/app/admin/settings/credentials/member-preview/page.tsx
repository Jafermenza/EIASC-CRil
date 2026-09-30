'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Config = Record<string, any>;
const API = '/api/v1';

export default function MemberPreviewPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [sample, setSample] = useState({ name: 'Amina Mohammed', number: 'EIASC-MEM-2026-001', institution: 'Al Noor Islamic Center', location: 'Addis Ababa · Bole · Woreda 03' });
  const [error, setError] = useState('');
  useEffect(() => { fetch(`${API}/credentials/configuration`, { headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }, cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load credential design'); setConfig(data); }).catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load credential design')); }, []);
  if (error) return <main className="shell"><section className="error-reason" role="alert">{error}</section></main>;
  if (!config) return <main className="shell"><p>Loading wallet ID preview…</p></main>;
  return <main className="shell" style={{ maxWidth: 1120 }}><Link className="back-link" href="/admin/settings/credentials">← Credential design studio</Link><div className="hero"><p className="eyebrow">WALLET-SIZE MEMBER ID</p><h1>Individual membership ID preview</h1><p className="lead">Review the compact member credential with editable sample data. Real member and institution records are only used during issuance.</p></div><section className="workflow-panel"><div className="form-grid"><label>Sample member name<input value={sample.name} onChange={event => setSample({ ...sample, name: event.target.value })} /></label><label>Sample membership number<input value={sample.number} onChange={event => setSample({ ...sample, number: event.target.value })} /></label><label>Sample institution<input value={sample.institution} onChange={event => setSample({ ...sample, institution: event.target.value })} /></label><label>Sample location<input value={sample.location} onChange={event => setSample({ ...sample, location: event.target.value })} /></label></div></section><section style={{ width: 'min(100%, 640px)', aspectRatio: '1.586 / 1', margin: '24px auto', padding: 30, boxSizing: 'border-box', border: '8px solid #b89455', borderRadius: 16, background: config.memberFrameBackgroundUrl ? `url(${config.memberFrameBackgroundUrl}) center/cover` : 'linear-gradient(135deg,#f7f1e4,#fff)', color: '#1e293b', boxShadow: '0 18px 50px rgba(15,23,42,.18)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, height: '100%' }}><div><p className="eyebrow">{config.issuingAuthority}</p><h2>{config.memberCardTitle}</h2><h3>{sample.name}</h3><p><strong>{config.membershipLabel}:</strong> {sample.number}</p><p><strong>{config.institutionLabel}:</strong> {sample.institution}</p><p><strong>{config.locationLabel}:</strong> {sample.location}</p><p>{config.memberAdditionalInfo || 'Active EIASC member credential sample'}</p></div><div style={{ width: 96, height: 96, border: '2px dashed currentColor', display: 'grid', placeItems: 'center', alignSelf: 'center' }}>QR</div></div></section></main>;
}
