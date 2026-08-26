import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getOrgSettings, getSupportSettings } from '@/lib/cms/queries';

const COLUMNS = [
  {
    title: 'Roti Ghar',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About us' },
      { href: '/support', label: 'Support our work' },
    ],
  },
  {
    title: 'Members',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Apply to join' },
      { href: '/feed', label: 'Community feed' },
    ],
  },
];

export async function SiteFooter() {
  const [org, support] = await Promise.all([getOrgSettings(), getSupportSettings()]);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-clay-200 bg-brand-950 text-cream-200">
      <div className="container-page py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-100 font-serif text-base font-semibold text-brand-900"
                aria-hidden
              >
                R
              </span>
              <span className="font-serif text-lg font-semibold text-cream-50">{org.name}</span>
            </div>
            {org.tagline && <p className="mt-3 text-sm text-cream-200/80">{org.tagline}</p>}

            <p className="mt-5 max-w-sm rounded-xl border border-brand-800 bg-brand-900/60 px-4 py-3 text-sm leading-relaxed text-cream-200/90">
              {support.policy_statement}
            </p>

            <ul className="mt-5 space-y-2 text-sm text-cream-200/80">
              {org.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                  <a href={`mailto:${org.email}`} className="hover:text-cream-50">
                    {org.email}
                  </a>
                </li>
              )}
              {org.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                  <a href={`tel:${org.phone}`} className="hover:text-cream-50">
                    {org.phone}
                  </a>
                </li>
              )}
              {org.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                  <span>{org.address}</span>
                </li>
              )}
            </ul>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-50">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-cream-200/80 transition-colors hover:text-cream-50">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-brand-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-cream-200/60">
            © {year} {org.name}. Run by volunteers.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-cream-200/60">
            <Link href="/sitemap.xml" className="hover:text-cream-50">
              Sitemap
            </Link>
            <Link href="/support" className="hover:text-cream-50">
              Offer support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
