'use client';

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
