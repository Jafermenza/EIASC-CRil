'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';
type Summary = { outbox: Array<{ status: string; _count: { _all: number } }>; deliveries: Array<{ status: string; _count: { _all: number } }>; failedDeliveries: number; pendingDeliveries: number };
type Failure = { id: string; channel: string; attempts: number; lastError?: string | null; updatedAt: string; recipient: { id: string; email?: string | null; phone?: string | null }; outboxEvent: { eventId: string; eventType: string; aggregateType: string; aggregateId?: string | null } };
type Delivery = { id: string; channel: string; status: string; attempts: number; sentAt?: string | null; lastError?: string | null; createdAt: string; recipient: { email?: string | null; phone?: string | null; id: string }; notification?: { id: string; type: string; title: string; status: string } | null; outboxEvent: { eventId: string; eventType: string; aggregateType: string; aggregateId?: string | null; status: string } };

export default function NotificationMonitoringPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError('');
    try {
      const headers = { authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` };
      const [summaryResponse, failureResponse, historyResponse] = await Promise.all([
        fetch(`${API}/notifications/admin/summary`, { headers, cache: 'no-store' }),
        fetch(`${API}/notifications/admin/delivery-failures?limit=100`, { headers, cache: 'no-store' }),
        fetch(`${API}/notifications/admin/deliveries?status=SENT`, { headers, cache: 'no-store' }),
      ]);
      const summaryBody = await summaryResponse.json(); const failureBody = await failureResponse.json(); const historyBody = await historyResponse.json();
      if (!summaryResponse.ok) throw new Error(summaryBody.message || 'Unable to load notification summary');
      if (!failureResponse.ok) throw new Error(failureBody.message || 'Unable to load failed deliveries');
      if (!historyResponse.ok) throw new Error(historyBody.message || 'Unable to load notification history');
      setSummary(summaryBody); setFailures(failureBody); setHistory(historyBody);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load notification monitoring'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <main className="shell">
    <div className="hero"><p className="eyebrow">EIASC · SUPER ADMIN</p><h1>Notification delivery monitoring</h1><p className="lead">Durable outbox events, retry state, delivery failures and channel history.</p></div>
    {error && <p className="error">{error}</p>}
    {loading && <p>Loading delivery state…</p>}
    {summary && <section className="grid">
      <article className="workflow-panel"><h2>Outbox</h2>{summary.outbox.map((item) => <p key={item.status}>{item.status}: {item._count._all}</p>)}</article>
      <article className="workflow-panel"><h2>Deliveries</h2>{summary.deliveries.map((item) => <p key={item.status}>{item.status}: {item._count._all}</p>)}</article>
      <article className="workflow-panel"><h2>Attention</h2><p>Pending: {summary.pendingDeliveries}</p><p>Failed: {summary.failedDeliveries}</p></article>
    </section>}
    <section className="workflow-panel">
      <div className="section-heading"><div><p className="eyebrow">DELIVERY HISTORY</p><h2>Recent sent notifications</h2></div></div>
      {history.length === 0 ? <p>No sent deliveries recorded yet.</p> : <div className="table-wrap"><table><thead><tr><th>Event</th><th>Channel</th><th>Recipient</th><th>Attempts</th><th>Sent</th></tr></thead><tbody>
        {history.map((item) => <tr key={item.id}><td>{item.outboxEvent.eventType}<br /><small>{item.outboxEvent.eventId}</small></td><td>{item.channel}</td><td>{item.recipient.email || item.recipient.phone || item.recipient.id}</td><td>{item.attempts}</td><td>{item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}</td></tr>)}
      </tbody></table></div>}
    </section>
    <section className="workflow-panel">
      <div className="section-heading"><div><p className="eyebrow">RETRY HISTORY</p><h2>Failed deliveries</h2></div><button className="button" onClick={() => void load()}>Refresh</button></div>
      {failures.length === 0 ? <p>No failed deliveries currently recorded.</p> : <div className="table-wrap"><table><thead><tr><th>Event</th><th>Channel</th><th>Recipient</th><th>Attempts</th><th>Last error</th><th>Updated</th></tr></thead><tbody>
        {failures.map((item) => <tr key={item.id}><td>{item.outboxEvent.eventType}<br /><small>{item.outboxEvent.eventId}</small></td><td>{item.channel}</td><td>{item.recipient.email || item.recipient.phone || item.recipient.id}</td><td>{item.attempts}</td><td>{item.lastError || '—'}</td><td>{new Date(item.updatedAt).toLocaleString()}</td></tr>)}
      </tbody></table></div>}
    </section>
  </main>;
}
