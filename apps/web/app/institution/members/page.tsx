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
}
