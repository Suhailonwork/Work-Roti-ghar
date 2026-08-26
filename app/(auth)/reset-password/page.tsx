import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Set a new password', path: '/reset-password', noIndex: true });
}

export default function ResetPasswordPage() {
  return (
    <div className="rounded-2xl border border-clay-200 bg-cream-50 p-6 shadow-card sm:p-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">Set a new password</h1>
      <p className="mt-1.5 mb-6 text-sm text-clay-600">Choose a password you have not used elsewhere.</p>
      <ResetPasswordForm />
    </div>
  );
}
