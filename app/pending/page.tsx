import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { redirect } from 'next/navigation';
import { Ban, Clock, PauseCircle, XCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { formatDate } from '@/lib/utils';
import { buildStaticMetadata } from '@/lib/seo';
import type { UserStatus } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Your application', path: '/pending', noIndex: true });
}

const STATES: Record<
  Exclude<UserStatus, 'active'>,
  { icon: typeof Clock; tone: string; title: string; body: string }
> = {
  pending: {
    icon: Clock,
    tone: 'bg-amber-50 text-amber-700 ring-amber-200',
    title: 'Your application is with an administrator',
    body: 'Someone from the team will review it shortly. You will get an email as soon as a decision is made — there is nothing else you need to do.',
  },
  rejected: {
    icon: XCircle,
    tone: 'bg-red-50 text-red-700 ring-red-200',
    title: 'Your application was not approved',
    body: 'If you think this was a mistake, or your circumstances have changed, get in touch and we will take another look.',
  },
  suspended: {
    icon: Ban,
    tone: 'bg-red-50 text-red-700 ring-red-200',
    title: 'Your account is suspended',
    body: 'Access to the members area has been paused. Contact an administrator to find out more.',
  },
  inactive: {
    icon: PauseCircle,
    tone: 'bg-clay-100 text-clay-700 ring-clay-200',
    title: 'Your account is inactive',
    body: 'Your membership is dormant. An administrator can reactivate it whenever you are ready to come back.',
  },
};

export default async function PendingPage() {
  const user = await requireUser();

  if (user.profile.status === 'active') redirect('/dashboard');

  const state = STATES[user.profile.status as Exclude<UserStatus, 'active'>] ?? STATES.pending;
  const Icon = state.icon;

  const supabase = await createClient();
  const { data: application } = await supabase
    .from('member_applications')
    .select('status, created_at, reviewed_at, review_notes')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100">
      <header className="border-b border-clay-200/70">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 font-serif text-base font-semibold text-cream-50"
              aria-hidden
            >
              R
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight text-brand-900">Roti Ghar</span>
          </Link>
          <div className="w-28">
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-clay-200 bg-cream-50 p-6 shadow-card sm:p-8">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ${state.tone}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>

          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-brand-900">{state.title}</h1>
          <p className="mt-3 leading-relaxed text-clay-600">{state.body}</p>

          <dl className="mt-6 space-y-3 rounded-xl border border-clay-200 bg-cream-100 px-4 py-3.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-clay-600">Name</dt>
              <dd className="font-medium text-clay-900">{user.profile.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-clay-600">Email</dt>
              <dd className="font-medium text-clay-900">{user.email}</dd>
            </div>
            {application?.created_at && (
              <div className="flex justify-between gap-4">
                <dt className="text-clay-600">Applied</dt>
                <dd className="font-medium text-clay-900">{formatDate(application.created_at)}</dd>
              </div>
            )}
            {application?.reviewed_at && (
              <div className="flex justify-between gap-4">
                <dt className="text-clay-600">Reviewed</dt>
                <dd className="font-medium text-clay-900">{formatDate(application.reviewed_at)}</dd>
              </div>
            )}
          </dl>

          {application?.review_notes && (
            <div className="mt-4 rounded-xl border border-clay-200 bg-cream-100 px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-clay-500">Note from the reviewer</p>
              <p className="mt-1.5 text-sm leading-relaxed text-clay-700">{application.review_notes}</p>
            </div>
          )}

          <p className="mt-6 text-sm text-clay-600">
            In the meantime you are welcome to read{' '}
            <Link href="/" className="font-medium text-brand-700 hover:underline">
              our public pages
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
