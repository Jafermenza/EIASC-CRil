'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => { registration.update(); return registration; }).catch((error) => {
      console.error('EIASC CRil service worker registration failed', error);
    });
  }, []);
  return null;
}
