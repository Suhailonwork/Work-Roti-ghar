'use client';

import { startTransition, useActionState, useCallback, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import type { FormState } from '@/lib/validation';

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

const INITIAL_STATE: FormState = { ok: false };

/**
 * Runs a server action from a form WITHOUT losing what the user typed.
 *
 * React 19 resets an uncontrolled form automatically once the function passed
 * to `<form action={…}>` resolves — and it does that whether the action
 * succeeded or failed. On a rejected submission that wipes every field the
 * person just filled in and leaves them staring at an error message with an
 * empty form. Worse for files: a file input cannot be repopulated
 * programmatically, so a re-picked attachment is simply gone.
 *
 * There is no prop to switch that reset off; the only way out is to stop using
 * the `action` prop. So this hook submits through `onSubmit` instead, snapshots
 * the fields into `FormData` by hand, and dispatches inside a transition. React
 * never requests a reset, so text, selects, dates, checkboxes and chosen files
 * all survive a failed round trip untouched.
 *
 * The form is then reset deliberately, on success only — which is the one time
 * clearing it is what the user expects.
 *
 * Usage:
 *
 *     const { state, pending, formProps } = useFormAction(saveThingAction);
 *     <form {...formProps}>…<SubmitButton pending={pending} /></form>
 */
export function useFormAction(
  action: FormAction,
  options: {
    /** Clear the fields after a successful submission. Default true. */
    resetOnSuccess?: boolean;
    /** Runs after a successful submission — close a dialog, clear local state. */
    onSuccess?: (state: FormState) => void;
    initialState?: FormState;
  } = {},
) {
  const { resetOnSuccess = true, onSuccess, initialState = INITIAL_STATE } = options;

  const [state, dispatch, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Passing the submitter matters: a form can carry more than one submit
      // button (approve / reject), and the clicked button's name and value are
      // only included in the payload when it is named here. The `action` prop
      // did this for us; doing it by hand means doing this too.
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;

      // Read the fields before dispatching; the DOM is left exactly as it is.
      const formData = new FormData(event.currentTarget, submitter);

      // The two-argument constructor is recent. Where it is ignored the
      // submitter's own field would go missing, so put it back by hand.
      if (submitter instanceof HTMLButtonElement && submitter.name && !formData.has(submitter.name)) {
        formData.append(submitter.name, submitter.value);
      }
      // Dispatching outside a form action has to be wrapped explicitly, or
      // React cannot track the action and `pending` never flips.
      startTransition(() => dispatch(formData));
    },
    [dispatch],
  );

  // Keep the newest callback without making the effect below depend on a
  // function identity the caller would have to memoise.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  // `useActionState` hands back a fresh object for every run, so comparing
  // identity is a dependable "this is a new result" signal — and it stops a
  // re-render for any other reason from clearing the form a second time.
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;

    if (!state.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    onSuccessRef.current?.(state);
  }, [state, resetOnSuccess]);

  return {
    state,
    pending,
    formRef,
    onSubmit,
    /** Spread onto the <form>: `<form {...formProps}>`. */
    formProps: { ref: formRef, onSubmit },
  };
}
