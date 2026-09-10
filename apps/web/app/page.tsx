import Link from 'next/link';

const actions = [
  ['Register as Member', '/register/individual'],
  ['Register Institution', '/register/institution'],
  ['Track Application', '/track'],
  ['Verify Credential', '/verify'],
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">EIASC</p>
        <h1>Community Registration Platform</h1>
        <p className="lead">A secure institutional registry for community members and Islamic institutions.</p>
        <nav className="actions" aria-label="Main actions">
          {actions.map(([label, href]) => <Link className="button" href={href} key={href}>{label}</Link>)}
        </nav>
      </header>
      <section className="grid" aria-label="Platform capabilities">
        <article><h2>Membership</h2><p>Register, review and manage verified community membership.</p></article>
        <article><h2>Institutions</h2><p>Maintain verified mosques, madrasas, Islamic centers and approved institutions.</p></article>
        <article><h2>Credentials</h2><p>Issue secure digital credentials with public QR verification.</p></article>
        <article><h2>Governance</h2><p>Apply role and jurisdiction-based administration with auditable actions.</p></article>
      </section>
    </main>
  );
}
