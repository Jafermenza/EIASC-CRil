'use client';

import { useState } from 'react';

type CredentialType = 'MEMBER' | 'INSTITUTION' | 'LICENSE';
type Issued = { credentialNumber: string; verificationUrl: string; qrPayload: string; status: string; expiresAt?: string | null };

export default function CredentialsPage() {
  const [type, setType] = useState<CredentialType>('INSTITUTION');
  const [subjectId, setSubjectId] = useState('');
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState('');
  async function issue(event: React.FormEvent) {
    event.preventDefault(); setError(''); setIssued(null);
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch('/api/v1/credentials', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ type, subjectId }) });
    const body = await response.json();
    if (!response.ok) { setError(body.message || 'Unable to issue credential'); return; }
    setIssued(body); setSubjectId('');
  }
  return <main className="shell" style={{ maxWidth: 900 }}><div className="hero"><p className="eyebrow">EIASC · CREDENTIALS</p><h1>Digital credentials</h1><p className="lead">Issue a secure reference credential for an approved member, institution, or license.</p></div>{error && <section className="error-reason" role="alert"><strong>Credential issuance failed</strong><span>{error}</span></section>}<section className="workflow-panel"><form className="form-grid" onSubmit={issue}><div className="field"><label htmlFor="credential-type">Credential type</label><select id="credential-type" value={type} onChange={e => setType(e.target.value as CredentialType)}><option value="MEMBER">Member</option><option value="INSTITUTION">Institution</option><option value="LICENSE">License</option></select></div><div className="field"><label htmlFor="subject-id">Subject ID</label><input id="subject-id" required value={subjectId} onChange={e => setSubjectId(e.target.value)} placeholder="UUID"/></div><div className="field field-action"><button className="button button-primary">Issue credential</button></div></form></section>{issued && <section className="workflow-panel"><p className="eyebrow">ISSUED</p><h2>{issued.credentialNumber}</h2><p>Verification reference: <a href={issued.verificationUrl}>{issued.verificationUrl}</a></p><p>Status: {issued.status}</p></section>}</main>;
}
