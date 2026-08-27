import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { SignupForm } from '@/components/auth/SignupForm';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({
    title: 'Apply to join',
    description:
      'Apply to become a Roti Ghar member or volunteer. Applications are reviewed by an administrator.',
    path: '/signup',
  });
}

export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-clay-200 bg-cream-50 p-6 shadow-card sm:p-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">Apply to join</h1>
      <p className="mt-1.5 mb-6 text-sm text-clay-600">
        Tell us a little about yourself and an administrator will review your application.
      </p>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-clay-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
