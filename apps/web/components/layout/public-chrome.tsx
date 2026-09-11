'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeControls } from '../ui/theme-provider';

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/institution') || pathname === '/login';
  if (hidden) return children;

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" href="/" aria-label="EIASC CRil home">
            <span className="brand-symbol">E</span>
            <span><strong>EIASC</strong><small>CRil Platform</small></span>
          </Link>
          <nav className="site-nav" aria-label="Primary navigation">
            <Link href="/">Home</Link>
            <Link href="/#services">Services</Link>
            <Link href="/register">Register</Link>
            <Link href="/track">Track</Link>
            <Link href="/verify">Verify</Link>
            <Link href="/#about">About</Link>
            <ThemeControls />
            <Link className="button button-primary" href="/login">Platform sign in</Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
