import type { Metadata } from 'next';
import './globals.css';
import PublicChrome from '../components/layout/public-chrome';
import { ThemeProvider } from '../components/ui/theme-provider';
import { ToastProvider } from '../components/ui/toast-provider';
import { I18nProvider } from '../lib/i18n';
import ServiceWorkerRegister from '../components/pwa/service-worker-register';

export const metadata: Metadata = {
  title: 'EIASC Community Registration & Institutional Licensing',
  description: 'Simple digital services for community registration, Islamic institutions, membership and trusted credential verification.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><ServiceWorkerRegister /><I18nProvider><ThemeProvider><ToastProvider><PublicChrome>{children}</PublicChrome></ToastProvider></ThemeProvider></I18nProvider></body>
    </html>
  );
}
