export default function OfflinePage() {
  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
      <section>
        <h1>You're offline</h1>
        <p style={{ marginTop: '0.75rem' }}>EIASC CRil is available when your connection returns. Previously visited pages may still be available.</p>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: '1.25rem' }}>Try again</button>
      </section>
    </main>
  );
}
