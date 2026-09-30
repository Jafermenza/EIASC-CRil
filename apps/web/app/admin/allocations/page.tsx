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
import { useEffect, useState } from 'react';

type Run = { id: string; period: string; fundingPool: string | number; totalAllocated: string | number; status: string; policy: { name: string; version: string } };

export default function AllocationsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [name, setName] = useState('M8 allocation policy');
  const [version, setVersion] = useState('2026.1');
  const [period, setPeriod] = useState('2026-Q1');
  const [fundingPool, setFundingPool] = useState('2000');
  const [policyId, setPolicyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const headers = () => ({ 'Content-Type': 'application/json', authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` });

  async function loadRuns() {
    const response = await fetch('/api/v1/allocations/runs', { headers: headers() });
    if (!response.ok) throw new Error('Unable to load allocation history.');
    setRuns(await response.json() as Run[]);
  }

  async function createPolicy() {
    const response = await fetch('/api/v1/allocations/policies', {
      method: 'POST', headers: headers(), body: JSON.stringify({ name, version, eligibilityRules: {}, formulaDefinition: { perMemberMultiplier: 0.5, equalizationPerInstitution: 10 } }),
    });
    const body = await response.json() as { id?: string; message?: string };
    if (!response.ok) throw new Error(body.message || 'Unable to create policy.');
    setPolicyId(body.id || '');
    setMessage(`Draft policy ${version} created. Approve it before calculating.`);
    await loadRuns();
  }

  async function approvePolicy() {
    if (!policyId) throw new Error('Create a policy first.');
    const response = await fetch(`/api/v1/allocations/policies/${policyId}/approve`, { method: 'PATCH', headers: headers() });
    const body = await response.json() as { message?: string };
    if (!response.ok) throw new Error(body.message || 'Unable to approve policy.');
    setMessage('Policy approved. It is ready for a preview calculation.');
  }

  async function preview() {
    if (!policyId) throw new Error('Create and approve a policy first.');
    const response = await fetch('/api/v1/allocations/runs/preview', {
      method: 'POST', headers: headers(), body: JSON.stringify({ policyId, period, fundingPool: Number(fundingPool) }),
    });
    const body = await response.json() as { id?: string; message?: string };
    if (!response.ok) throw new Error(body.message || 'Unable to calculate allocation preview.');
    setMessage(`Preview run ${body.id} created.`);
    await loadRuns();
  }

  async function transition(id: string, action: 'review' | 'finalize') {
    const response = await fetch(`/api/v1/allocations/runs/${id}/${action}`, { method: 'PATCH', headers: headers() });
    const body = await response.json() as { message?: string };
    if (!response.ok) throw new Error(body.message || `Unable to ${action} allocation run.`);
    setMessage(`Allocation run ${action === 'review' ? 'submitted for review' : 'finalized'}.`);
    await loadRuns();
  }

  async function exportRun(id: string) {
    const response = await fetch(`/api/v1/allocations/runs/${id}/export`, { headers: headers() });
    if (!response.ok) throw new Error('Unable to export allocation run.');
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'allocation.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  useEffect(() => { void loadRuns().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load allocation history.')); }, []);
  const runAction = (run: Run) => run.status === 'PREVIEW' ? 'review' : run.status === 'UNDER_REVIEW' ? 'finalize' : null;

  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · RESOURCE ALLOCATION</p><h1>Resource allocation</h1><p className="lead">Create versioned allocation policies, calculate transparent previews from verified active membership data, review results, and retain an auditable history. This module calculates theoretical allocations only; it does not settle payments.</p></div>
    {error && <section className="error-reason" role="alert">{error}</section>}
    {message && <section className="workflow-panel" role="status"><p>{message}</p></section>}
    <section className="workflow-panel"><h2>Policy</h2><div className="action-row"><label>Name <input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Version <input value={version} onChange={(event) => setVersion(event.target.value)} /></label><button className="button button-primary" onClick={() => void createPolicy().catch((reason) => setError(reason instanceof Error ? reason.message : 'Policy creation failed'))}>Create draft</button><button className="button button-secondary" onClick={() => void approvePolicy().catch((reason) => setError(reason instanceof Error ? reason.message : 'Policy approval failed'))}>Approve</button></div></section>
    <section className="workflow-panel"><h2>Calculation preview</h2><div className="action-row"><label>Policy ID <input value={policyId} onChange={(event) => setPolicyId(event.target.value)} placeholder="Policy ID" /></label><label>Period <input value={period} onChange={(event) => setPeriod(event.target.value)} /></label><label>Funding pool <input type="number" min="0" step="0.01" value={fundingPool} onChange={(event) => setFundingPool(event.target.value)} /></label><button className="button button-primary" onClick={() => void preview().catch((reason) => setError(reason instanceof Error ? reason.message : 'Preview failed'))}>Calculate preview</button></div></section>
    <section className="workflow-panel"><h2>Allocation history</h2><div className="table-wrap"><table><thead><tr><th>Period</th><th>Policy</th><th>Funding pool</th><th>Total allocated</th><th>Status</th><th>Actions</th></tr></thead><tbody>{runs.map((run) => { const action = runAction(run); return <tr key={run.id}><td>{run.period}</td><td>{run.policy.name} · {run.policy.version}</td><td>{run.fundingPool}</td><td>{run.totalAllocated}</td><td>{run.status}</td><td>{action && <button className="button button-secondary" onClick={() => void transition(run.id, action).catch((reason) => setError(reason instanceof Error ? reason.message : 'Transition failed'))}>{action === 'review' ? 'Submit review' : 'Finalize'}</button>} <button className="button button-secondary" onClick={() => void exportRun(run.id).catch((reason) => setError(reason instanceof Error ? reason.message : 'Export failed'))}>Export CSV</button></td></tr>; })}</tbody></table></div></section>
  </main>;
}
