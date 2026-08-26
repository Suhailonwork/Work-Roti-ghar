import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/Toaster';
import { SITE_URL } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Roti Ghar — Community Kitchen & Ration Support',
    template: '%s · Roti Ghar',
  },
  description:
    'Roti Ghar is a volunteer-run community initiative delivering monthly ration kits to families in need.',
  applicationName: 'Roti Ghar',
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#244e38',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-cream-100 font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-cream-50"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
