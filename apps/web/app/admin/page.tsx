'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Super Administrator', NATIONAL_ADMIN: 'National Administrator', REGIONAL_ADMIN: 'Regional Administrator', ZONE_ADMIN: 'Zone / City Administrator', DISTRICT_ADMIN: 'District Administrator', REGISTRAR: 'Registrar', INSPECTOR: 'Inspector', FINANCE_OFFICER: 'Finance Officer', INSTITUTION_ADMIN: 'Institution Administrator', MEMBER: 'Member' };
const cards = [
  { href: '/admin/users', title: 'User administration', text: 'Create accounts, assign approved roles and manage access within jurisdiction.' },
  { href: '/admin/locations', title: 'Geographic master data', text: 'Maintain regions, zones/cities, sub-cities/towns and districts used by registration.' },
  { href: '/admin/access', title: 'Roles & privileges', text: 'Review the institutional access model and the responsibility of each operational role.' },
  { href: '/admin/institutions', title: 'Institution registry', text: 'Review applications and maintain the authoritative institution register.' },
  { href: '/admin/licenses', title: 'Institutional licensing', text: 'Review, issue and manage institutional licensing workflows.' },
];

export default function AdminDashboard() {
  const router = useRouter(); const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { const raw = localStorage.getItem('userRoles'); if (!raw) { router.replace('/login'); return; } try { setRoles(JSON.parse(raw) as string[]); } catch { router.replace('/login'); } }, [router]);
  function signOut() { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('userRoles'); router.replace('/login'); }
  return <main className="admin-shell"><header className="admin-header"><div><p className="eyebrow">EIASC · CRil</p><h1>Administration</h1><p className="lead">Governed access to registration, master data and institutional operations.</p></div><div className="admin-header-actions"><Link className="button button-secondary" href="/">Public portal</Link><button className="button" onClick={signOut}>Sign out</button></div></header><section className="identity-bar"><div><span className="muted-label">Signed-in role</span><strong>{roles.map((r) => roleLabels[r] ?? r).join(' · ') || 'Loading…'}</strong></div><div><span className="muted-label">Control model</span><strong>Role + jurisdiction + workflow</strong></div></section><section className="admin-grid">{cards.map((card) => <Link className="admin-card" href={card.href} key={card.href}><span className="card-kicker">ADMIN SERVICE</span><h2>{card.title}</h2><p>{card.text}</p><span className="card-link">Open service →</span></Link>)}</section><section className="admin-note"><strong>Master data comes first.</strong><span>Before accepting institution applications, establish the geographic hierarchy and institution types. Public registration reads these controlled reference records.</span></section></main>;
}
