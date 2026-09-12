'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

type Config = {
  certificateTitle: string;
  certificateSubtitle: string;
  memberCardTitle: string;
  issuingAuthority: string;
  validityYears: number;
  authorizedSigner: string | null;
  authorizedTitle: string | null;
  signatureImageUrl: string | null;
  sealImageUrl: string | null;
  institutionLabel: string;
  locationLabel: string;
  membershipLabel: string;
  certificateNumberLabel: string;
  issueDateLabel: string;
  expiryDateLabel: string;
  validForLabel: string;
};

export default function CredentialSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/credentials/configuration`, {
      headers: {
        authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.message || 'Unable to load credential settings');
        }
        setConfig(body);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load credential settings');
      });
  }, []);

  const set = (key: keyof Config, value: unknown) => {
    setConfig((current) => (current ? { ...current, [key]: value } : current));
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return;

    setSaving(true);
    setError('');
    setSaved('');

    try {
      const response = await fetch(`${API}/credentials/configuration`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || 'Unable to save');
      }
      setConfig(body);
      setSaved('Credential design and issuance settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <main className="shell">
        <div className="hero">
          <p className="eyebrow">EIASC · SUPER ADMIN</p>
          <h1>Credential design</h1>
          <p className="lead">{error || 'Loading configuration…'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell" style={{ maxWidth: 1100 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · SUPER ADMIN</p>
        <h1>Credential design &amp; issuance</h1>
        <p className="lead">
          Configure the published certificate/card wording, validity period and authorized signature/seal artwork.
        </p>
      </div>
      {error && <section className="error-reason" role="alert">{error}</section>}
      {saved && <section className="workflow-panel" role="status">{saved}</section>}
      <form className="workflow-panel form-grid" onSubmit={save}>
        <label>Certificate title<input value={config.certificateTitle} onChange={(event) => set('certificateTitle', event.target.value)} /></label>
        <label>Certificate subtitle<input value={config.certificateSubtitle} onChange={(event) => set('certificateSubtitle', event.target.value)} /></label>
        <label>Member card title<input value={config.memberCardTitle} onChange={(event) => set('memberCardTitle', event.target.value)} /></label>
        <label>Issuing authority<input value={config.issuingAuthority} onChange={(event) => set('issuingAuthority', event.target.value)} /></label>
        <label>Valid for (years)<input type="number" min="1" max="20" value={config.validityYears} onChange={(event) => set('validityYears', Number(event.target.value))} /></label>
        <label>Authorized signer<input value={config.authorizedSigner || ''} onChange={(event) => set('authorizedSigner', event.target.value || null)} /></label>
        <label>Authorized title<input value={config.authorizedTitle || ''} onChange={(event) => set('authorizedTitle', event.target.value || null)} /></label>
        <label>Signature image URL / data URI<input value={config.signatureImageUrl || ''} onChange={(event) => set('signatureImageUrl', event.target.value || null)} placeholder="https://… or data:image/png;base64,…" /></label>
        <label>Scanned seal URL / data URI<input value={config.sealImageUrl || ''} onChange={(event) => set('sealImageUrl', event.target.value || null)} placeholder="https://… or data:image/png;base64,…" /></label>
        <label>Institution label<input value={config.institutionLabel} onChange={(event) => set('institutionLabel', event.target.value)} /></label>
        <label>Location label<input value={config.locationLabel} onChange={(event) => set('locationLabel', event.target.value)} /></label>
        <label>Membership number label<input value={config.membershipLabel} onChange={(event) => set('membershipLabel', event.target.value)} /></label>
        <label>Certificate number label<input value={config.certificateNumberLabel} onChange={(event) => set('certificateNumberLabel', event.target.value)} /></label>
        <label>Issue date label<input value={config.issueDateLabel} onChange={(event) => set('issueDateLabel', event.target.value)} /></label>
        <label>Expiry date label<input value={config.expiryDateLabel} onChange={(event) => set('expiryDateLabel', event.target.value)} /></label>
        <label>Validity label<input value={config.validForLabel} onChange={(event) => set('validForLabel', event.target.value)} /></label>
        <div className="action-row">
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save credential settings'}
          </button>
        </div>
      </form>
    </main>
  );
}
