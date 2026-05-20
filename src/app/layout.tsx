import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import PWAInstaller from '@/components/pwa/PWAInstaller';

export const metadata: Metadata = {
  title: 'Sporthink – Training Platform',
  description: 'Sporthink perakende zinciri için eğitim, KPI takibi ve AI destekli satış simülasyonu platformu',
  manifest: '/manifest.json',
  applicationName: 'Sporthink',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sporthink',
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#E53935',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
        <PWAInstaller />
      </body>
    </html>
  );
}
