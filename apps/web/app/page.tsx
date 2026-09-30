import Link from 'next/link';

const actions=[['Apply now','/register/institution'],['Individual registration','/register/individual'],['Track an application','/track'],['Verify a credential','/verify']];
const capabilities=[{number:'01',title:'Registration',text:'Structured registration for individuals and Islamic institutions with clear application pathways.',href:'/services'},{number:'02',title:'Institutional licensing',text:'Jurisdiction-aware review and licensing workflows with controlled administrative actions.',href:'/services'},{number:'03',title:'Digital credentials',text:'Secure credentials designed for straightforward verification and trusted public access.',href:'/verify'},{number:'04',title:'Accountability',text:'Role-based administration and auditable actions support transparent institutional governance.',href:'/login'}];
export default function HomePage(){return <main><section className="home-hero"><div className="hero-copy"><p className="eyebrow">ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL</p><h1>Community registration and institutional licensing, <span>organized for trust.</span></h1><p className="lead">CRil provides a modern digital foundation for community registration, institutional oversight, licensing and credential verification.</p><div className="actions" aria-label="Public services">{actions.map(([label,href],index)=><Link className={`button ${index===0?'button-primary':'button-secondary'}`} href={href} key={href}>{label}{index===0&&<span aria-hidden="true">→</span>}</Link>)}</div><p className="helper-copy" style={{marginTop:14}}>Applying for an Islamic institution? <Link href="/register/institution" style={{color:'var(--brand-primary)',fontWeight:800}}>Apply now →</Link></p></div><aside className="hero-card" aria-label="Platform overview"><div className="hero-card-top"><span>CRil</span><span className="status-dot">Platform</span></div><div className="hero-orbit"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-core">EIASC</div></div><p>One coordinated platform for registration, institutional governance and trusted verification.</p></aside></section><section className="section" id="services"><div className="section-heading"><div><p className="eyebrow">PLATFORM SERVICES</p><h2>Start the service you need.</h2></div><p>Every service is presented with a defined purpose, consistent controls and a professional digital experience.</p></div><div className="capability-grid">{capabilities.map(item=><article className="capability-card" key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href}>Explore service <span aria-hidden="true">→</span></Link></article>)}</div><div className="workflow-panel" style={{marginTop:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div><p className="eyebrow">READY TO BEGIN?</p><h2 style={{margin:'8px 0 4px'}}>Apply for institution registration</h2><p className="helper-copy" style={{margin:0}}>Submit your institutional details and receive a tracking code for the review journey.</p></div><Link className="button button-primary" href="/register/institution">Apply now <span aria-hidden="true">→</span></Link></div></section><section className="trust-section" id="about"><div><p className="eyebrow">DESIGNED FOR INSTITUTIONAL TRUST</p><h2>Professional workflows without unnecessary complexity.</h2></div><div className="trust-points"><p><strong>Role-aware</strong><span>Administrative access follows assigned responsibilities and jurisdiction.</span></p><p><strong>Auditable</strong><span>Critical actions are recorded to support accountable operations.</span></p><p><strong>Accessible</strong><span>Public users can reach registration and verification services without navigating an administrative interface.</span></p></div></section><footer className="site-footer"><div><strong>EIASC CRil Platform</strong><span>Community Registration &amp; Institutional Licensing</span></div><div className="action-row" style={{marginTop:0}}><Link className="button button-secondary" href="/services">View services</Link><Link className="button button-primary" href="/login">Sign in to platform</Link></div></footer></main>;}
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
