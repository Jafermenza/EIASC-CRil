'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ThemeControls } from '../ui/theme-provider';

const ALL_ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER'];
const sections = [
  { label: 'Overview', roles: ALL_ADMIN_ROLES, items: [{ label: 'Dashboard', href: '/admin/dashboard' }] },
  { label: 'Registration', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'], items: [{ label: 'Individual registrations', href: '/admin/registrations' }, { label: 'Institution applications', href: '/admin/institutions' }] },
  { label: 'Finance', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'FINANCE_OFFICER', 'INSPECTOR'], items: [{ label: 'Registration payments', href: '/admin/payments' }] },
  { label: 'Governance', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'], items: [{ label: 'Licensing', href: '/admin/licenses' }] },
  { label: 'Intelligence', roles: ALL_ADMIN_ROLES, items: [{ label: 'Reports & trends', href: '/admin/reports' }] },
  { label: 'System', roles: ['SUPER_ADMIN'], items: [{ label: 'Users & roles', href: '/admin/users' }, { label: 'Settings', href: '/admin/settings/platform' }, { label: 'Institution types', href: '/admin/settings/institution-types' }] },
  { label: 'Operations', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'FINANCE_OFFICER'], items: [{ label: 'Notifications', href: '/notifications' }] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [roles, setRoles] = useState<string[]>([]);
    const [checking, setChecking] = useState(true);
    useEffect(() => {
      let active = true;
      const validate = async () => {
        const token = localStorage.getItem('accessToken') || '';
        if (!token) { window.location.replace('/login'); return; }
        try {
          const response = await fetch('/api/v1/auth/me', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
          const user = await response.json() as { roles?: string[] };
          if (!response.ok || !user.roles?.length) throw new Error('Session expired');
          if (active) { setRoles(user.roles); localStorage.setItem('authUser', JSON.stringify(user)); setChecking(false); }
        } catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('authUser'); window.location.replace('/login'); }
      };
      void validate();
      const onPageShow = () => { void validate(); };
      const onVisibilityChange = () => { if (document.visibilityState === 'visible') void validate(); };
      const onPopState = () => { void validate(); };
      window.addEventListener('pageshow', onPageShow);
      window.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('popstate', onPopState);
      return () => { active = false; window.removeEventListener('pageshow', onPageShow); window.removeEventListener('visibilitychange', onVisibilityChange); window.removeEventListener('popstate', onPopState); };
    }, [pathname]);
  const visibleSections = useMemo(() => sections.filter((section) => section.roles.some((role) => roles.includes(role))), [roles]);
  const canSeeUsers = roles.includes('SUPER_ADMIN');
  const isSystemPath = pathname.startsWith('/admin/users') || pathname.startsWith('/admin/settings');
  const canAccessPath = roles.some((role) => ALL_ADMIN_ROLES.includes(role)) && (
    pathname === '/admin/dashboard' || pathname.startsWith('/admin/reports') ||
    (isSystemPath ? roles.includes('SUPER_ADMIN') :
      pathname.startsWith('/admin/registrations') || pathname.startsWith('/admin/institutions') || pathname.startsWith('/admin/licenses') ? roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'].includes(role)) :
      pathname.startsWith('/admin/payments') ? roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'FINANCE_OFFICER', 'INSPECTOR'].includes(role)) : true)
  );
    async function signOut() {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await fetch('/api/v1/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }), keepalive: true }).catch(() => undefined);
      localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('authUser');
      window.history.replaceState(null, '', '/login'); router.replace('/login');
    }
    if (checking) return <main className="shell"><p>Checking your session…</p></main>;
    if (!canAccessPath) { window.location.replace(roles.length ? '/admin/dashboard' : '/login'); return <main className="shell"><p>Redirecting…</p></main>; }
  return <div className="app-shell"><aside className="admin-sidebar"><Link className="sidebar-brand" href="/admin/dashboard"><span className="brand-symbol">E</span><span><strong>EIASC</strong><small>CRil Administration</small></span></Link><nav aria-label="Administration">{visibleSections.map((section) => <div className="nav-section" key={section.label}><p>{section.label}</p>{section.items.map((item) => <Link className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'nav-link active' : 'nav-link'} href={item.href} key={item.href}>{item.label}</Link>)}</div>)}{!canSeeUsers && <div className="nav-section"><p>Access</p><span className="nav-link" aria-current="page">Role-limited workspace</span></div>}</nav><Link className="sidebar-public-link" href="/">← Public platform</Link><button className="nav-link" type="button" onClick={signOut}>Sign out</button></aside><div className="app-main"><header className="app-topbar"><div><span className="mobile-context">EIASC</span><strong>{pathname.startsWith('/admin/institutions') ? 'Institution registry' : pathname.startsWith('/admin/payments') ? 'Registration payments' : pathname.startsWith('/admin/licenses') ? 'Licensing' : pathname.startsWith('/admin/reports') ? 'Reports & trends' : 'Administration'}</strong></div><div className="topbar-actions"><ThemeControls /><Link className="notification-link" href="/notifications" aria-label="Open notifications">🔔 <span>Notifications</span></Link><button className="button button-secondary" type="button" onClick={signOut}>Sign out</button></div></header><div className="app-content">{children}</div></div><nav className="mobile-bottom-nav" aria-label="Primary administration navigation"><Link className={pathname.startsWith('/admin/dashboard') ? 'active' : ''} href="/admin/dashboard">Home</Link>{canSeeUsers && <Link className={pathname.startsWith('/admin/users') ? 'active' : ''} href="/admin/users">Users</Link>}<Link className={pathname.startsWith('/admin/reports') ? 'active' : ''} href="/admin/reports">Reports</Link><button type="button" onClick={signOut}>Sign out</button></nav></div>;
}
