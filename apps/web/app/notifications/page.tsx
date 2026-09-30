'use client';

import { useEffect, useState } from 'react';

type Notification = { id: string; title: string; message: string; status: string; createdAt: string };
const API = '/api/v1';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [reading, setReading] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const token = localStorage.getItem('accessToken') || ''; const response = await fetch(`${API}/notifications`, { headers: { authorization: `Bearer ${token}` } }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'The notification service returned an error.'); setItems(body || []); }
    catch (err) { setError(err instanceof Error ? err.message : 'The notification service could not be reached.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function read(id: string) {
    setReading(id); setError('');
    try { const token = localStorage.getItem('accessToken') || ''; const response = await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: { authorization: `Bearer ${token}` } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'The notification could not be marked as read.'); setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'READ' } : item)); }
    catch (err) { setError(err instanceof Error ? err.message : 'The notification could not be marked as read.'); }
    finally { setReading(''); }
  }
  return <main className="shell" style={{ maxWidth: 920 }}><div className="hero"><p className="eyebrow">EIASC · INBOX</p><h1>Notifications</h1><p className="lead">Workflow updates, correction requests and other operational messages.</p></div>
    {error && <section className="error-reason" role="alert"><strong>We could not complete that action</strong><span>{error}</span><button className="button button-secondary" onClick={() => void load()}>Try again</button></section>}
    {loading ? <section className="notifications-grid" aria-busy="true"><div className="notification-card"><div className="skeleton" style={{ width: 36, height: 36 }} /><div><div className="skeleton" style={{ width: '55%', height: 15, marginBottom: 9 }} /><div className="skeleton" style={{ width: '90%', height: 12 }} /></div></div><div className="notification-card"><div className="skeleton" style={{ width: 36, height: 36 }} /><div><div className="skeleton" style={{ width: '45%', height: 15, marginBottom: 9 }} /><div className="skeleton" style={{ width: '78%', height: 12 }} /></div></div></section> : items.length === 0 ? <section className="workflow-panel"><p className="eyebrow">ALL CLEAR</p><h2>No notifications yet</h2><p className="lead">New registration decisions, correction requests and other workflow updates will appear here.</p></section> : <section className="notifications-grid">{items.map((item) => <article className={`notification-card ${item.status !== 'READ' ? 'unread' : ''}`} key={item.id}><div className="notification-icon" aria-hidden="true">{item.status === 'READ' ? '✓' : '•'}</div><div><p className="eyebrow">{item.status === 'READ' ? 'READ' : 'NEW'}</p><h2>{item.title}</h2><p>{item.message}</p></div><div><small>{new Date(item.createdAt).toLocaleString()}</small>{item.status !== 'READ' && <button className="button button-secondary" disabled={reading === item.id} onClick={() => void read(item.id)}>{reading === item.id ? 'Saving…' : 'Mark as read'}</button>}</div></article>)}</section>}
  </main>;
}
