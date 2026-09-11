import Link from 'next/link';

const actions = [
  ['Member registration', '/register/individual'],
  ['Institution registration', '/register/institution'],
  ['Track an application', '/track'],
  ['Verify a credential', '/verify'],
];

const capabilities = [
  { number: '01', title: 'Registration', text: 'Structured registration for individuals and Islamic institutions with clear application pathways.', href: '/register' },
  { number: '02', title: 'Institutional licensing', text: 'Jurisdiction-aware review and licensing workflows with controlled administrative actions.', href: '/login' },
  { number: '03', title: 'Digital credentials', text: 'Secure credentials designed for straightforward verification and trusted public access.', href: '/verify' },
  { number: '04', title: 'Accountability', text: 'Role-based administration and auditable actions support transparent institutional governance.', href: '/login' },
];

export default function HomePage() {
  return (
    <main>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL</p>
          <h1>Community registration and institutional licensing, <span>organized for trust.</span></h1>
          <p className="lead">CRil provides a modern digital foundation for community registration, institutional oversight, licensing and credential verification.</p>
          <div className="actions" aria-label="Public services">
            {actions.map(([label, href], index) => <Link className={`button ${index === 0 ? 'button-primary' : 'button-secondary'}`} href={href} key={href}>{label}</Link>)}
          </div>
        </div>
        <aside className="hero-card" aria-label="Platform overview">
          <div className="hero-card-top"><span>CRil</span><span className="status-dot">Platform</span></div>
          <div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core">EIASC</div></div>
          <p>One coordinated platform for registration, institutional governance and trusted verification.</p>
        </aside>
      </section>

      <section className="section" id="services">
        <div className="section-heading"><div><p className="eyebrow">PLATFORM CAPABILITIES</p><h2>Built around clear public and administrative journeys.</h2></div><p>Every service is presented with a defined purpose, consistent controls and a professional digital experience.</p></div>
        <div className="capability-grid">
          {capabilities.map((item) => <article className="capability-card" key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href}>Explore service <span aria-hidden="true">→</span></Link></article>)}
        </div>
      </section>

      <section className="trust-section" id="about">
        <div><p className="eyebrow">DESIGNED FOR INSTITUTIONAL TRUST</p><h2>Professional workflows without unnecessary complexity.</h2></div>
        <div className="trust-points"><p><strong>Role-aware</strong><span>Administrative access follows assigned responsibilities and jurisdiction.</span></p><p><strong>Auditable</strong><span>Critical actions are recorded to support accountable operations.</span></p><p><strong>Accessible</strong><span>Public users can reach registration and verification services without navigating an administrative interface.</span></p></div>
      </section>

      <footer className="site-footer"><div><strong>EIASC CRil Platform</strong><span>Community Registration &amp; Institutional Licensing</span></div><Link className="button button-primary" href="/login">Sign in to platform</Link></footer>
    </main>
  );
}
