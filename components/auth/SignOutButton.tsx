'use client';

import { LogOut } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { cn } from '@/lib/utils';

export function SignOutButton({ className, label = 'Sign out' }: { className?: string; label?: string }) {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="ghost" size="sm" className={cn('w-full justify-start', className)} pendingLabel="Signing out…">
        <LogOut className="h-4 w-4" aria-hidden />
        {label}
      </SubmitButton>
    </form>
  );
}
