'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API = '/api/v1';
type Health = { ready: boolean; regions: number; zones: number };
type Bank = { id?: string; bankName: string; accountName: string; accountNumber: string; branch?: string; active?: boolean };
type PaymentSettings = { individual: number; institution: number; banks: Bank[]; telebirr: { accountName: string; accountNumber: string; configured: boolean } };

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [individualFee, setIndividualFee] = useState('');
  const [institutionFee, setInstitutionFee] = useState('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [sending, setSending] = useState(false); const [saving, setSaving] = useState(false);
  const auth = () => ({ authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`, 'content-type': 'application/json' });

  useEffect(() => {
    const headers = auth();
    Promise.all([
      fetch(`${API}/locations/health`, { headers }),
      fetch(`${API}/payments/settings/admin`, { headers }),
    ]).then(async ([healthResponse, settingsResponse]) => {
      const healthBody = await healthResponse.json(); const settingsBody = await settingsResponse.json();
      if (!healthResponse.ok) throw new Error(healthBody.message || 'Unable to read platform settings');
      if (!settingsResponse.ok) throw new Error(settingsBody.message || 'Unable to read payment settings');
      setHealth(healthBody); setSettings(settingsBody); setIndividualFee(String(settingsBody.individual ?? '')); setInstitutionFee(String(settingsBody.institution ?? '')); setBanks(settingsBody.banks ?? []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to read platform settings'));
  }, []);

  async function savePaymentSettings() {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${API}/payments/settings/admin`, { method: 'PUT', headers: auth(), body: JSON.stringify({
        individualFee: individualFee === '' ? null : Number(individualFee), institutionFee: institutionFee === '' ? null : Number(institutionFee), banks
      }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Unable to save payment settings');
      setSettings(body); setIndividualFee(String(body.individual ?? '')); setInstitutionFee(String(body.institution ?? '')); setBanks(body.banks ?? []); setMessage('Registration payment settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save payment settings'); } finally { setSaving(false); }
  }

  function updateBank(index: number, key: keyof Bank, value: string | boolean) { setBanks((items) => items.map((bank, i) => i === index ? { ...bank, [key]: value } : bank)); }
  function addBank() { setBanks((items) => [...items, { bankName: '', accountName: '', accountNumber: '', branch: '', active: true }]); }
  function removeBank(index: number) { setBanks((items) => items.filter((_, i) => i !== index)); }

  async function testEmail() { setSending(true); setError(''); setMessage(''); try { const response = await fetch(`${API}/notifications/test-email`, { method: 'POST', headers: auth() }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Live email delivery failed'); setMessage(`Live email delivered to ${body.recipient}.`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Live email delivery failed'); } finally { setSending(false); } }

  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · SUPER ADMIN</p><h1>Platform settings</h1><p className="lead">System configuration, payment collection, controlled reference data and production readiness for the CRil platform.</p></div>
    {error && <section className="error-reason" role="alert">{error}</section>}{message && <section className="workflow-panel" role="status">{message}</section>}
    <section className="workflow-panel" style={{marginBottom:20}}><p className="eyebrow">REGISTRATION PAYMENTS</p><h2>Fees and bank accounts</h2><p>These settings are optional. Applicants always choose a payment method; Bank Transfer is shown only when at least one active bank account is configured. Bank-transfer applicants must provide their transaction reference number.</p>
      <div className="grid"><label>Individual registration fee (ETB)<input type="number" min="0" step="0.01" value={individualFee} onChange={(e)=>setIndividualFee(e.target.value)} placeholder="Optional — falls back to environment/default" /></label><label>Institution registration fee (ETB)<input type="number" min="0" step="0.01" value={institutionFee} onChange={(e)=>setInstitutionFee(e.target.value)} placeholder="Optional — falls back to environment/default" /></label></div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:20}}><div><h3>Bank transfer accounts</h3><p className="lead" style={{fontSize:14}}>Add two or more receiving accounts if required. Applicants select the bank first and then see its configured account details.</p></div><button className="button" type="button" onClick={addBank}>Add bank</button></div>
      {banks.length===0 && <div className="status-line"><strong>No bank accounts configured</strong><span>Bank Transfer will not be offered to applicants.</span></div>}
      {banks.map((bank,index)=><article className="workflow-panel" key={bank.id ?? `new-${index}`} style={{marginTop:12}}><div className="grid"><label>Bank name<input value={bank.bankName} onChange={(e)=>updateBank(index,'bankName',e.target.value)} /></label><label>Account name<input value={bank.accountName} onChange={(e)=>updateBank(index,'accountName',e.target.value)} /></label><label>Account number<input value={bank.accountNumber} onChange={(e)=>updateBank(index,'accountNumber',e.target.value)} /></label><label>Branch (optional)<input value={bank.branch ?? ''} onChange={(e)=>updateBank(index,'branch',e.target.value)} /></label></div><div className="action-row"><label><input type="checkbox" checked={bank.active !== false} onChange={(e)=>updateBank(index,'active',e.target.checked)} /> Active for applicants</label><button className="button button-secondary" type="button" onClick={()=>removeBank(index)}>Remove</button></div></article>)}
      <div className="action-row"><button className="button button-primary" type="button" disabled={saving} onClick={savePaymentSettings}>{saving?'Saving…':'Save payment settings'}</button></div>
      <div className="workflow-panel" style={{marginTop:16}}><h3>Telebirr integration</h3><p>Public receiving account details remain deployment configuration. The Telebirr API secret is never stored in the database or exposed in this page.</p><div className="status-line"><strong>{settings?.telebirr.configured ? 'API secret configured' : 'API secret not configured'}</strong><span>Set <code>TELEBIRR_APP_SECRET</code> in the API .env. Other Telebirr credentials may also be required by the merchant integration.</span></div><p>Ethio telecom's developer portal exposes the merchant AppId, Fabric App ID, ShortCode, App Secret and Private Key for the payment integration. urlTelebirr Developer Portalhttps://developer.ethiotelecom.et/user/dashboard</p></div>
    </section>
    <section className="grid">
      <article className="workflow-panel"><p className="eyebrow">REFERENCE DATA</p><h2>Geography</h2><p>Registration depends on a preloaded Region → Zone/City → Sub-city/Town → District/Woreda hierarchy stored in PostgreSQL.</p><div className="status-line"><strong>{health?.ready ? 'Ready' : health ? 'Not ready' : 'Checking…'}</strong><span>{health ? `${health.regions} regions · ${health.zones} zones` : 'Checking database'}</span></div><Link className="button button-primary" href="/admin/settings/geography">Manage geography</Link></article>
      <article className="workflow-panel"><p className="eyebrow">MESSAGING</p><h2>Live email delivery</h2><p>Resend credentials are deployment secrets. Use this action after configuring them to prove a real external delivery before release.</p><div className="status-line"><strong>Environment-managed</strong><span>RESEND_API_KEY · RESEND_FROM_EMAIL</span></div><button className="button button-primary" type="button" disabled={sending} onClick={testEmail}>{sending ? 'Sending live test…' : 'Send live test email'}</button></article>
      <article className="workflow-panel"><p className="eyebrow">DATABASE</p><h2>Production bootstrap</h2><p>Before exposing the public port, run the database bootstrap command. It applies migrations, seeds system roles/admin, imports the pinned geography dataset and verifies expected geography counts.</p><code>npm run db:bootstrap</code></article>
    </section>
  </main>;
}
