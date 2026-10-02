'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

const API = '/api/v1';
type TrackingResult = { type: string; trackingCode: string; status: string; submittedAt: string | null; nextAction: string; correctionRequirement?: string; decisionInformation?: string; payment?: { required: boolean; amount: number; currency: string; status: string; nextAction: string; payment: Record<string, unknown> | null } };
const stages = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];

export default function TrackPage() {
  const [code, setCode] = useState(''); const [phone, setPhone] = useState(''); const [firstName, setFirstName] = useState(''); const [paymentMethod, setPaymentMethod] = useState<'TELEBIRR' | 'BANK_TRANSFER'>('TELEBIRR'); const [paymentReference, setPaymentReference] = useState(''); const [receiptUrl, setReceiptUrl] = useState(''); const [result, setResult] = useState<TrackingResult | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { const initialCode = new URLSearchParams(window.location.search).get('code'); if (initialCode) setCode(initialCode); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try { const params = new URLSearchParams(); if (phone.trim()) params.set('phone', phone.trim()); if (firstName.trim()) params.set('firstName', firstName.trim()); const query = params.toString(); const response = await fetch(`${API}/registrations/${encodeURIComponent(code.trim())}${query ? `?${query}` : ''}`); const data = await response.json(); if (!response.ok) throw new Error(data.message ?? 'The tracking code was not found or could not be verified.'); setResult(data); }
    catch (e) { setError(e instanceof Error ? e.message : 'The tracking service could not complete the request.'); }
    finally { setLoading(false); }
  }
  async function payNow() {
    if (!result?.payment?.required) return;
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${API}/payments/chapa/initialize-for-application`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: result.type, trackingCode: result.trackingCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Unable to start payment. Please try again or use the payment instructions on the registration page.');
      if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
      else if (data.alreadyPaid) await refreshStatus();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start payment.'); setLoading(false); }
  }
  async function refreshStatus() {
    const params = new URLSearchParams(); if (phone.trim()) params.set('phone', phone.trim()); if (firstName.trim()) params.set('firstName', firstName.trim());
    const query = params.toString(); const response = await fetch(`${API}/registrations/${encodeURIComponent(code.trim())}${query ? `?${query}` : ''}`); const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'The application status could not be refreshed.'); setResult(data);
  }
  async function submitManualPayment() {
    if (!result?.payment?.required || !paymentReference.trim()) { setError('Payment reference number is required.'); return; }
    setError(''); setLoading(true);
    try {
      const endpoint = result.type === 'INSTITUTION' ? `${API}/institutions/registrations/institution/${encodeURIComponent(result.trackingCode)}/payment` : `${API}/registrations/individual/${encodeURIComponent(result.trackingCode)}/payment`;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payment: { method: paymentMethod, referenceNumber: paymentReference.trim(), receiptUrl: receiptUrl.trim() || undefined } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message ?? 'The payment evidence could not be submitted.');
      setPaymentReference(''); setReceiptUrl(''); await refreshStatus();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit payment evidence.'); } finally { setLoading(false); }
  }
  const current = result?.status || '';
  const activeStage = current === 'CORRECTION_REQUIRED' || current === 'RESUBMITTED' ? 1 : stages.indexOf(current);
  return <main className="shell" style={{ maxWidth: 820 }}><div className="hero"><p className="eyebrow">EIASC · APPLICATION TRACKING</p><h1>Track your application</h1><p className="lead">Enter your tracking code. Phone number and first name can be added as an extra verification check.</p></div>
    <section className="workflow-panel"><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="tracking-code">Tracking code</label><input id="tracking-code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EIASC-I-2026-8F42K7" /><small>Your tracking code is provided after a successful submission.</small></div><div className="field"><label htmlFor="tracking-phone">Phone number <span>(optional)</span></label><input id="tracking-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /><small>Use the phone supplied with the application for an additional check.</small></div><div className="field"><label htmlFor="tracking-name">First name <span>(optional)</span></label><input id="tracking-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div><div className="field field-action"><button className="button button-primary" disabled={loading}>{loading ? 'Checking status…' : 'Check status'}</button></div></form></section>
    {error && <section className="error-reason" role="alert"><strong>Application status could not be loaded</strong><span>{error}</span><small>Check the tracking code and any verification details, then try again.</small></section>}
    {result && <section className="workflow-panel" style={{ marginTop: 18 }}><div className="table-heading"><div><p className="eyebrow">APPLICATION STATUS</p><h2>{result.trackingCode}</h2></div><span className={`status-badge status-${current.toLowerCase().replaceAll('_','-')}`}>{current.replaceAll('_',' ')}</span></div>
      <div className="status-timeline" aria-label="Application status timeline">{stages.map((stage, index) => <div className={index <= activeStage ? 'timeline-step complete' : 'timeline-step'} key={stage}><span>{index <= activeStage ? '✓' : index + 1}</span><strong>{stage.replaceAll('_',' ')}</strong>{index < stages.length - 1 && <i aria-hidden="true" />}</div>)}</div>
      <div className="grid detail-grid"><section><dl><dt>Application type</dt><dd>{result.type}</dd><dt>Submitted</dt><dd>{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'Not yet submitted'}</dd><dt>Next action</dt><dd>{result.nextAction}</dd></dl></section><section>{result.status === 'UNDER_REVIEW' || result.correctionRequirement ? <><p className="eyebrow">{result.correctionRequirement ? 'CORRECTION REQUIRED' : 'UNDER REVIEW'}</p><p>{result.correctionRequirement || 'You can review your submitted information, amend missing details, and resubmit.'}</p><Link className="button button-primary" href={`/track/amend?code=${encodeURIComponent(result.trackingCode)}`}>Review & amend application</Link></> : result.decisionInformation ? <><p className="eyebrow">DECISION</p><p>{result.decisionInformation}</p></> : <p className="empty-state">No additional action is required from you at this stage.</p>}</section></div>
      {result.payment?.required && result.payment.status !== 'PAID' && <section className="workflow-panel" style={{ marginTop: 18 }}><p className="eyebrow">PAYMENT</p><h3>{result.payment.currency} {result.payment.amount.toFixed(2)}</h3><p>{result.payment.nextAction}</p><div className="action-row"><button className="button button-primary" disabled={loading} onClick={payNow}>{loading ? 'Opening payment…' : 'Pay Now with Chapa'}</button></div><div className="grid detail-grid" style={{ marginTop: 16 }}><section><div className="field"><label htmlFor="tracking-payment-method">Manual payment method</label><select id="tracking-payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'TELEBIRR' | 'BANK_TRANSFER')}><option value="TELEBIRR">Telebirr</option><option value="BANK_TRANSFER">Bank transfer</option></select></div><div className="field"><label htmlFor="tracking-payment-reference">Payment reference</label><input id="tracking-payment-reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Transaction or receipt reference" /></div><div className="field"><label htmlFor="tracking-receipt-url">Receipt URL <span>(optional)</span></label><input id="tracking-receipt-url" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://…" /></div><button className="button button-secondary" disabled={loading || !paymentReference.trim()} onClick={submitManualPayment}>Submit payment evidence</button></section><section><p className="eyebrow">WHAT HAPPENS NEXT</p><p>Manual payments remain pending until an authorized Finance or Registrar officer verifies them. A pending payment does not count as verified.</p></section></div></section>}
    </section>}
  </main>;
}
