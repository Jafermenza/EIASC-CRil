'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeControls } from '../ui/theme-provider';

const items = [
  ['Overview', '/institution'],
  ['License', '/institution/license'],
  ['Notifications', '/notifications'],
] as const;

export default function InstitutionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="admin-sidebar institution-sidebar">
        <Link className="sidebar-brand" href="/institution"><span className="brand-symbol">E</span><span><strong>EIASC</strong><small>Institution portal</small></span></Link>
        <nav aria-label="Institution portal">
          <div className="nav-section"><p>Institution</p>{items.map(([label, href]) => <Link className={pathname === href ? 'nav-link active' : 'nav-link'} href={href} key={href}>{label}</Link>)}</div>
        </nav>
        <Link className="sidebar-public-link" href="/">← Public platform</Link>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div><strong>Institution portal</strong></div>
          <div className="topbar-actions"><ThemeControls /><Link className="notification-link" href="/notifications" aria-label="Open notifications">🔔 <span>Notifications</span></Link></div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Institution navigation">
        <Link className={pathname === '/institution' ? 'active' : ''} href="/institution">Home</Link>
        <Link className={pathname.startsWith('/institution/license') ? 'active' : ''} href="/institution/license">License</Link>
        <Link href="/notifications">Alerts</Link>
        <Link href="/">Public</Link>
      </nav>
    </div>
  );
}
