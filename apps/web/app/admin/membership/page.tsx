'use client';

import { useState } from 'react';

const API = '/api/v1';

export default function MembershipPage() {
  const [institutionId, setInstitutionId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; status: string; member: { membershipNumber?: string; firstName: string; lastName: string } }>>([]);

  async function request(path: string, init?: RequestInit) {
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers || {}) } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Request failed');
    return body;
  }

  async function load() {
    setError('');
    try { setMembers(await request(`/memberships/institution/${encodeURIComponent(institutionId)}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load memberships'); }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await request('/memberships', { method: 'POST', body: JSON.stringify({ memberId, institutionId, relationshipType: 'PRIMARY' }) });
      setMessage('Membership created successfully.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create membership'); }
  }

  async function changeStatus(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await request(`/memberships/${encodeURIComponent(membershipId)}/status`, { method: 'POST', body: JSON.stringify({ status, reason: status === 'ENDED' ? 'Administrative membership closure' : undefined }) });
      setMessage('Membership status updated successfully.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update membership'); }
  }

  return <main className="shell">
    <div className="hero"><p className="eyebrow">EIASC · MEMBERSHIP</p><h1>Institutional membership</h1><p className="lead">Manage authorized member affiliations while preserving relationship history.</p></div>
    {error && <p className="form-error">{error}</p>}
    {message && <p>{message}</p>}
    <section className="grid">
      <article><h2>Institution</h2><form onSubmit={(e) => { e.preventDefault(); void load(); }}><label>Institution ID<input required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} /></label><button className="button" type="submit">Load members</button></form></article>
      <article><h2>Add member</h2><form onSubmit={create}><label>Member ID<input required value={memberId} onChange={(e) => setMemberId(e.target.value)} /></label><button className="button" type="submit">Add membership</button></form></article>
      <article><h2>Update membership</h2><form onSubmit={changeStatus}><label>Membership ID<input required value={membershipId} onChange={(e) => setMembershipId(e.target.value)} /></label><label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option>ACTIVE</option><option>SUSPENDED</option><option>ENDED</option></select></label><button className="button" type="submit">Update status</button></form></article>
    </section>
    <section className="workflow-panel"><h2>Members</h2>{members.length === 0 ? <p>No memberships loaded.</p> : <table><thead><tr><th>Member</th><th>Membership number</th><th>Status</th><th>Relationship</th></tr></thead><tbody>{members.map((item) => <tr key={item.id}><td>{item.member.firstName} {item.member.lastName}</td><td>{item.member.membershipNumber || '—'}</td><td>{item.status}</td><td>{item.id}</td></tr>)}</tbody></table>}</section>
  </main>;
}
