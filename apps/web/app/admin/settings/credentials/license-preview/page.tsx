'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Config = Record<string, any>;
const API = '/api/v1';

export default function LicensePreviewPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [sample, setSample] = useState({ name: 'Al Noor Islamic Center', code: 'EIASC-INST-2026-001', location: 'Addis Ababa · Bole · Woreda 03' });
  const [error, setError] = useState('');
  useEffect(() => { fetch(`${API}/credentials/configuration`, { headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }, cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load credential design'); setConfig(data); }).catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load credential design')); }, []);
  if (error) return <main className="shell"><section className="error-reason" role="alert">{error}</section></main>;
  if (!config) return <main className="shell"><p>Loading A4 preview…</p></main>;
  return <main className="shell" style={{ maxWidth: 1120 }}><Link className="back-link" href="/admin/settings/credentials">← Credential design studio</Link><div className="hero"><p className="eyebrow">A4 INSTITUTIONAL LICENSE</p><h1>Institution license preview</h1><p className="lead">Review the print composition with sample data. Edit the wording and artwork in the design studio.</p></div><section className="workflow-panel"><div className="form-grid"><label>Sample institution<input value={sample.name} onChange={event => setSample({ ...sample, name: event.target.value })} /></label><label>Sample license number<input value={sample.code} onChange={event => setSample({ ...sample, code: event.target.value })} /></label><label>Sample location<input value={sample.location} onChange={event => setSample({ ...sample, location: event.target.value })} /></label></div></section><section style={{ aspectRatio: '1 / 1.414', maxWidth: 760, margin: '24px auto', padding: 'clamp(28px, 6vw, 76px)', boxSizing: 'border-box', border: '10px solid #b89455', background: config.frameBackgroundUrl ? `url(${config.frameBackgroundUrl}) center/cover` : '#fffdf7', color: '#1e293b', boxShadow: '0 18px 50px rgba(15,23,42,.18)' }}><div style={{ textAlign: 'center' }}><p className="eyebrow">{config.authorizingNameEn || config.issuingAuthority}</p><h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)' }}>{config.licenseTitle || config.certificateTitle}</h2><p>{config.certificateSubtitle}</p><div style={{ margin: '48px 0', textAlign: 'left' }}><h2>{sample.name}</h2><p><strong>{config.certificateNumberLabel}:</strong> {sample.code}</p><p><strong>{config.locationLabel}:</strong> {sample.location}</p><p>{config.bodyEn}</p><p>{config.additionalInstitutionInfo}</p></div><div className="action-row" style={{ justifyContent: 'space-between' }}><span>{config.issueDateLabel}: 13 Sep 2026</span><span>{config.expiryDateLabel}: 13 Sep 2027</span></div><p style={{ marginTop: 54 }}>{config.authorizedSigner || 'Authorized signer'} · {config.authorizedTitle || 'Authorized title'}</p></div></section></main>;
}
