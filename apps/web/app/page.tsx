'use client';

import Link from 'next/link';
import { useI18n } from '../lib/i18n';

export default function HomePage() {
  const { t } = useI18n();
  const actions = [[t('memberRegistration'), '/register/individual'], [t('institutionRegistration'), '/register/institution'], [t('trackApplication'), '/track'], [t('verifyCredential'), '/verify']];
  const capabilities = [
    { number: '01', title: t('registrationTitle'), text: t('registrationText'), href: '/register' },
    { number: '02', title: t('licensingTitle'), text: t('licensingText'), href: '/services#licensing' },
    { number: '03', title: t('membershipTitle'), text: t('membershipText'), href: '/verify' },
    { number: '04', title: t('verificationTitle'), text: t('verificationText'), href: '/verify' },
    { number: '05', title: t('communityTitle'), text: t('communityText'), href: '/about' },
    { number: '06', title: t('administrationTitle'), text: t('administrationText'), href: '/login' },
  ];

  return <main>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="eyebrow">{t('heroEyebrow')}</p>
        <h1>{t('heroTitle')}</h1>
        <p className="lead">{t('heroLead')}</p>
        <div className="actions" aria-label={t('services')}>
          {actions.map(([label, href], index) => <Link className={`button ${index === 0 ? 'button-primary' : 'button-secondary'}`} href={href} key={href}>{label}</Link>)}
        </div>
      </div>
      <aside className="hero-card" aria-label="EIASC CRil platform">
        <div className="hero-card-top"><span>CRil</span><span className="status-dot">EIASC</span></div>
        <div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core">EIASC</div></div>
        <p>{t('aboutText')}</p>
      </aside>
    </section>

    <section className="section" id="services">
      <div className="section-heading"><div><p className="eyebrow">{t('servicesEyebrow')}</p><h2>{t('servicesTitle')}</h2></div><p>{t('heroLead')}</p></div>
      <div className="capability-grid">
        {capabilities.map(item => <article className="capability-card" id={item.title === t('licensingTitle') ? 'licensing' : undefined} key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href}>{t('explore')} <span aria-hidden="true">→</span></Link></article>)}
      </div>
    </section>

    <section className="trust-section" id="about">
      <div><p className="eyebrow">{t('aboutEyebrow')}</p><h2>{t('aboutTitle')}</h2></div>
      <div className="trust-points"><p><strong>{t('registrationTitle')}</strong><span>{t('aboutText')}</span></p><p><strong>{t('verificationTitle')}</strong><span>{t('verificationText')}</span></p><p><strong>{t('journeyTitle')}</strong><span>{t('memberJourney')}</span></p></div>
      <div className="trust-points"><p><strong>{t('institutionRegistration')}</strong><span>{t('institutionJourney')}</span></p><p><strong>{t('journeyTitle')}</strong><span>{t('aboutFuture')}</span></p></div>
    </section>

    <footer className="site-footer"><div><strong>EIASC CRil Platform</strong><span>{t('footer')}</span></div><Link className="button button-primary" href="/login">{t('signIn')}</Link></footer>
  </main>;
}
