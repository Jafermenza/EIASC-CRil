'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Building2, FileCheck2, UsersRound, Sparkles, Bell } from 'lucide-react';

type MemberItem = { id: string; member: { firstName: string; lastName: string; status: string }; relationshipType: string };
type Counts = { total?: number; active?: number; suspended?: number; pendingRelationships?: number };

export default function InstitutionDashboard() {
  const [items,setItems]=useState<MemberItem[]>([]);
  const [counts,setCounts]=useState<Counts>();
  const [profile,setProfile]=useState<{name?:string; institutionName?:string; institutionCode?:string}>({});
  const [error,setError]=useState('');

  useEffect(() => {
    const token=localStorage.getItem('accessToken')||'';
    const id=localStorage.getItem('institutionId')||'';
    if(!id){setError('No institution is assigned to this account.');return;}
    const headers={authorization:`Bearer ${token}`};
    Promise.all([
      fetch(`/api/v1/institutions/${id}`,{headers}).then(r=>r.json()),
      fetch(`/api/v1/institutions/${id}/members`,{headers}).then(r=>r.json()),
    ]).then(([institution,members])=>{if(institution.message)throw new Error(institution.message);setProfile(institution);setItems(members.items||[]);setCounts(members.counts);}).catch(e=>setError(e.message||'Unable to load institution dashboard.'));
  },[]);

  return <main className="shell role-dashboard">
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <div className="dashboard-kicker"><span className="dashboard-icon-orb"><Building2 size={20}/></span><span>INSTITUTION PORTAL</span></div>
        <h1>{profile.institutionName || profile.name || 'Institution dashboard'}</h1>
        <p>One place to manage your institutional profile, members, documents, licensing and workflow updates.</p>
      </div>
      <div className="dashboard-hero-glow"><Sparkles size={18}/> Institution workspace</div>
    </section>
    {error ? <section className="error-reason" role="alert"><strong>Institution dashboard could not be loaded</strong><span>{error}</span></section> : <>
      <section className="dashboard-stat-grid">
        <div className="dashboard-stat-card"><span className="dashboard-card-icon"><UsersRound size={19}/></span><span className="dashboard-stat-label">Total members</span><strong>{counts?.total ?? '—'}</strong><span className="dashboard-stat-link">{counts?.pendingRelationships ?? 0} pending relationships</span></div>
        <div className="dashboard-stat-card"><span className="dashboard-card-icon"><BadgeCheck size={19}/></span><span className="dashboard-stat-label">Active members</span><strong>{counts?.active ?? '—'}</strong><span className="dashboard-stat-link">{counts?.suspended ?? 0} suspended</span></div>
        <div className="dashboard-stat-card"><span className="dashboard-card-icon"><FileCheck2 size={19}/></span><span className="dashboard-stat-label">Institution code</span><strong>{profile.institutionCode || '—'}</strong><span className="dashboard-stat-link">Keep this reference for support</span></div>
      </section>
      <section className="dashboard-section">
        <div className="section-heading compact"><div><p className="eyebrow">NEEDS ACTION</p><h2>Manage your institution</h2></div></div>
        <div className="dashboard-quick-grid">
          <Link className="dashboard-quick-card" href="/institution/members"><UsersRound size={20}/><div><strong>Manage members</strong><span>Add, review and monitor institutional relationships.</span></div><ArrowRight size={17}/></Link>
          <Link className="dashboard-quick-card" href="/institution/license"><FileCheck2 size={20}/><div><strong>Check licensing</strong><span>Follow institutional license and certification activity.</span></div><ArrowRight size={17}/></Link>
          <Link className="dashboard-quick-card" href="/notifications"><Bell size={20}/><div><strong>Read notifications</strong><span>See requests, corrections and workflow updates.</span></div><ArrowRight size={17}/></Link>
        </div>
      </section>
      <section className="workflow-panel"><div className="section-heading compact"><div><p className="eyebrow">MEMBERS</p><h2>Recent members</h2></div></div>{items.slice(0,8).map(x=><article key={x.id} style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}><strong>{x.member.firstName} {x.member.lastName}</strong><p>{x.relationshipType} · {x.member.status}</p></article>)}{!items.length&&<p>No member relationships yet.</p>}</section>
    </>}
  </main>;
}
