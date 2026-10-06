'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Settings2,
  Shield,
  UsersRound,
  WalletCards,
  BarChart3,
} from 'lucide-react';
import { ThemeControls } from '../ui/theme-provider';

const ALL_ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER'];

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavSection = { label: string; roles: string[]; items: NavItem[] };

const sections: NavSection[] = [
  { label: 'Overview', roles: ALL_ADMIN_ROLES, items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }] },
  { label: 'Work queue', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'], items: [{ label: 'Review applications', href: '/admin/review', icon: ClipboardCheck }, { label: 'Individual registrations', href: '/admin/registrations', icon: UsersRound }, { label: 'Institution applications', href: '/admin/institutions', icon: Building2 }] },
  { label: 'Finance', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'FINANCE_OFFICER'], items: [{ label: 'Registration payments', href: '/admin/payments', icon: WalletCards }] },
  { label: 'Directory', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSTITUTION_ADMIN'], items: [{ label: 'Approved members', href: '/admin/directory/members', icon: UsersRound }, { label: 'Approved institutions', href: '/admin/directory/institutions', icon: Building2 }] },
  { label: 'Governance', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR'], items: [{ label: 'Licensing', href: '/admin/licenses', icon: FileCheck2 }] },
  { label: 'Inspection', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR'], items: [{ label: 'Review & inspection', href: '/admin/review', icon: ClipboardCheck }] },
  { label: 'Intelligence', roles: ALL_ADMIN_ROLES, items: [{ label: 'Reports & trends', href: '/admin/reports', icon: BarChart3 }] },
  { label: 'People & access', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER'], items: [{ label: 'Users & accounts', href: '/admin/users', icon: UsersRound }] },
  { label: 'System', roles: ['SUPER_ADMIN'], items: [{ label: 'Platform settings', href: '/admin/settings/platform', icon: Settings2 }, { label: 'Institution types', href: '/admin/settings/institution-types', icon: BookOpenCheck }] },
  { label: 'Policy', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN'], items: [{ label: 'Inspection checklists', href: '/admin/settings/inspection-checklists', icon: ClipboardCheck }] },
  { label: 'Operations', roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'FINANCE_OFFICER'], items: [{ label: 'Notifications', href: '/notifications', icon: Bell }] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const validate = async () => {
      const token = localStorage.getItem('accessToken') || '';
      if (!token) { window.location.replace('/login'); return; }
      try {
        const response = await fetch('/api/v1/auth/me', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
        const json = await response.json();
        const user = ((json && typeof json === 'object' && 'data' in json && json.data) ? json.data : json) as { roles?: string[] };
        if (!response.ok || !user?.roles?.length) throw new Error('Session expired');
        if (active) { setRoles(user.roles); localStorage.setItem('authUser', JSON.stringify(user)); setChecking(false); }
      } catch {
        localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('authUser'); window.location.replace('/login');
      }
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
  const canSeeUsers = roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER'].includes(role));
  const canManageChecklists = roles.includes('SUPER_ADMIN') || roles.includes('NATIONAL_ADMIN');
  const canReview = roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR'].includes(role));
  const canReviewApplications = roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'].includes(role));
  const canViewDirectory = roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR'].includes(role));
  const canViewPayments = roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'FINANCE_OFFICER'].includes(role));
  const canViewLicensing = roles.some((role) => ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR'].includes(role));
  const canAccessPath = roles.some((role) => ALL_ADMIN_ROLES.includes(role)) && (
    pathname === '/admin/dashboard' ||
    pathname.startsWith('/admin/reports') ||
    (pathname.startsWith('/admin/review') ? canReviewApplications || roles.includes('INSPECTOR') : false) ||
    (pathname.startsWith('/admin/registrations') || pathname.startsWith('/admin/institutions') ? canReviewApplications : false) ||
    (pathname.startsWith('/admin/licenses') ? canViewLicensing : false) ||
    (pathname.startsWith('/admin/directory') ? canViewDirectory : false) ||
    (pathname.startsWith('/admin/payments') ? canViewPayments : false) ||
    (pathname.startsWith('/admin/users') ? canSeeUsers : pathname.startsWith('/admin/settings/platform') || pathname.startsWith('/admin/settings/institution-types') ? roles.includes('SUPER_ADMIN') : false) ||
    (pathname.startsWith('/admin/settings/inspection-checklists') ? canManageChecklists : false)
  );

  async function signOut() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await fetch('/api/v1/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }), keepalive: true }).catch(() => undefined);
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('authUser');
    window.history.replaceState(null, '', '/login'); router.replace('/login');
  }

  if (checking) return <main className="shell"><p>Checking your secure workspace…</p></main>;
  if (!canAccessPath) { window.location.replace(roles.length ? '/admin/dashboard' : '/login'); return <main className="shell"><p>Redirecting to your authorized workspace…</p></main>; }

  return (
    <div className="app-shell">
      <aside className="admin-sidebar">
        <Link className="sidebar-brand" href="/admin/dashboard"><span className="brand-symbol">E</span><span><strong>EIASC</strong><small>CRil Administration</small></span></Link>
        <nav aria-label="Administration">
          {visibleSections.map((section) => <div className="nav-section" key={section.label}><p>{section.label}</p>{section.items.filter((item) => item.href !== '/admin/review' || canReview).map((item) => { const NavIcon = item.icon; return <Link className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'nav-link active' : 'nav-link'} href={item.href} key={item.href}><NavIcon size={17} strokeWidth={1.9} aria-hidden="true" /><span>{item.label}</span></Link>; })}</div>)}
          {!canSeeUsers && <div className="nav-section"><p>Access</p><span className="nav-link muted-nav"><Shield size={16} /><span>Role-limited workspace</span></span></div>}
        </nav>
        <Link className="sidebar-public-link" href="/">← Public platform</Link>
        <button className="nav-link signout-link" type="button" onClick={signOut}><LogOut size={17} /><span>Sign out</span></button>
      </aside>
      <div className="app-main">
        <header className="app-topbar"><div><span className="mobile-context">EIASC</span><strong>{pathname.startsWith('/admin/review') ? 'Review & inspection' : pathname.startsWith('/admin/institutions') ? 'Institution registry' : pathname.startsWith('/admin/payments') ? 'Registration payments' : pathname.startsWith('/admin/licenses') ? 'Licensing' : pathname.startsWith('/admin/reports') ? 'Reports & trends' : 'Administration'}</strong></div><div className="topbar-actions"><ThemeControls /><Link className="notification-link" href="/notifications" aria-label="Open notifications"><Bell size={17} /><span>Notifications</span></Link><button className="button button-secondary" type="button" onClick={signOut}>Sign out</button></div></header>
        <div className="app-content">{children}</div>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Primary administration navigation"><Link className={pathname.startsWith('/admin/dashboard') ? 'active' : ''} href="/admin/dashboard"><LayoutDashboard size={17} /><span>Home</span></Link>{canSeeUsers && <Link className={pathname.startsWith('/admin/users') ? 'active' : ''} href="/admin/users"><UsersRound size={17} /><span>Users</span></Link>}<Link className={pathname.startsWith('/admin/reports') ? 'active' : ''} href="/admin/reports"><BarChart3 size={17} /><span>Reports</span></Link><button type="button" onClick={signOut}><LogOut size={17} /><span>Exit</span></button></nav>
    </div>
  );
}
