import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FormState } from '@/lib/validation';

/** Renders the top-level result of a form submission. */
export function FormMessage({ state }: { state: FormState }) {
  const formErrors = state.errors?._form;
  const message = state.message ?? formErrors?.[0];

  if (!message) return null;

  if (state.ok) {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
