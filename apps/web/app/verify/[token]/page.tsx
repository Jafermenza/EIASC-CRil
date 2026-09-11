'use client';

import { useEffect, useState } from 'react';

type Result = { verified: boolean; credentialType: string; credentialNumber: string; publicName?: string; institution?: string; status: string; issuedAt: string; expiresAt?: string | null };

export default function CredentialVerificationPage({ params }: { params: { token: string } }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/v1/credentials/verify/${encodeURIComponent(params.token)}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Credential not found');
      setResult(body);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Credential verification failed'));
  }, [params.token]);
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · PUBLIC VERIFICATION</p><h1>{result?.verified ? 'Credential verified' : error ? 'Credential unavailable' : 'Verifying credential…'}</h1><p className="lead">{result?.verified ? 'This credential is currently valid in the EIASC registry.' : error || 'Checking the secure verification reference.'}</p></div>{result && <section className="workflow-panel"><dl><dt>Status</dt><dd>{result.status}</dd><dt>Credential number</dt><dd>{result.credentialNumber}</dd><dt>Credential type</dt><dd>{result.credentialType}</dd><dt>Name</dt><dd>{result.publicName || '—'}</dd><dt>Institution</dt><dd>{result.institution || '—'}</dd><dt>Issued</dt><dd>{new Date(result.issuedAt).toLocaleDateString()}</dd><dt>Expires</dt><dd>{result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'No expiry'}</dd></dl></section>}</main>;
}
