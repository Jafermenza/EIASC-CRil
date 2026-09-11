import Link from 'next/link';

export default function NotFound() {
  return <main className="error-page"><section className="error-panel" role="status"><div className="error-icon" aria-hidden="true">?</div><p className="eyebrow">EIASC · PAGE NOT FOUND</p><h1>This page is not available</h1><p className="lead">The address may be incorrect, the workflow may have moved, or the record may no longer be available to your account.</p><div className="action-row"><Link className="button button-primary" href="/">Return home</Link><Link className="button button-secondary" href="/track">Track an application</Link><Link className="button button-secondary" href="/verify">Verify a credential</Link></div></section></main>;
}
