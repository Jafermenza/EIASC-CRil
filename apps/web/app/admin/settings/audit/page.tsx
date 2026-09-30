'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

type AuditLog = { id: string; action: string; entityType: string; entityId?: string | null; requestId?: string | null; metadata?: unknown; createdAt: string; actor?: { email?: string | null; phone?: string | null } | null };

export default function AuditSettingsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: '100' }); if (action) params.set('action', action); if (entityType) params.set('entityType', entityType);
      const response = await fetch(`${API}/audit/logs?${params}`, { headers: { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }, cache: 'no-store' });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Unable to load audit logs'); setLogs(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load audit logs'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <main className="shell" style={{ maxWidth: 1200 }}><div className="hero"><p className="eyebrow">EIASC · SECURITY & GOVERNANCE</p><h1>Audit log</h1><p className="lead">See who accessed or changed protected workflows, including authentication, users, payments, registrations, credentials, and settings.</p></div><section className="workflow-panel"><div className="form-grid"><label>Action contains<input value={action} onChange={event => setAction(event.target.value)} placeholder="LOGIN, USER, PAYMENT" /></label><label>Entity type contains<input value={entityType} onChange={event => setEntityType(event.target.value)} placeholder="User, Registration" /></label><div className="field-action"><button className="button button-primary" type="button" onClick={() => void load()}>Refresh log</button></div></div></section>{error && <section className="error-reason" role="alert">{error}</section>}<section className="workflow-panel" style={{ marginTop: 18 }}><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Request ID</th><th>Metadata</th></tr></thead><tbody>{logs.length ? logs.map(log => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.actor?.email || log.actor?.phone || 'System'}</td><td><strong>{log.action}</strong></td><td>{log.entityType}<br /><small>{log.entityId || '—'}</small></td><td><small>{log.requestId || '—'}</small></td><td><small>{log.metadata ? JSON.stringify(log.metadata) : '—'}</small></td></tr>) : <tr><td colSpan={6}>{loading ? 'Loading audit events…' : 'No audit events found.'}</td></tr>}</tbody></table></div></section></main>;
}
