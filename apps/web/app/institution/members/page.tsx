'use client';

import { useState } from 'react';

const API = '/api/v1';

type Membership = { id: string; status: string; relationshipType: string; startedAt: string; endedAt?: string | null; member: { membershipNumber?: string; firstName: string; middleName?: string | null; lastName: string; phone: string; status: string } };

export default function InstitutionMembersPage() {
  const [institutionId, setInstitutionId] = useState('');
  const [items, setItems] = useState<Membership[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setError('');
    try {
      const token = localStorage.getItem('accessToken') || '';
      const response = await fetch(`${API}/memberships/institution/${encodeURIComponent(institutionId)}`, { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load members');
      setItems(data); setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load members'); }
  }

  return <main className="shell"><div className="hero"><p className="eyebrow">EIASC · INSTITUTION PORTAL</p><h1>Institution members</h1><p className="lead">View the membership population authorized for your institution.</p></div>{error && <p className="form-error">{error}</p>}<section className="workflow-panel"><form onSubmit={(e) => { e.preventDefault(); void load(); }}><label>Institution ID<input required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} /></label><button className="button" type="submit">Load membership</button></form></section>{loaded && <section className="workflow-panel"><h2>Membership register</h2><p>Total: {items.length}</p>{items.length === 0 ? <p>No members are currently affiliated.</p> : <table><thead><tr><th>Name</th><th>Membership number</th><th>Status</th><th>Relationship</th><th>Started</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.member.firstName} {item.member.middleName ? `${item.member.middleName} ` : ''}{item.member.lastName}</td><td>{item.member.membershipNumber || '—'}</td><td>{item.status}</td><td>{item.relationshipType}</td><td>{new Date(item.startedAt).toLocaleDateString()}</td></tr>)}</tbody></table>}</section>}</main>;
import { useEffect, useState } from 'react';

type Membership = { id: string; relationshipType: string; status: string; startedAt: string; endedAt?: string | null; member: { firstName: string; lastName: string; id: string }; institution: { name: string; institutionCode?: string | null } };

export default function InstitutionMembersPage() {
  const [institutionId, setInstitutionId] = useState('');
  const [members, setMembers] = useState<Membership[]>([]);
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (!institutionId) return;
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch(`/api/v1/memberships/institution/${encodeURIComponent(institutionId)}`, { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Unable to load members');
    setMembers(body);
  }

  useEffect(() => { const saved = localStorage.getItem('institutionId') || ''; setInstitutionId(saved); }, []);
  useEffect(() => { if (institutionId) void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load members')); }, [institutionId]);

  async function requestAffiliation(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const token = localStorage.getItem('accessToken') || '';
      const response = await fetch('/api/v1/memberships', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ memberId, institutionId, relationshipType: 'PRIMARY' }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to request affiliation');
      setMemberId(''); setMessage('Membership request submitted.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to request affiliation'); }
  }

  return <main className="shell" style={{ maxWidth: 1100 }}><div className="hero"><p className="eyebrow">EIASC · INSTITUTION</p><h1>Institutional membership</h1><p className="lead">Manage member affiliations without overwriting historical relationships.</p></div>{error && <section className="error-reason" role="alert"><strong>Membership action failed</strong><span>{error}</span></section>}{message && <section className="workflow-panel"><strong>{message}</strong></section>}<section className="workflow-panel"><h2>Request affiliation</h2><form className="form-grid" onSubmit={requestAffiliation}><div className="field"><label htmlFor="member-id">Active member ID</label><input id="member-id" required value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Member ID"/></div><div className="field field-action"><button className="button button-primary">Request membership</button></div></form></section><section className="workflow-panel"><h2>Members</h2><div className="grid">{members.map((membership) => <article key={membership.id}><p className="eyebrow">{membership.status}</p><h3>{membership.member.firstName} {membership.member.lastName}</h3><p>{membership.relationshipType} · Started {new Date(membership.startedAt).toLocaleDateString()}</p></article>)}{members.length === 0 && <p>No membership records are available for this institution.</p>}</div></section></main>;
}
