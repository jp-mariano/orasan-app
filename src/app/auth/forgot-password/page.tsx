'use client';

import { Suspense, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useErrorDisplay } from '@/hooks/useErrorDisplay';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { resetPasswordForEmail } = useAuth();

  const error = searchParams.get('error');

  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'auth', fallbackToInline: true });

  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not send reset email. Try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>
            We&apos;ll email you a link to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inlineErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {inlineErrorMessage}
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}

          {sent ? (
            <p className="text-sm text-gray-600">
              If an account exists for that email, you will receive reset
              instructions shortly.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          )}

          <div className="text-center text-sm text-gray-600">
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              ← Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
