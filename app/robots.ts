import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/env';

/**
 * The `Host` directive wants a bare hostname — no scheme, no trailing slash.
 * It is a Yandex-only extension that Google has never read and Yandex itself
 * has deprecated, so it earns nothing either way; emitting it malformed just
 * makes the file look careless to anything that does parse it.
 */
const HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return undefined;
  }
})();

/**
 * Everything private is disallowed explicitly. Access is enforced by
 * middleware and RLS — this just keeps crawlers from wasting their time.
 *
 * `/login` and `/signup` are deliberately absent from the disallow list: both
 * carry brand metadata aimed at "workrotighar login" style queries and are
 * listed in the sitemap. The password-reset routes below are a different
 * matter — a reset link carries a single-use token in the URL, and none of
 * those pages mean anything to somebody arriving from a search result.
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
          '/auth/',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    // Absolute URL, as the sitemap protocol requires.
    sitemap: absoluteUrl('/sitemap.xml'),
    host: HOST,
  };
}
