'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, BadgeCheck, CreditCard, FileClock, ArrowRight, Sparkles, UserRound } from 'lucide-react';

type User = { id: string; email?: string | null; phone?: string | null; roles: string[]; jurisdictionLevel: string; jurisdictionId?: string | null; institutionId?: string | null };
type Notification = { id: string; title: string; message: string; status: string; createdAt: string };

export default function MemberDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    if (!token) return;
    Promise.all([
      fetch('/api/v1/auth/me', { headers: { authorization: `Bearer ${token}` } }).then(async r => { const b=await r.json(); if(!r.ok) throw new Error(b.message||'Unable to load account'); return b.data; }),
      fetch('/api/v1/notifications', { headers: { authorization: `Bearer ${token}` } }).then(async r => { const b=await r.json(); if(!r.ok) throw new Error(b.message||'Unable to load notifications'); return b; }),
    ]).then(([account,inbox]) => { setUser(account); setNotifications(Array.isArray(inbox) ? inbox.slice(0,5) : []); }).catch(e => setError(e instanceof Error ? e.message : 'Unable to load your dashboard.'));
  }, []);

  return <main className="shell role-dashboard">
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <div className="dashboard-kicker"><span className="dashboard-icon-orb"><UserRound size={20}/></span><span>MEMBER PORTAL</span></div>
        <h1>Welcome back</h1>
        <p>Your personal CRil workspace for registration status, digital credentials, notifications and member services.</p>
      </div>
      <div className="dashboard-hero-glow"><Sparkles size={18}/> Personal workspace</div>
    </section>
    {error && <section className="error-reason" role="alert"><strong>Dashboard could not be loaded</strong><span>{error}</span></section>}
    <section className="dashboard-stat-grid">
      <div className="dashboard-stat-card"><span className="dashboard-card-icon"><BadgeCheck size={19}/></span><span className="dashboard-stat-label">Account</span><strong>{user?.email || user?.phone || 'Member'}</strong><span className="dashboard-stat-link">{user?.roles.join(', ') || 'MEMBER'}</span></div>
      <div className="dashboard-stat-card"><span className="dashboard-card-icon"><FileClock size={19}/></span><span className="dashboard-stat-label">Jurisdiction</span><strong>{user?.jurisdictionLevel || '—'}</strong><span className="dashboard-stat-link">{user?.jurisdictionId || 'Managed by EIASC'}</span></div>
      <Link className="dashboard-stat-card" href="/notifications"><span className="dashboard-card-icon"><Bell size={19}/></span><span className="dashboard-stat-label">Notifications</span><strong>{notifications.length}</strong><span className="dashboard-stat-link">Open inbox <ArrowRight size={15}/></span></Link>
    </section>
    <section className="dashboard-section">
      <div className="section-heading compact"><div><p className="eyebrow">NEEDS ACTION</p><h2>Continue where you left off</h2></div></div>
      <div className="dashboard-quick-grid">
        <Link className="dashboard-quick-card" href="/member/credentials"><CreditCard size={20}/><div><strong>Open my digital ID</strong><span>View your current membership credential.</span></div><ArrowRight size={17}/></Link>
        <Link className="dashboard-quick-card" href="/track"><FileClock size={20}/><div><strong>Track an application</strong><span>Check payment, review and correction status.</span></div><ArrowRight size={17}/></Link>
        <Link className="dashboard-quick-card" href="/verify"><BadgeCheck size={20}/><div><strong>Verify a credential</strong><span>Check a membership or institutional credential.</span></div><ArrowRight size={17}/></Link>
      </div>
    </section>
    <section className="workflow-panel">
      <div className="section-heading compact"><div><p className="eyebrow">RECENT UPDATES</p><h2>Your notifications</h2></div></div>
      {notifications.length ? notifications.map(item => <article key={item.id} style={{padding:'1rem 0',borderBottom:'1px solid var(--border)'}}><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></article>) : <p>No new notifications.</p>}
    </section>
  </main>;
}
