import { PendingLink as Link } from '@/components/ui/PendingLink';
import { getCurrentUser } from '@/lib/auth';
import { ButtonLink } from '@/components/ui/Button';
import { Avatar } from '@/components/ui';
import { MobileNavToggle } from './MobileNavToggle';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Support' },
  { href: '/contact', label: 'Contact' },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-serif text-lg font-semibold tracking-tight text-brand-900">Roti Ghar</span>
    </span>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const approved = user?.profile.status === 'active';

  return (
    <header className="sticky top-0 z-40 border-b border-clay-200/80 bg-cream-100/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Roti Ghar home">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 font-serif text-base font-semibold text-cream-50"
            aria-hidden
          >
            R
          </span>
          <Wordmark className="hidden sm:block" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-clay-700 transition-colors hover:bg-clay-100 hover:text-clay-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink
              href={approved ? '/dashboard' : '/pending'}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Avatar src={user.profile.avatar_url} name={user.profile.full_name} size={22} />
              <span className="hidden sm:inline">{approved ? 'Dashboard' : 'Application'}</span>
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Join us
              </ButtonLink>
            </>
          )}
          <MobileNavToggle links={NAV_LINKS} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
