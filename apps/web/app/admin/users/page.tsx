'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';
const roles = ['SUPER_ADMIN','NATIONAL_ADMIN','REGIONAL_ADMIN','ZONE_ADMIN','DISTRICT_ADMIN','REGISTRAR','INSPECTOR','FINANCE_OFFICER','INSTITUTION_ADMIN','MEMBER'];
const levels = ['NATIONAL','REGION','ZONE_CITY','SUBCITY_TOWN','DISTRICT','INSTITUTION'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ email: '', phone: '', password: '', role: 'REGISTRAR', jurisdictionLevel: 'NATIONAL', jurisdictionId: '', institutionId: '' });

  async function load() {
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch(`${API}/users`, { headers: { authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load users');
    setUsers(data);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const token = localStorage.getItem('accessToken') || '';
      const response = await fetch(`${API}/users`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create user');
      setMessage(`User created: ${data.email || data.phone || data.id}`);
      setForm({ ...form, email: '', phone: '', password: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create user'); }
  }

  return <main className="shell" style={{ maxWidth: 1200 }}>
    <div className="hero"><p className="eyebrow">EIASC · ADMINISTRATION</p><h1>User management</h1><p className="lead">Create and manage accounts within your authorized jurisdiction.</p></div>
    {error && <article className="grid"><div>{error}</div></article>}
    {message && <article className="grid"><div>{message}</div></article>}
    <section className="grid"><div><h2>Create user</h2><form onSubmit={createUser} style={{ display: 'grid', gap: 12 }}>
      <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
      <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
      <input placeholder="Initial password (10+ characters)" type="password" minLength={10} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/>
      <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{roles.map(r => <option key={r}>{r}</option>)}</select>
      <select value={form.jurisdictionLevel} onChange={e => setForm({ ...form, jurisdictionLevel: e.target.value })}>{levels.map(l => <option key={l}>{l}</option>)}</select>
      {form.jurisdictionLevel !== 'NATIONAL' && form.jurisdictionLevel !== 'INSTITUTION' && <input placeholder="Jurisdiction ID" required value={form.jurisdictionId} onChange={e => setForm({ ...form, jurisdictionId: e.target.value })}/>} 
      {form.jurisdictionLevel === 'INSTITUTION' && <input placeholder="Institution ID" required value={form.institutionId} onChange={e => setForm({ ...form, institutionId: e.target.value })}/>} 
      <button className="button" type="submit">Create user</button>
    </form></div></section>
    <section className="grid"><div><h2>Users</h2><table style={{ width: '100%' }}><thead><tr><th>Account</th><th>Role</th><th>Scope</th><th>Status</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.email || u.phone || u.id}</td><td>{u.roles.join(', ')}</td><td>{u.jurisdictionLevel}{u.jurisdictionId ? ` · ${u.jurisdictionId}` : ''}</td><td>{u.status}</td></tr>)}</tbody></table></div></section>
  </main>;
}
