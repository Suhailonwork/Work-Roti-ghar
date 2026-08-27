import { PendingLink as Link } from '@/components/ui/PendingLink';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

export { Button, ButtonLink } from './Button';

// -------------------------------------------------------------------- Card --
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-clay-200/80 bg-cream-50 shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-clay-200/70 px-5 py-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold tracking-heading text-clay-900', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm text-clay-600', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 border-t border-clay-200/70 px-5 py-3', className)} {...props} />
  );
}

// ------------------------------------------------------------------- Badge --
export type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

// Every pairing here is a dark 800-weight label on its own 50-weight tint,
// which keeps each tone well clear of AA while staying quiet enough to sit
// inside a table row without shouting.
const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-clay-100 text-clay-700 ring-clay-300/60',
  green: 'bg-brand-50 text-brand-800 ring-brand-200/70',
  amber: 'bg-amber-50 text-amber-900 ring-amber-300/60',
  red: 'bg-red-50 text-red-800 ring-red-200/80',
  blue: 'bg-sky-50 text-sky-900 ring-sky-200/80',
  purple: 'bg-violet-50 text-violet-900 ring-violet-200/80',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-label ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

// ------------------------------------------------------------------ Avatar --
export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };

  if (src) {
    // Avatars come from arbitrary storage URLs and are rendered at small fixed
    // sizes, so a plain <img> avoids needless optimisation round trips.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile picture` : 'Profile picture'}
        style={dimension}
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-clay-200', className)}
        loading="lazy"
      />
    );
  }

  return (
    <span
      style={dimension}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 ring-1 ring-brand-200',
        className,
      )}
      aria-hidden
    >
      <span style={{ fontSize: Math.max(11, size * 0.38) }}>{initials(name)}</span>
    </span>
  );
}

// ------------------------------------------------------------------ Inputs --
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-clay-300 bg-white px-3.5 text-sm text-clay-900 shadow-xs',
          'placeholder:text-clay-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
          'disabled:cursor-not-allowed disabled:bg-clay-50 disabled:text-clay-500',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-xl border border-clay-300 bg-white px-3.5 py-2.5 text-sm text-clay-900 shadow-xs',
          'placeholder:text-clay-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
          'disabled:cursor-not-allowed disabled:bg-clay-50',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-xl border border-clay-300 bg-white bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-clay-900 shadow-xs',
          'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234a4038' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      />
    );
  },
);

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-clay-800', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 text-sm text-red-700" role="alert">
      {messages[0]}
    </p>
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  help,
  errors,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  errors?: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {help && !errors?.length && <p className="mt-1.5 text-xs text-clay-500">{help}</p>}
      <FieldError messages={errors} />
    </div>
  );
}

// ------------------------------------------------------------ Empty states --
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-clay-300 bg-cream-50/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-clay-100 text-clay-500">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-clay-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-clay-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
      <h3 className="text-sm font-semibold text-red-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-red-800">{description}</p>}
    </div>
  );
}

// -------------------------------------------------------------- Skeletons --
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- Misc --
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-clay-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-clay-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: BadgeTone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-clay-600">{label}</p>
        {icon && (
          <span className={cn('rounded-lg p-1.5', BADGE_TONES[tone])} aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-heading text-clay-900 [font-variant-numeric:tabular-nums]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-clay-500">{hint}</p>}
    </>
  );

  // Only the linked variant lifts on hover — a plain figure that animates
  // under the cursor reads as clickable when it is not.
  const className = cn(
    'block rounded-2xl border border-clay-200/80 bg-cream-50 px-5 py-4 shadow-card',
    href && 'transition-shadow duration-200 hover:shadow-lift',
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-t border-clay-200', className)} />;
}
