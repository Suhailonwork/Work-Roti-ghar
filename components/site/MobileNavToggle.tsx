'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function MobileNavToggle({
  links,
  signedIn,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="rounded-lg p-2 text-clay-700 hover:bg-clay-100"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-16 z-40 border-b border-clay-200 bg-cream-50 shadow-lift"
        >
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-clay-800 hover:bg-clay-100"
              >
                {item.label}
              </Link>
            ))}
            {!signedIn && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-brand-800 hover:bg-clay-100"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
