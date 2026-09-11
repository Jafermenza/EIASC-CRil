'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="error-page">
      <section className="error-panel" role="alert">
        <div className="error-icon" aria-hidden="true">!</div>
        <p className="eyebrow">EIASC · SERVICE ERROR</p>
        <h1>We could not complete this page</h1>
        <p className="lead">The page failed while loading or processing its data. Your account and saved information have not been intentionally changed.</p>
        <div className="error-reason"><strong>Reason</strong><span>{error.message || 'The service returned an unexpected error.'}</span></div>
        <div className="action-row"><button className="button button-primary" onClick={() => reset()}>Try again</button><a className="button button-secondary" href="/">Return home</a></div>
        {error.digest && <small className="technical-detail">Reference: {error.digest}</small>}
      </section>
    </main>
  );
}
