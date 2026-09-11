import type { Metadata } from 'next';
import './globals.css';
import PublicChrome from '../components/layout/public-chrome';
import { ThemeProvider } from '../components/ui/theme-provider';

export const metadata: Metadata = {
  title: 'EIASC Community Registration & Institutional Licensing',
  description: 'Trusted digital services for community registration, institutional oversight and credential verification.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><ThemeProvider><PublicChrome>{children}</PublicChrome></ThemeProvider></body>
    </html>
  );
}
