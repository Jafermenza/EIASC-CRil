'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeControls } from '../ui/theme-provider';
import { supportedLocales, useI18n } from '../../lib/i18n';

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/institution') || pathname === '/login';
  if (hidden) return children;
  const links = [[t('home'), '/'], [t('services'), '/services'], [t('register'), '/register'], [t('track'), '/track'], [t('verify'), '/verify'], [t('about'), '/about']] as const;
  return <>
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="EIASC CRil home" onClick={() => setOpen(false)}><span className="brand-symbol">E</span><span><strong>EIASC</strong><small>CRil Platform</small></span></Link>
        <button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="public-mobile-menu" onClick={() => setOpen(v => !v)}>{open ? '×' : '☰'}<span className="sr-only">Menu</span></button>
        <nav className="site-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          <label className="language-picker"><span className="sr-only">{t('language')}</span><select value={locale} onChange={e => setLocale(e.target.value as typeof locale)} aria-label={t('language')}>{supportedLocales.map(item => <option value={item.code} key={item.code}>{item.nativeLabel}</option>)}</select></label>
          <ThemeControls />
          <Link className="button button-primary" href="/login">{t('signIn')}</Link>
        </nav>
      </div>
      {open && <nav id="public-mobile-menu" className="mobile-public-menu" aria-label="Mobile navigation">
        {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <label><span>{t('language')}</span><select value={locale} onChange={e => setLocale(e.target.value as typeof locale)}>{supportedLocales.map(item => <option value={item.code} key={item.code}>{item.nativeLabel}</option>)}</select></label>
        <div><span>{t('appearance')}</span><ThemeControls /></div>
        <Link className="button button-primary" href="/login" onClick={() => setOpen(false)}>{t('signIn')}</Link>
      </nav>}
    </header>{children}
  </>;
}
