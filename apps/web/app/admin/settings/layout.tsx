'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Platform', href: '/admin/settings' },
  { label: 'Credentials', href: '/admin/settings/credentials' },
  { label: 'Geography', href: '/admin/settings/geography' },
  { label: 'Institution types', href: '/admin/settings/institution-types' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="settings-layout">
      <nav className="settings-tabs" aria-label="Settings sections">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={pathname === tab.href ? 'settings-tab active' : 'settings-tab'}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="settings-content">{children}</div>
      <style jsx global>{`
        .settings-layout{display:flex;gap:0;align-items:flex-start}
        .settings-tabs{display:flex;flex-direction:column;gap:2px;min-width:190px;border-right:1px solid var(--border);padding:24px 12px 24px 0;position:sticky;top:0}
        .settings-tab{padding:10px 14px;border-radius:8px;color:inherit;text-decoration:none;font-size:14px;opacity:.75}
        .settings-tab:hover{background:rgba(0,0,0,.05);opacity:1}
        .settings-tab.active{background:var(--accent,#1a5f3f);color:#fff;opacity:1;font-weight:600}
        .settings-content{flex:1;min-width:0}
        @media (max-width:900px){.settings-layout{flex-direction:column}.settings-tabs{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--border);position:static;width:100%}}
      `}</style>
    </div>
  );
}
