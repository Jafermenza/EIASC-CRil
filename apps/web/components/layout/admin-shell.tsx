'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ThemeControls } from '../ui/theme-provider';

const ALL_ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER'];
const sections = [
  { label: 'Overview', roles: ALL_ADMIN_ROLES, items: [{ label: 'Dashboard', href: '/admin/dashboard' }] },
  { label: 'Registration', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'], items: [{ label: 'Institution applications', href: '/admin/institutions' }] },
  { label: 'Finance', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'FINANCE_OFFICER', 'INSPECTOR'], items: [{ label: 'Registration payments', href: '/admin/payments' }] },
  { label: 'Governance', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'], items: [{ label: 'Licensing', href: '/admin/licenses' }] },
  { label: 'Intelligence', roles: ALL_ADMIN_ROLES, items: [{ label: 'Reports & trends', href: '/admin/reports' }] },
  { label: 'System', roles: ['SUPER_ADMIN'], items: [{ label: 'Users & roles', href: '/admin/users' }, { label: 'Settings', href: '/admin/settings' }] },
  { label: 'Operations', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'FINANCE_OFFICER'], items: [{ label: 'Notifications', href: '/notifications' }] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { try { const parsed = JSON.parse(localStorage.getItem('authUser') || '{}') as { roles?: string[] }; setRoles(parsed.roles || []); } catch { setRoles([]); } }, []);
  const visibleSections = useMemo(() => sections.filter((section) => section.roles.some((role) => roles.includes(role))), [roles]);
  const canSeeUsers = roles.includes('SUPER_ADMIN');
  return <div className="app-shell"><aside className="admin-sidebar"><Link className="sidebar-brand" href="/admin/dashboard"><span className="brand-symbol">E</span><span><strong>EIASC</strong><small>CRil Administration</small></span></Link><nav aria-label="Administration">{visibleSections.map((section) => <div className="nav-section" key={section.label}><p>{section.label}</p>{section.items.map((item) => <Link className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'nav-link active' : 'nav-link'} href={item.href} key={item.href}>{item.label}</Link>)}</div>)}{!canSeeUsers && <div className="nav-section"><p>Access</p><span className="nav-link" aria-current="page">Role-limited workspace</span></div>}</nav><Link className="sidebar-public-link" href="/">← Public platform</Link></aside><div className="app-main"><header className="app-topbar"><div><span className="mobile-context">EIASC</span><strong>{pathname.startsWith('/admin/institutions') ? 'Institution registry' : pathname.startsWith('/admin/payments') ? 'Registration payments' : pathname.startsWith('/admin/licenses') ? 'Licensing' : pathname.startsWith('/admin/reports') ? 'Reports & trends' : 'Administration'}</strong></div><div className="topbar-actions"><ThemeControls /><Link className="notification-link" href="/notifications" aria-label="Open notifications">🔔 <span>Notifications</span></Link></div></header><div className="app-content">{children}</div></div><nav className="mobile-bottom-nav" aria-label="Primary administration navigation"><Link className={pathname.startsWith('/admin/dashboard') ? 'active' : ''} href="/admin/dashboard">Home</Link>{canSeeUsers && <Link className={pathname.startsWith('/admin/users') ? 'active' : ''} href="/admin/users">Users</Link>}<Link className={pathname.startsWith('/admin/reports') ? 'active' : ''} href="/admin/reports">Reports</Link><Link href="/notifications">More</Link></nav></div>;
}
