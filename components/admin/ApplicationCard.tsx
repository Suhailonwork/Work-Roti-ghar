'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Mail, MapPin, Phone, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { reviewApplicationAction } from '@/lib/actions/members';
import { Avatar, Badge, Card, CardBody, FormField, Select, Textarea } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { formatDate } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export interface ApplicationView {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  address: string | null;
  reference: string | null;
  referred_by_name: string | null;
  reason: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * One pending application with its decision form.
 *
 * The contact details shown here come from the application record, which only
 * administrators can read — see the RLS policy on `member_applications`.
 */
export function ApplicationCard({ application }: { application: ApplicationView }) {
  const router = useRouter();
  // Review notes are kept if the decision is rejected by the server, so the
  // administrator does not have to retype them.
  const { state, pending, formProps } = useFormAction(reviewApplicationAction, {
    resetOnSuccess: false,
    initialState,
    onSuccess: (result) => {
      toast.success(result.message ?? 'Done');
      router.refresh();
    },
  });

  useEffect(() => {
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3.5">
          <Avatar src={application.avatar_url} name={application.full_name} size={52} />

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-clay-900">{application.full_name}</h3>
            <p className="text-xs text-clay-500">Applied {formatDate(application.created_at)}</p>
          </div>

          <Badge tone="amber">Pending</Badge>
        </div>

        <dl className="grid gap-2.5 rounded-xl border border-clay-200 bg-cream-100 px-4 py-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-clay-400" aria-hidden />
            <div className="min-w-0">
              <dt className="sr-only">Email</dt>
              <dd className="truncate text-clay-800">{application.email}</dd>
            </div>
          </div>

          {application.mobile && (
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-clay-400" aria-hidden />
              <div>
                <dt className="sr-only">Mobile</dt>
                <dd className="text-clay-800">{application.mobile}</dd>
              </div>
            </div>
          )}

          {application.address && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-clay-400" aria-hidden />
              <div>
                <dt className="sr-only">Address</dt>
                <dd className="text-clay-800">{application.address}</dd>
              </div>
            </div>
          )}

          {(application.reference || application.referred_by_name) && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-clay-400" aria-hidden />
              <div>
                <dt className="sr-only">Reference</dt>
                <dd className="text-clay-800">
                  {application.reference}
                  {application.referred_by_name && (
                    <span className="text-clay-600"> · referred by {application.referred_by_name}</span>
                  )}
                </dd>
              </div>
            </div>
          )}
        </dl>

        {application.reason && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clay-500">Why they want to join</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-clay-700">{application.reason}</p>
          </div>
        )}

        <form {...formProps} className="space-y-3 border-t border-clay-200 pt-4">
          <input type="hidden" name="application_id" value={application.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Approve as" htmlFor={`role-${application.id}`} errors={state.errors?.role}>
              <Select id={`role-${application.id}`} name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="volunteer">Volunteer</option>
                <option value="admin">Administrator</option>
              </Select>
            </FormField>

            <FormField
              label="Note"
              htmlFor={`notes-${application.id}`}
              help="Shown to the applicant if you reject."
              errors={state.errors?.review_notes}
            >
              <Textarea id={`notes-${application.id}`} name="review_notes" rows={1} maxLength={1000} />
            </FormField>
          </div>

          {/* The decision travels as the submit button's own name/value, so it is
              part of the same submission rather than a separate state update. */}
          <div className="flex flex-wrap gap-2">
            <SubmitButton pending={pending} size="sm" name="decision" value="approved" pendingLabel="Saving…">
              <Check className="h-4 w-4" aria-hidden />
              Approve
            </SubmitButton>

            <SubmitButton
              pending={pending}
              variant="secondary"
              size="sm"
              name="decision"
              value="rejected"
              className="text-red-700"
              pendingLabel="Saving…"
            >
              <X className="h-4 w-4" aria-hidden />
              Reject
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
