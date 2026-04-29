'use client';

import { Suspense, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { SiGithub, SiGoogle } from 'react-icons/si';

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

function RegisterPageContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signIn, signUpWithPassword } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'auth', fallbackToInline: true });

  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
  }

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    try {
      setFormError(null);
      setSuccessMessage(null);
      setIsLoading(provider);
      await signIn(provider);
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err);
      setIsLoading(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading('email');
    try {
      const { needsEmailConfirmation } = await signUpWithPassword(
        email,
        password
      );
      if (needsEmailConfirmation) {
        setSuccessMessage(
          'Check your email for a confirmation link to finish creating your account.'
        );
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Sign up failed. Try again.'
      );
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Orasan</CardTitle>
          <CardDescription>
            Create an account with email or a provider below
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

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading !== null || !!successMessage}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading !== null || !!successMessage}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm">Confirm password</Label>
              <Input
                id="register-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={isLoading !== null || !!successMessage}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading !== null || !!successMessage}
            >
              {isLoading === 'email' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading !== null || !!successMessage}
              type="button"
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
              disabled={isLoading !== null || !!successMessage}
              type="button"
            >
              {isLoading === 'google' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <SiGoogle className="h-4 w-4 mr-2" />
              )}
              Continue with Google
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Sign in
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
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
