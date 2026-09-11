'use client';

import { FormEvent, useState } from 'react';

const API = '/api/v1';

type Verification = {
  verified: boolean;
  licenseNumber: string;
  licenseType: string;
  status: string;
  issuedAt: string;
  effectiveFrom: string;
  expiresAt: string | null;
  institution: { institutionCode: string | null; name: string; status: string };
};

export default function VerifyPage() {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const response = await fetch(`${API}/licenses/verify/${encodeURIComponent(licenseNumber.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'License could not be verified');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'License could not be verified');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell" style={{ maxWidth: 900 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · PUBLIC VERIFICATION</p>
        <h1>Verify an institutional license</h1>
        <p className="lead">Enter the license number to confirm whether it is currently active.</p>
      </div>
      <section className="workflow-panel">
        <form className="form-grid" onSubmit={verify}>
          <div className="field"><label htmlFor="license-number">License number</label><input id="license-number" required value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="EIASC-L-2026-ABC123" /></div>
          <div className="field field-action"><span aria-hidden="true">&nbsp;</span><button className="button button-primary" disabled={loading}>{loading ? 'Verifying…' : 'Verify license'}</button></div>
        </form>
      </section>
      {error && <section className="grid"><article><p className="form-error" role="alert">{error}</p></article></section>}
      {result && <section className="grid"><article><p className="eyebrow">VERIFIED LICENSE</p><h2>{result.institution.name}</h2><p><strong>License number:</strong> {result.licenseNumber}</p><p><strong>Status:</strong> {result.status}</p><p><strong>Type:</strong> {result.licenseType}</p><p><strong>Issued:</strong> {new Date(result.issuedAt).toLocaleDateString()}</p><p><strong>Expires:</strong> {result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'No expiry set'}</p></article></section>}
    </main>
  );
}
