'use client';

import Link from 'next/link';
import { useI18n } from '../../lib/i18n';

export default function ServicesPage() {
  const { t } = useI18n();
  const services = [
    [t('registrationTitle'), t('registrationText'), '/register'],
    [t('licensingTitle'), t('licensingText'), '/register/institution'],
    [t('membershipTitle'), t('membershipText'), '/verify'],
    [t('verificationTitle'), t('verificationText'), '/verify'],
    [t('communityTitle'), t('communityText'), '/about'],
    [t('administrationTitle'), t('administrationText'), '/login'],
  ];
  return <main>
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">{t('servicesEyebrow')}</p><h1>{t('servicesTitle')}</h1></div><p>{t('heroLead')}</p></div>
      <div className="capability-grid">{services.map(([title, text, href], i) => <article className="capability-card" key={title}><span>{String(i + 1).padStart(2, '0')}</span><h2>{title}</h2><p>{text}</p><Link href={href}>{t('explore')} <span aria-hidden="true">→</span></Link></article>)}</div>
    </section>
    <section className="trust-section">
      <div><p className="eyebrow">{t('journeyTitle')}</p><h2>{t('journeyTitle')}</h2></div>
      <div className="trust-points"><p><strong>{t('registrationTitle')}</strong><span>{t('memberJourney')}</span></p><p><strong>{t('institutionRegistration')}</strong><span>{t('institutionJourney')}</span></p><p><strong>{t('aboutEyebrow')}</strong><span>{t('aboutFuture')}</span></p></div>
    </section>
  </main>;
}
