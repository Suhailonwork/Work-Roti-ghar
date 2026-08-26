import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { buildStaticMetadata } from '@/lib/seo';
import { safeRedirect } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({
    title: 'Sign in',
    description: 'Sign in to the Roti Ghar members area.',
    path: '/login',
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? safeRedirect(params.next) : undefined;

  return (
    <div className="rounded-2xl border border-clay-200 bg-cream-50 p-6 shadow-card sm:p-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">Welcome back</h1>
      <p className="mt-1.5 mb-6 text-sm text-clay-600">Sign in to reach the members area.</p>

      <Suspense fallback={null}>
        <LoginForm next={next} registered={params.registered === '1'} />
      </Suspense>

      <p className="mt-6 text-center text-sm text-clay-600">
        Not a member yet?{' '}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Apply to join
        </Link>
      </p>
    </div>
  );
}
