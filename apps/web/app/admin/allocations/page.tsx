'use client';

import { useState } from 'react';

const API = '/api/v1';

export default function AllocationsPage() {
  const [policyId, setPolicyId] = useState('');
  const [period, setPeriod] = useState('');
  const [fundingPool, setFundingPool] = useState('');
  const [runId, setRunId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [run, setRun] = useState<Record<string, unknown> | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function preview(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try { const data = await call('/allocations/runs/preview', 'POST', { policyId, period, fundingPool: Number(fundingPool) }); setRun(data); setRunId(data.id); setMessage('Allocation preview created.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to calculate allocation'); }
  }

  async function transition(path: string, success: string) {
    setError(''); setMessage('');
    try { const data = await call(path, 'PATCH'); setRun(data); setMessage(success); }
    catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
  }

  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · ALLOCATION</p><h1>Resource allocation</h1><p className="lead">Prepare reproducible allocation calculations from approved policies. Finalization remains an authorized administrative action.</p></div>{error && <p className="form-error">{error}</p>}{message && <p>{message}</p>}
    <section className="grid"><article><h2>Calculation preview</h2><form onSubmit={preview}><label>Approved policy ID<input required value={policyId} onChange={(e) => setPolicyId(e.target.value)} /></label><label>Calculation period<input required placeholder="2026-Q4" value={period} onChange={(e) => setPeriod(e.target.value)} /></label><label>Funding pool<input required type="number" min="0" step="0.01" value={fundingPool} onChange={(e) => setFundingPool(e.target.value)} /></label><button className="button" type="submit">Calculate preview</button></form></article><article><h2>Run workflow</h2><label>Run ID<input value={runId} onChange={(e) => setRunId(e.target.value)} /></label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="button" type="button" onClick={() => void transition(`/allocations/runs/${encodeURIComponent(runId)}/review`, 'Run sent for review.')}>Send for review</button><button className="button" type="button" onClick={() => void transition(`/allocations/runs/${encodeURIComponent(runId)}/finalize`, 'Run finalized.')}>Finalize</button></div></article></section>
    {run && <section className="workflow-panel"><h2>Allocation run</h2><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(run, null, 2)}</pre></section>}
  </main>;
}
