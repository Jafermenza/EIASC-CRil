'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';

type Credential = {
  id: string;
  credentialNumber: string;
  type: 'MEMBER' | 'INSTITUTION' | 'LICENSE';
  status: string;
  issuedAt: string;
  expiresAt: string | null;
  issueDateHijri: string;
  expiryDateHijri: string | null;
  validForYears: number | null;
  authorizedSigner: string | null;
  authorizedTitle: string | null;
  signatureImageUrl: string | null;
  sealImageUrl: string | null;
  title: string;
  locationLabel: string;
  publicName: string;
  institution?: string | null;
  publicationStatus: string;
  qrPayload: string;
};

const fmt = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value))
    : '—';

export default function CredentialPage({ params }: { params: Promise<{ id: string }> }) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    params
      .then(async ({ id }) => {
        const response = await fetch(`/api/v1/credentials/${encodeURIComponent(id)}`, {
          headers: {
            authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.message || 'Credential unavailable');
        }
        setCredential(body);
        setQr(
          await QRCode.toDataURL(`${location.origin}${body.qrPayload}`, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 220,
          }),
        );
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Credential unavailable'));
  }, [params]);

  if (error) {
    return (
      <main className="shell">
        <section className="error-reason">{error}</section>
      </main>
    );
  }

  if (!credential) {
    return (
      <main className="shell">
        <p>Loading credential…</p>
      </main>
    );
  }

  const member = credential.type === 'MEMBER';
  const certificate = credential.type === 'LICENSE' || credential.type === 'INSTITUTION';

  return (
    <main className="credential-shell">
      <div className="credential-actions">
        <Link className="button" href="/member">Back to profile</Link>
        <button className="button button-primary" onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      {member ? (
        <article className="member-card">
          <div className="card-pattern" />
          <div className="card-head">
            <div>
              <p className="card-kicker">EIASC</p>
              <h1>{credential.title}</h1>
            </div>
            {qr && <img className="card-qr" src={qr} alt="Credential verification QR code" />}
          </div>
          <div className="card-body">
            <div>
              <p className="field-label">Member</p>
              <h2>{credential.publicName}</h2>
              <p><strong>Membership ID</strong> {credential.credentialNumber}</p>
              <p><strong>Issued</strong> {fmt(credential.issuedAt)} · {credential.issueDateHijri}</p>
              <p><strong>Expires</strong> {fmt(credential.expiresAt)} · {credential.expiryDateHijri || '—'}</p>
            </div>
          </div>
          <div className="card-foot">
            <span>Valid for {credential.validForYears ?? '—'} year(s)</span>
            <span>Scan to verify</span>
          </div>
        </article>
      ) : (
        <article className="certificate">
          <div className="islamic-frame">
            <div className="certificate-inner">
              <div className="certificate-head">
                <p className="arabic-mark">﷽</p>
                <p className="eyebrow">{credential.title}</p>
                <h1>{credential.institution || credential.publicName}</h1>
                <p className="certificate-subtitle">DIGITAL {certificate ? 'LICENSE CERTIFICATE' : 'CREDENTIAL'}</p>
              </div>

              <div className="certificate-content">
                <p>This certifies that</p>
                <h2>{credential.publicName}</h2>
                {credential.institution && credential.publicName !== credential.institution && (
                  <p className="certificate-org">{credential.institution}</p>
                )}
                <div className="certificate-grid">
                  <div><span>Certificate No.</span><strong>{credential.credentialNumber}</strong></div>
                  <div><span>Location</span><strong>{credential.locationLabel}</strong></div>
                  <div><span>Issue date · Gregorian</span><strong>{fmt(credential.issuedAt)}</strong></div>
                  <div><span>Issue date · Hijri</span><strong>{credential.issueDateHijri}</strong></div>
                  <div><span>Expiry date · Gregorian</span><strong>{fmt(credential.expiresAt)}</strong></div>
                  <div><span>Expiry date · Hijri</span><strong>{credential.expiryDateHijri || '—'}</strong></div>
                </div>
              </div>

              <div className="certificate-signatures">
                <div>
                  {credential.signatureImageUrl && <img src={credential.signatureImageUrl} alt="Authorized signature" />}
                  <strong>{credential.authorizedSigner || 'Authorized Signatory'}</strong>
                  <span>{credential.authorizedTitle || 'Authorized Signatory'}</span>
                </div>
                {qr && (
                  <div className="certificate-qr">
                    <img src={qr} alt="Credential verification QR code" />
                    <small>Scan to verify authenticity</small>
                  </div>
                )}
                {credential.sealImageUrl && (
                  <div>
                    <img className="seal" src={credential.sealImageUrl} alt="Official scanned seal" />
                  </div>
                )}
              </div>

              <p className="certificate-validity">
                Valid for {credential.validForYears ?? '—'} year(s) · Issued by {credential.institution || 'EIASC'}
              </p>
            </div>
          </div>
        </article>
      )}

      <style jsx global>{`body{background:#f3f1eb}.credential-shell{max-width:1100px;margin:0 auto;padding:32px 20px 70px}.credential-actions{display:flex;justify-content:flex-end;gap:12px;margin-bottom:20px}.member-card{width:85.6mm;height:53.98mm;min-width:323px;position:relative;overflow:hidden;border-radius:18px;background:#fff;border:1px solid #d9d0b8;box-shadow:0 18px 50px #0002;padding:18px;box-sizing:border-box}.card-pattern{position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg,#b89955 0 8deg,transparent 8deg 16deg);opacity:.08}.card-head,.card-body,.card-foot{position:relative;z-index:1}.card-head{display:flex;justify-content:space-between;gap:12px}.card-kicker{font-size:10px;letter-spacing:.18em;margin:0 0 4px;font-weight:800}.card-head h1{font-size:15px;margin:0;max-width:190px}.card-qr{width:52px;height:52px;background:white;padding:3px;border-radius:5px}.card-body{margin-top:15px}.card-body h2{font-size:20px;margin:2px 0 8px}.field-label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin:0}.card-body p{font-size:10px;margin:4px 0}.card-foot{position:absolute;bottom:14px;left:18px;right:18px;display:flex;justify-content:space-between;font-size:8px;font-weight:700}.certificate{width:210mm;min-height:297mm;background:#fff;margin:0 auto;box-sizing:border-box}.islamic-frame{min-height:297mm;padding:13mm;box-sizing:border-box;background:repeating-conic-gradient(from 0deg at 50% 50%,#8d7440 0 5deg,#f8f4e9 5deg 10deg)}.certificate-inner{min-height:271mm;box-sizing:border-box;background:rgba(255,255,255,.96);border:7px double #8d7440;padding:22mm 20mm;position:relative}.certificate-head{text-align:center}.arabic-mark{font-size:30px;margin:0 0 8px}.certificate-head h1{font-size:29px;margin:10px 0}.certificate-subtitle{letter-spacing:.3em;font-size:12px;font-weight:800}.certificate-content{text-align:center;margin-top:25mm}.certificate-content>p{font-size:16px}.certificate-content h2{font-size:32px;margin:8px 0}.certificate-org{font-size:17px;font-weight:700}.certificate-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22mm 0 15mm;text-align:left}.certificate-grid div{border-bottom:1px solid #ddd;padding:8px}.certificate-grid span,.certificate-grid strong{display:block}.certificate-grid span{font-size:9px;text-transform:uppercase;letter-spacing:.1em}.certificate-grid strong{font-size:13px;margin-top:3px}.certificate-signatures{display:grid;grid-template-columns:1fr 160px 1fr;align-items:end;gap:20px;text-align:center}.certificate-signatures>div{min-height:70px}.certificate-signatures img{max-width:125px;max-height:55px;object-fit:contain;display:block;margin:0 auto 4px}.certificate-signatures strong,.certificate-signatures span{display:block;font-size:11px}.certificate-qr img{width:95px;height:95px}.certificate-qr small{display:block;font-size:8px}.certificate-signatures .seal{width:100px;height:100px;border-radius:50%}.certificate-validity{text-align:center;font-size:10px;margin-top:14mm}.error-reason{max-width:700px;margin:40px auto}.button{cursor:pointer}@media(max-width:900px){.certificate{transform-origin:top center;transform:scale(.8);margin-bottom:-55mm}.certificate-inner{padding:15mm}.certificate-grid{margin:12mm 0}.credential-actions{justify-content:space-between}}@media print{body{background:#fff!important}.credential-shell{padding:0;max-width:none}.credential-actions{display:none}.member-card{box-shadow:none;margin:0;width:85.6mm;height:53.98mm}.certificate{margin:0;width:210mm;min-height:297mm}.islamic-frame{min-height:297mm} @page{size:A4;margin:0}}`}</style>
    </main>
  );
}
