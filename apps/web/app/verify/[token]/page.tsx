'use client';

import { use, useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Result = {
  verified: boolean;
  credentialType: string;
  credentialNumber: string;
  publicName?: string;
  institution?: string;
  status: string;
  issuedAt: string;
  expiresAt?: string | null;
};

type CredentialVerificationPageProps = { params: Promise<{ token: string }> };

export default function CredentialVerificationPage({ params }: CredentialVerificationPageProps) {
  const { token } = use(params);
  const [result, setResult] = useState<Result | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const decodedToken = decodeURIComponent(token);

    fetch(`/api/v1/credentials/verify/${encodeURIComponent(decodedToken)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Credential not found');
        if (!active) return;
        setResult(body);
        setQr(await QRCode.toDataURL(window.location.href, { margin: 1, width: 220 }));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Credential verification failed');
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="shell" style={{ maxWidth: 900 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · PUBLIC VERIFICATION</p>
        <h1>{result?.verified ? 'Credential verified' : error ? 'Credential unavailable' : 'Verifying credential…'}</h1>
        <p className="lead">
          {result?.verified ? 'This credential is currently valid in the EIASC registry.' : error || 'Checking the secure verification reference.'}
        </p>
      </div>
      {result && (
        <section className="workflow-panel">
          <div className="grid detail-grid">
            <section>
              <dl>
                <dt>Status</dt><dd>{result.status}</dd>
                <dt>Credential number</dt><dd>{result.credentialNumber}</dd>
                <dt>Credential type</dt><dd>{result.credentialType}</dd>
                <dt>Name</dt><dd>{result.publicName || '—'}</dd>
                <dt>Institution</dt><dd>{result.institution || '—'}</dd>
                <dt>Issued</dt><dd>{new Date(result.issuedAt).toLocaleDateString()}</dd>
                <dt>Expires</dt><dd>{result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'No expiry'}</dd>
              </dl>
            </section>
            <section style={{ textAlign: 'center' }}>
              {qr && <img src={qr} alt="Credential verification QR code" width={220} height={220} />}
              <p><small>Scan to verify this credential.</small></p>
            </section>
          </div>
          <div className="action-row">
            <button className="button button-primary" onClick={() => window.print()}>Print credential</button>
          </div>
        </section>
      )}
    </main>
  );
}
