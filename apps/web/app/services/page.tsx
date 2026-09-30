import Link from 'next/link';

const services = [
  { number:'01', title:'Individual registration', text:'Create your EIASC community record through a guided registration process.', href:'/register/individual', cta:'Register as an individual' },
  { number:'02', title:'Institution registration', text:'Submit an Islamic institution application with geographic and leadership information for review.', href:'/register/institution', cta:'Apply now' },
  { number:'03', title:'Application tracking', text:'Use your tracking code to follow an application and respond when corrections are requested.', href:'/track', cta:'Track application' },
  { number:'04', title:'Credential verification', text:'Verify an EIASC institutional license using its public credential number.', href:'/verify', cta:'Verify credential' },
];
export default function ServicesPage(){return <main className="shell" style={{maxWidth:1200}}><section className="hero"><p className="eyebrow">EIASC · SERVICES</p><h1>Services built around clear public journeys.</h1><p className="lead">Choose the service that matches what you need. Applications are guided from submission through review, while issued credentials can be verified publicly.</p></section><section className="capability-grid">{services.map(s=><article className="capability-card registration-choice" key={s.number}><span>{s.number}</span><h2>{s.title}</h2><p>{s.text}</p><Link className="button button-primary" href={s.href}>{s.cta} <span aria-hidden="true">→</span></Link></article>)}</section><section className="workflow-panel" style={{marginTop:22}}><p className="eyebrow">NEED HELP?</p><h2>Not sure where to start?</h2><p className="helper-copy">Begin with institution registration if you are applying on behalf of a mosque, madrasa, Islamic center or other institution. Keep your tracking code after submission.</p><div className="action-row"><Link className="button button-primary" href="/register">Start registration</Link><Link className="button button-secondary" href="/">Return home</Link></div></section></main>;}
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
