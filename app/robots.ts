import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/env';

/**
 * Everything private is disallowed explicitly. Access is enforced by
 * middleware and RLS — this just keeps crawlers from wasting their time.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/dashboard',
          '/feed',
          '/members',
          '/ration',
          '/finance',
          '/reminders',
          '/profile',
          '/notifications',
          '/pending',
          '/api/',
          '/preview',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
