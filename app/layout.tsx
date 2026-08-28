import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/Toaster';
import { SITE_URL } from '@/lib/env';
import { BRAND_KEYWORDS, SITE_LOCALE } from '@/lib/seo';
import './globals.css';

const DEFAULT_TITLE = 'Workrotighar — Roti Ghar Community Kitchen & Ration Support';
const DEFAULT_DESCRIPTION =
  'Workrotighar is the official website of Roti Ghar — a volunteer-run community kitchen delivering monthly ration kits to families in need. Join the work as a volunteer or member.';

/**
 * Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the token from Search Console
 * ("HTML tag" method) and the meta tag is emitted on every page.
 */
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

/**
 * Site-wide defaults. Public pages override these from the CMS via
 * `buildPageMetadata`; anything that does not (auth screens, the member area)
 * inherits the brand title template "%s · Workrotighar".
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s · Workrotighar',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [...BRAND_KEYWORDS],
  applicationName: 'Workrotighar',
  authors: [{ name: 'Roti Ghar', url: SITE_URL }],
  creator: 'Roti Ghar',
  publisher: 'Roti Ghar',
  category: 'Nonprofit',
  formatDetection: { telephone: false },
  alternates: { canonical: '/' },
  verification: googleVerification ? { google: googleVerification } : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Roti Ghar',
    locale: SITE_LOCALE,
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: '/og-image',
        secureUrl: `${SITE_URL}/og-image`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Workrotighar — Roti Ghar community kitchen and ration support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [`${SITE_URL}/og-image`],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#214e37',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
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
