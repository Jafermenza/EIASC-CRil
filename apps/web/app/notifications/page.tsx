'use client';

import { useEffect, useState } from 'react';

type Notification = { id: string; title: string; message: string; status: string; createdAt: string };
export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { const token = localStorage.getItem('accessToken') || ''; fetch('/api/v1/notifications', { headers: { authorization: `Bearer ${token}` } }).then((response) => response.json()).then((body) => setItems(body || [])); }, []);
  async function read(id: string) { const token = localStorage.getItem('accessToken') || ''; await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH', headers: { authorization: `Bearer ${token}` } }); setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'READ' } : item)); }
  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · INBOX</p><h1>Notifications</h1><p className="lead">Your in-app operational messages and workflow updates.</p></div><section className="grid">{items.map((item) => <article key={item.id}><p className="eyebrow">{item.status}</p><h2>{item.title}</h2><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small>{item.status !== 'READ' && <button className="button button-secondary" onClick={() => void read(item.id)}>Mark as read</button>}</article>)}{items.length === 0 && <article><p className="empty-state">No notifications.</p></article>}</section></main>;
}
