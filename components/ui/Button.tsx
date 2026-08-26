import Link from 'next/link';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-cream-50 hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-700/50 shadow-sm',
  secondary:
    'bg-cream-50 text-brand-800 border border-clay-200 hover:bg-cream-200 hover:border-clay-300 shadow-sm',
  outline:
    'border border-brand-700 text-brand-800 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-clay-700 hover:bg-clay-100 hover:text-clay-900',
  subtle: 'bg-clay-100 text-clay-800 hover:bg-clay-200',
  danger: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

const BASE =
  'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap';

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

export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
