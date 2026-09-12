'use client';

import Link from 'next/link';
import { useI18n } from '../../lib/i18n';

export default function AboutPage() {
  const { t } = useI18n();
  return <main>
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">{t('aboutEyebrow')}</p><h1>{t('aboutTitle')}</h1></div><p>{t('aboutText')}</p></div>
      <div className="trust-section">
        <div><p className="eyebrow">{t('journeyTitle')}</p><h2>{t('servicesTitle')}</h2></div>
        <div className="trust-points"><p><strong>{t('registrationTitle')}</strong><span>{t('registrationText')}</span></p><p><strong>{t('membershipTitle')}</strong><span>{t('membershipText')}</span></p><p><strong>{t('licensingTitle')}</strong><span>{t('licensingText')}</span></p><p><strong>{t('verificationTitle')}</strong><span>{t('verificationText')}</span></p></div>
      </div>
      <div className="trust-section"><div><p className="eyebrow">EIASC CRil</p><h2>{t('aboutFuture')}</h2></div><div className="actions"><Link className="button button-primary" href="/register">{t('register')}</Link><Link className="button button-secondary" href="/services">{t('services')}</Link></div></div>
    </section>
  </main>;
}
