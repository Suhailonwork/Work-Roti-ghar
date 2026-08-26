import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({
    title: 'Reset your password',
    path: '/forgot-password',
    noIndex: true,
  });
}

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-clay-200 bg-cream-50 p-6 shadow-card sm:p-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">Reset your password</h1>
      <p className="mt-1.5 mb-6 text-sm text-clay-600">
        Enter your email address and we will send you a link to set a new password.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-clay-600">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
