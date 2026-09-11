import Link from 'next/link';

const choices = [
  { title: 'Individual', text: 'Register as an EIASC member and continue through the individual registration pathway.', href: '/register/individual', icon: '01' },
  { title: 'Institution', text: 'Register a mosque, madrasa, Islamic center or other approved Islamic institution.', href: '/register/institution', icon: '02' },
];

export default function RegisterPage() {
  return (
    <main className="shell" style={{ maxWidth: 980 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · REGISTRATION</p>
        <h1>What would you like to register?</h1>
        <p className="lead">Choose the pathway that matches your application. You will be guided through the required information before submission.</p>
      </div>
      <section className="capability-grid registration-choice-grid" aria-label="Registration types">
        {choices.map((choice) => <Link className="capability-card registration-choice" href={choice.href} key={choice.href}><span>{choice.icon}</span><h2>{choice.title}</h2><p>{choice.text}</p><strong>Continue <span aria-hidden="true">→</span></strong></Link>)}
      </section>
      <section className="workflow-panel" style={{ marginTop: 20 }}>
        <p className="eyebrow">GUIDED PROCESS</p>
        <h2>Simple, step-by-step registration</h2>
        <p className="lead">Type → Location → Details → Documents → Review → Submit</p>
        <p className="helper-copy">Keep your contact details and supporting documents ready. If a correction is requested, use your tracking code to return to the application workflow.</p>
        <div className="action-row"><Link className="button button-secondary" href="/track">Track an existing application</Link><Link className="button button-secondary" href="/verify">Verify a credential</Link></div>
      </section>
    </main>
  );
}
