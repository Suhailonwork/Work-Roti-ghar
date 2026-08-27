'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from './Button';

/**
 * Submit button that shows a spinner while its form is submitting.
 *
 * `useFormStatus` only reports on forms driven by the `action` prop. Forms that
 * submit through `useFormAction` deliberately avoid that prop — it is what
 * makes React wipe the fields on a failed submission — so they pass `pending`
 * in explicitly. Either source works; the explicit one wins when given.
 */
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingProp,
  ...props
}: ButtonProps & { pendingLabel?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
