import { PendingLink as Link } from '@/components/ui/PendingLink';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream-100">
      <header className="border-b border-clay-200/70">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 font-serif text-base font-semibold text-cream-50"
              aria-hidden
            >
              R
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight text-brand-900">Roti Ghar</span>
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-clay-200/70 py-5">
        <p className="container-page text-center text-xs text-clay-500">
          Run by volunteers. We do not take donations from the public.
        </p>
      </footer>
    </div>
  );
}
