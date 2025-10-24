'use client';

import { Suspense } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Shield, Users, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useErrorDisplay } from '@/hooks/useErrorDisplay';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // Handle errors with the new error display hook
  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'auth', fallbackToInline: true });

  // Show ErrorDisplay for critical auth errors
  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Orasan</CardTitle>
          <CardDescription>
            Start tracking your time and boosting productivity
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Non-Critical Error Message */}
          {inlineErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {inlineErrorMessage}
            </div>
          )}

          {/* How it works section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center text-gray-800">
              How OAuth Registration Works
            </h3>

            <div className="grid gap-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-xs">1</span>
                </div>
                <p>Click any OAuth provider button (GitHub, Google, or X)</p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-xs">2</span>
                </div>
                <p>Authorize Orasan to access your basic profile information</p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-xs">3</span>
                </div>
                <p>
                  Your account is automatically created and you&apos;re signed
                  in!
                </p>
              </div>
            </div>
          </div>

          {/* Benefits section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-center text-gray-800">
              Why OAuth is Better
            </h3>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center space-x-3">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">
                  No passwords to remember or manage
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">
                  Instant sign-in with one click
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">
                  Secure authentication through trusted providers
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <div>
              <Link href="/auth/signin">
                <Button className="w-full">Continue to Sign In</Button>
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/auth/signin"
                className="text-blue-600 hover:underline"
              >
                Sign in here
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              <Link href="/" className="text-blue-600 hover:underline">
                ← Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
