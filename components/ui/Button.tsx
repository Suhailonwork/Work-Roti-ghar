import Link from 'next/link';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { LinkSpinner } from './LinkSpinner';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-cream-50 shadow-xs hover:bg-brand-800 hover:shadow-card ' +
    'active:bg-brand-900 active:shadow-xs disabled:bg-brand-700/50 disabled:shadow-none',
  secondary:
    'bg-cream-50 text-brand-800 border border-clay-300 shadow-xs ' +
    'hover:bg-clay-50 hover:border-clay-400/50 active:bg-clay-100',
  outline:
    'border border-brand-700 text-brand-800 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-clay-700 hover:bg-clay-100 hover:text-clay-900 active:bg-clay-200',
  subtle: 'bg-clay-100 text-clay-800 hover:bg-clay-200 active:bg-clay-300/70',
  danger:
    'bg-red-700 text-white shadow-xs hover:bg-red-800 hover:shadow-card active:bg-red-900',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

const BASE =
  'inline-flex items-center justify-center rounded-xl font-medium whitespace-nowrap ' +
  // Shadow joins the transition so the hover lift arrives with the colour
  // rather than a frame later.
  'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * A link styled as a button.
 *
 * Navigation is work like any other, so it reports progress like any other: if
 * the route has to be fetched, a spinner appears until it lands. Prefetched
 * routes resolve immediately and show nothing, so quick links do not flicker.
 */
export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      <LinkSpinner />
      {children}
    </Link>
  );
}
