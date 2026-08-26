'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-clay-200 bg-cream-50 text-clay-900 shadow-lift',
          description: 'text-clay-600',
        },
      }}
    />
  );
}
