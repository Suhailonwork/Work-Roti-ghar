import { cn } from '@/lib/utils';

/**
 * Table primitives for the admin lists. The wrapper scrolls on its own so a
 * wide table never makes the whole page scroll sideways on a phone.
 */
export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-clay-200 bg-cream-50 shadow-card', className)}>
      <table className="w-full min-w-[42rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-clay-200 bg-cream-100/70 text-left">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-clay-600',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-clay-200">{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-cream-100/60', className)}>{children}</tr>;
}

export function TD({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-clay-800',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-clay-500">
        {message}
      </td>
    </tr>
  );
}
