export default function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-live="polite">
      <section className="loading-panel" aria-label="Loading page">
        <div className="loading-brand">EIASC</div>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-card" />
      </section>
    </main>
  );
}
