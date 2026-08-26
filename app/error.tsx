'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled application error', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-semibold text-brand-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-clay-600">
        The page could not be loaded. Trying again usually helps — if it does not, the problem is on our side.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-clay-400">Reference: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
