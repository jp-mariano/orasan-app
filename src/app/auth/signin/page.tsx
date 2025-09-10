'use client';

import { Suspense, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { SiGithub, SiGoogle, SiX } from 'react-icons/si';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleOAuthSignIn = async (
    provider: 'github' | 'google' | 'twitter'
  ) => {
    try {
      setIsLoading(provider);
      await signIn(provider);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Orasan</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error === 'auth_callback_failed'
                ? 'Authentication failed. Please try again.'
                : 'An error occurred. Please try again.'}
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading !== null}
            >
              {isLoading === 'github' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <SiGithub className="h-4 w-4 mr-2" />
              )}
              Continue with GitHub
            </Button>

            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading !== null}
            >
              {isLoading === 'google' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <SiGoogle className="h-4 w-4 mr-2" />
              )}
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => handleOAuthSignIn('twitter')}
              disabled={isLoading !== null}
            >
              {isLoading === 'twitter' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <SiX className="h-4 w-4 mr-2" />
              )}
              Continue with X (Twitter)
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="text-blue-600 hover:underline"
            >
              Sign up
            </Link>
          </div>

          <div className="text-center text-sm text-gray-600">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
