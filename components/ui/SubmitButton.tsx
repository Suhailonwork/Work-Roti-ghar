'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from './Button';

/** Submit button that shows a spinner while its parent form action is running. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
